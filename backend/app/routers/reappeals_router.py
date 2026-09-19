from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Case, ReAppealRequest, ReAppealAction, AuditLog, Officer
from ..schemas import ReAppealCreate, ReAppealOut, ReAppealActionCreate
from ..auth import get_current_officer

router = APIRouter(prefix="/reappeals", tags=["reappeals"])


@router.post("/submit", response_model=ReAppealOut)
def submit_reappeal(data: ReAppealCreate, db: Session = Depends(get_db)):
    """Passenger endpoint to request a re-appeal for a flagged screening case."""
    case = db.query(Case).filter(Case.id == data.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Screening Case not found")

    existing = db.query(ReAppealRequest).filter(ReAppealRequest.case_id == data.case_id).first()
    if existing and existing.status not in ["Resolved", "Rejected"]:
        raise HTTPException(status_code=400, detail="A re-appeal request for this case is already pending review.")

    reappeal = ReAppealRequest(
        case_id=data.case_id,
        passenger_name=data.passenger_name.strip(),
        passenger_email=data.passenger_email.strip() if data.passenger_email else None,
        reason=data.reason.strip(),
        additional_explanation=data.additional_explanation.strip() if data.additional_explanation else None,
        contact_preference=data.contact_preference or "email",
        status="Submitted",
        priority="Normal"
    )
    db.add(reappeal)
    case.reappeal_status = "SUBMITTED"
    db.commit()
    db.refresh(reappeal)

    action = ReAppealAction(
        reappeal_id=reappeal.id,
        actor=data.passenger_name.strip(),
        role="PASSENGER",
        action_type="SUBMITTED",
        note=f"Re-appeal submitted. Reason: {data.reason}"
    )
    db.add(action)
    db.add(AuditLog(case_id=case.id, actor=data.passenger_name.strip(), role="PASSENGER", action="REAPPEAL_SUBMITTED", detail=data.reason))
    db.commit()
    db.refresh(reappeal)

    return reappeal


@router.post("/cases/{case_id}/passenger-request", response_model=ReAppealOut)
def submit_passenger_request_alias(case_id: str, data: ReAppealCreate, db: Session = Depends(get_db)):
    """Alias for POST /cases/{case_id}/passenger-request."""
    data.case_id = case_id
    return submit_reappeal(data, db)


@router.get("/cases/{case_id}/passenger-requests", response_model=List[ReAppealOut])
def list_passenger_requests_for_case(case_id: str, db: Session = Depends(get_db)):
    """List passenger requests for a specific case ID."""
    return db.query(ReAppealRequest).filter(ReAppealRequest.case_id == case_id).order_by(ReAppealRequest.created_at.desc()).all()


@router.get("/passenger/requests", response_model=List[ReAppealOut])
def list_passenger_requests_all(db: Session = Depends(get_db)):
    """List all passenger requests."""
    return db.query(ReAppealRequest).order_by(ReAppealRequest.created_at.desc()).all()


@router.get("/case/{case_id}", response_model=ReAppealOut)
def get_reappeal_for_case(case_id: str, db: Session = Depends(get_db)):
    """Passenger or officer status lookup for a case re-appeal."""
    reappeal = db.query(ReAppealRequest).filter(ReAppealRequest.case_id == case_id).order_by(ReAppealRequest.created_at.desc()).first()
    if not reappeal:
        raise HTTPException(status_code=404, detail="No re-appeal request found for this case.")
    return reappeal


@router.get("/", response_model=List[ReAppealOut])
def list_reappeals(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    officer: Officer = Depends(get_current_officer)
):
    """Officer dashboard list of passenger re-appeals."""
    query = db.query(ReAppealRequest).order_by(ReAppealRequest.created_at.desc())
    if status_filter:
        query = query.filter(ReAppealRequest.status == status_filter)
    return query.all()


@router.post("/{reappeal_id}/action", response_model=ReAppealOut)
def process_reappeal_action(
    reappeal_id: str,
    data: ReAppealActionCreate,
    db: Session = Depends(get_db),
    officer: Officer = Depends(get_current_officer)
):
    """Officer review action: REVIEW, REQUEST_INFO, ACCEPT, REJECT, ESCALATE, NOTE."""
    reappeal = db.query(ReAppealRequest).filter(ReAppealRequest.id == reappeal_id).first()
    if not reappeal:
        raise HTTPException(status_code=404, detail="Re-appeal request not found")

    case = db.query(Case).filter(Case.id == reappeal.case_id).first()

    act_type = data.action_type.upper()
    if act_type == "ACCEPT":
        reappeal.status = "Accepted"
        if case:
            case.final_status = "cleared"
            case.reappeal_status = "ACCEPTED"
    elif act_type == "REJECT":
        reappeal.status = "Rejected"
        if case:
            case.final_status = "rejected"
            case.reappeal_status = "REJECTED"
    elif act_type == "REQUEST_INFO":
        reappeal.status = "Need More Information"
        if case:
            case.reappeal_status = "NEED_INFO"
    elif act_type == "ESCALATE":
        reappeal.status = "Escalated"
        reappeal.priority = "Urgent"
        if case:
            case.reappeal_status = "ESCALATED"
    elif act_type == "REVIEW":
        reappeal.status = "Under Review"
        if case:
            case.reappeal_status = "UNDER_REVIEW"
    elif act_type == "NOTE":
        pass
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action type: {act_type}")

    reappeal.assigned_officer_id = officer.id

    action = ReAppealAction(
        reappeal_id=reappeal.id,
        actor=officer.username,
        role=officer.role,
        action_type=act_type,
        note=data.note or f"Officer performed {act_type}"
    )
    db.add(action)

    if case:
        db.add(AuditLog(case_id=case.id, actor=officer.username, role=officer.role, action=f"REAPPEAL_{act_type}", detail=data.note or ""))

    db.commit()
    db.refresh(reappeal)
    return reappeal
