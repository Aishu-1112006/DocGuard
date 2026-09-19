from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def run_auto_migrations():
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "passenger_requests" in inspector.get_table_names():
        existing_cols = {col["name"] for col in inspector.get_columns("passenger_requests")}
        expected_cols = {
            "request_id": "VARCHAR",
            "passenger_id": "VARCHAR",
            "passenger_name": "VARCHAR",
            "passenger_email": "VARCHAR",
            "conversation_summary": "TEXT",
            "priority": "VARCHAR DEFAULT 'NORMAL'",
            "assigned_officer_id": "VARCHAR",
            "reviewed_at": "DATETIME",
            "resolved_at": "DATETIME"
        }
        with engine.connect() as conn:
            for col_name, col_type in expected_cols.items():
                if col_name not in existing_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE passenger_requests ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                        print(f"[MIGRATION] Added missing column '{col_name}' to table 'passenger_requests'.")
                    except Exception as e:
                        print(f"[MIGRATION WARNING] Could not add column '{col_name}': {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()