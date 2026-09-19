import datetime as dt
from typing import Optional, List

from fastapi import Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import Officer

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, role: str = "OFFICER", extra_claims: dict = None) -> str:
    expire = dt.datetime.utcnow() + dt.timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "role": role, "exp": expire}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def get_current_officer(
    token: Optional[str] = Depends(oauth2_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> Officer:
    auth_token = token or token_query
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not auth_token:
        raise credentials_error
    try:
        payload = jwt.decode(auth_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_error
    except JWTError:
        raise credentials_error

    officer = db.query(Officer).filter(Officer.username == username).first()
    if officer is None:
        raise credentials_error
    return officer


def require_roles(allowed_roles: List[str]):
    def role_checker(officer: Officer = Depends(get_current_officer)) -> Officer:
        if officer.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation restricted to roles: {', '.join(allowed_roles)}"
            )
        return officer
    return role_checker