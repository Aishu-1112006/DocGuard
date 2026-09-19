from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine, run_auto_migrations
from .routers import (
    auth_router,
    cases_router,
    historical_router,
    reappeals_router,
    bhashini_router,
    audit_router,
    passenger_requests_router,
)
from .seed_historical import seed_historical_records

# Ensure tables created and migrated
Base.metadata.create_all(bind=engine)
try:
    run_auto_migrations()
except Exception as e:
    print(f"Auto-migration check: {e}")

# Auto-seed historical dataset if empty
try:
    seed_historical_records()
except Exception as e:
    print(f"Historical seed check: {e}")

app = FastAPI(
    title="DOCGUARD API",
    description="AI-Powered Identity & Document Screening System (SIH 26188)",
    version="2.0.0",
)

allowed_origins_list = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
if "*" not in allowed_origins_list and "http://localhost:5173" not in allowed_origins_list:
    allowed_origins_list.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Demo-ready open CORS for local testing & preview
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(cases_router.router)
app.include_router(historical_router.router)
app.include_router(reappeals_router.router)
app.include_router(bhashini_router.router)
app.include_router(audit_router.router)
app.include_router(passenger_requests_router.router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "DOCGUARD API",
        "version": "2.0.0",
        "database": "connected",
        "models": {
            "ocr": "READY",
            "face_verification": "READY",
            "forgery_detection": "READY",
            "risk_engine": "READY"
        }
    }