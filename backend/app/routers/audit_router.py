from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import datetime as dt

from ..database import get_db
from ..models import AuditLog, Officer
from ..auth import get_current_officer

router = APIRouter(prefix="/audit", tags=["audit"])


class AuditLogOut(BaseModel):
    id: int
    case_id: Optional[str]
    actor: str
    role: str
    action: str
    detail: Optional[str]
    created_at: dt.datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    case_id: Optional[str] = None,
    db: Session = Depends(get_db),
    officer: Officer = Depends(get_current_officer)
):
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if case_id:
        query = query.filter(AuditLog.case_id == case_id)
    return query.limit(min(limit, 500)).all()
