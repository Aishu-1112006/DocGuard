import os
import json
import pandas as pd
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, Base
from .models import HistoricalScreeningRecord


def seed_historical_records():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    possible_paths = [
        "data/reference/border_verification_sample_5000rows.xlsx",
        "../data/reference/border_verification_sample_5000rows.xlsx",
        "c:/Users/Gokul/Downloads/DOCGUARD-FINAL/data/reference/border_verification_sample_5000rows.xlsx",
        "c:/Users/Gokul/Downloads/border_verification_sample_5000rows.xlsx"
    ]

    excel_path = None
    for p in possible_paths:
        if os.path.exists(p):
            excel_path = p
            break

    try:
        count = db.query(HistoricalScreeningRecord).count()
        if count >= 5000:
            print(f"Historical database already seeded with {count} records.")
            return

        if not excel_path:
            print("Excel file border_verification_sample_5000rows.xlsx not found, skipping seed.")
            return

        print(f"Seeding historical database from {excel_path}...")
        df = pd.read_excel(excel_path)

        records_to_insert = []
        for _, row in df.iterrows():
            given_name = str(row.get("given_name", "")) if pd.notnull(row.get("given_name")) else ""
            surname = str(row.get("surname", "")) if pd.notnull(row.get("surname")) else ""
            full_name = f"{given_name} {surname}".strip()

            doc_num = str(row.get("document_number", "")) if pd.notnull(row.get("document_number")) else ""
            dob = str(row.get("date_of_birth", "")) if pd.notnull(row.get("date_of_birth")) else ""
            country = str(row.get("issuing_country", "")) if pd.notnull(row.get("issuing_country")) else ""
            doc_type = str(row.get("document_type", "")) if pd.notnull(row.get("document_type")) else ""

            risk_val = float(row.get("risk_score", 0.0)) if pd.notnull(row.get("risk_score")) else 0.0
            risk_level = "High" if risk_val > 66 else ("Medium" if risk_val > 33 else "Low")

            tamper_flag = bool(row.get("document_tamper_flag", False))
            sandbox_status = str(row.get("sandbox_cross_check_status", "")) if pd.notnull(row.get("sandbox_cross_check_status")) else ""
            verification_result = str(row.get("verification_result", "")) if pd.notnull(row.get("verification_result")) else ""

            details = {
                "checkpoint_id": str(row.get("checkpoint_id", "")),
                "timestamp_date": str(row.get("timestamp_date", "")),
                "ocr_confidence_pct": float(row.get("ocr_confidence_pct")) if pd.notnull(row.get("ocr_confidence_pct")) else None,
                "face_match_score_pct": float(row.get("face_match_score_pct")) if pd.notnull(row.get("face_match_score_pct")) else None,
                "tamper_type": str(row.get("tamper_type", "")) if pd.notnull(row.get("tamper_type")) else "",
                "risk_score": risk_val,
                "processing_time_ms": int(row.get("processing_time_ms")) if pd.notnull(row.get("processing_time_ms")) else None
            }

            records_to_insert.append(
                HistoricalScreeningRecord(
                    record_id=str(row.get("record_id")),
                    document_number=doc_num,
                    full_name=full_name,
                    dob=dob,
                    country=country,
                    document_type=doc_type,
                    risk_level=risk_level,
                    tamper_flag=tamper_flag,
                    sandbox_status=sandbox_status,
                    verification_result=verification_result,
                    details_json=json.dumps(details)
                )
            )

        db.bulk_save_objects(records_to_insert)
        db.commit()
        print(f"Successfully seeded {len(records_to_insert)} historical screening records into historical_screening_records table.")
    except Exception as exc:
        db.rollback()
        print(f"Error seeding historical records: {exc}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_historical_records()
