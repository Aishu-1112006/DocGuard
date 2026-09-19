from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import HistoricalScreeningRecord, Officer
from ..schemas import HistoricalRecordOut
from ..auth import get_current_officer
from ..services.historical_service import search_historical_intelligence

router = APIRouter(prefix="/historical", tags=["historical"])


@router.get("/search", response_model=List[HistoricalRecordOut])
def search_records(
    q: Optional[str] = Query(None, description="Query string for doc number, name, or country"),
    doc_type: Optional[str] = None,
    risk: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
):
    """Search 5,000 reference records in border intelligence database."""
    query = db.query(HistoricalScreeningRecord)
    if q:
        q_term = f"%{q.strip()}%"
        query = query.filter(
            (HistoricalScreeningRecord.document_number.ilike(q_term)) |
            (HistoricalScreeningRecord.full_name.ilike(q_term)) |
            (HistoricalScreeningRecord.country.ilike(q_term))
        )
    if doc_type:
        query = query.filter(HistoricalScreeningRecord.document_type.ilike(doc_type))
    if risk:
        query = query.filter(HistoricalScreeningRecord.risk_level.ilike(risk))

    return query.limit(min(limit, 200)).all()


@router.get("/analytics")
def get_historical_analytics(
    db: Session = Depends(get_db),
    officer: Officer = Depends(get_current_officer),
):
    """Returns aggregated metrics for the 5,000 reference dataset for operational intelligence."""
    total_records = db.query(HistoricalScreeningRecord).count()
    risk_counts = db.query(
        HistoricalScreeningRecord.risk_level, func.count(HistoricalScreeningRecord.id)
    ).group_by(HistoricalScreeningRecord.risk_level).all()

    tamper_count = db.query(HistoricalScreeningRecord).filter(HistoricalScreeningRecord.tamper_flag == True).count()

    doc_type_counts = db.query(
        HistoricalScreeningRecord.document_type, func.count(HistoricalScreeningRecord.id)
    ).group_by(HistoricalScreeningRecord.document_type).all()

    country_counts = db.query(
        HistoricalScreeningRecord.country, func.count(HistoricalScreeningRecord.id)
    ).group_by(HistoricalScreeningRecord.country).order_by(func.count(HistoricalScreeningRecord.id).desc()).limit(10).all()

    return {
        "total_historical_records": total_records,
        "tamper_records_count": tamper_count,
        "risk_breakdown": {str(k or "Unknown"): v for k, v in risk_counts},
        "document_types": {str(k or "Unknown"): v for k, v in doc_type_counts},
        "top_countries": {str(k or "Unknown"): v for k, v in country_counts},
    }
