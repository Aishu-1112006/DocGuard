from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models import HistoricalScreeningRecord


def search_historical_intelligence(
    db: Session,
    document_number: Optional[str] = None,
    name: Optional[str] = None,
    dob: Optional[str] = None,
    country: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        query = db.query(HistoricalScreeningRecord)

        if document_number and len(str(document_number).strip()) > 3:
            doc_clean = str(document_number).strip().upper()
            query_doc = query.filter(
                (HistoricalScreeningRecord.document_number == doc_clean) |
                (HistoricalScreeningRecord.document_number.ilike(f"{doc_clean}%"))
            ).first()
            if query_doc:
                return _format_match(query_doc, "Document Number Match")

        if name and len(str(name).strip()) > 2:
            name_clean = str(name).strip()
            query_name = query.filter(
                (HistoricalScreeningRecord.full_name.ilike(f"{name_clean}%"))
            ).first()
            if query_name:
                return _format_match(query_name, "Passenger Name Match")
    except Exception:
        pass

    return {
        "found": False,
        "match_type": "None",
        "record": None,
        "note": "No matching prior border screening record found in historical intelligence database."
    }


def _format_match(rec: HistoricalScreeningRecord, match_type: str) -> Dict[str, Any]:
    return {
        "found": True,
        "match_type": match_type,
        "record": {
            "record_id": rec.record_id,
            "document_number": rec.document_number,
            "full_name": rec.full_name,
            "country": rec.country,
            "document_type": rec.document_type,
            "risk_level": rec.risk_level,
            "tamper_flag": rec.tamper_flag,
            "verification_result": rec.verification_result,
            "sandbox_status": rec.sandbox_status,
            "created_at": rec.created_at.isoformat() if rec.created_at else None,
        },
        "note": f"Previous record found ({match_type}): Document #{rec.document_number}, Prior Result: {rec.verification_result}, Risk Level: {rec.risk_level}"
    }
