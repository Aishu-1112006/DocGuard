from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Officer, AuditLog
from ..schemas import Token, LoginRequest, RegisterRequest, OfficerOut
from ..auth import verify_password, create_access_token, hash_password, get_current_officer

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    username = data.username.strip()

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must contain at least 6 characters")
    if db.query(Officer).filter(Officer.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
    if db.query(Officer).filter(Officer.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    role = data.role.upper() if data.role else "OFFICER"
    if role not in ["OFFICER", "SUPERVISOR", "ADMIN", "PASSENGER"]:
        role = "OFFICER"

    officer = Officer(
        full_name=data.full_name.strip(),
        email=email,
        phone_number=data.phone_number.strip(),
        username=username,
        password_hash=hash_password(data.password),
        role=role,
        badge_number=data.badge_number or "BADGE-101",
        assigned_airport=data.assigned_airport or "MAA - Chennai International Airport"
    )
    db.add(officer)
    db.commit()
    db.refresh(officer)

    db.add(AuditLog(actor=officer.username, role=officer.role, action="USER_REGISTERED", detail=f"Registered as {officer.role}"))
    db.commit()

    user_dict = {
        "id": officer.id,
        "full_name": officer.full_name,
        "username": officer.username,
        "email": officer.email,
        "role": officer.role,
        "badge_number": officer.badge_number,
        "assigned_airport": officer.assigned_airport
    }

    token_str = create_access_token(subject=officer.username, role=officer.role)
    return Token(access_token=token_str, user=user_dict)


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email_or_user = data.email.lower().strip()
    officer = db.query(Officer).filter(
        (Officer.email == email_or_user) | (Officer.username == email_or_user)
    ).first()

    if not officer or not verify_password(data.password, officer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password",
        )

    db.add(AuditLog(actor=officer.username, role=officer.role, action="USER_LOGIN", detail=f"Logged in successfully"))
    db.commit()

    user_dict = {
        "id": officer.id,
        "full_name": officer.full_name,
        "username": officer.username,
        "email": officer.email,
        "role": officer.role,
        "badge_number": officer.badge_number,
        "assigned_airport": officer.assigned_airport
    }

    token_str = create_access_token(subject=officer.username, role=officer.role)
    return Token(access_token=token_str, user=user_dict)


@router.get("/me", response_model=OfficerOut)
def get_me(officer: Officer = Depends(get_current_officer)):
    return officer
