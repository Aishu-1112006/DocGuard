# DocGuard — Complete Local Prototype

This package contains the full React + FastAPI + PostgreSQL prototype with email-based officer authentication.

## Backend
1. Use Python 3.11.
2. Create `backend/.env` from `backend/.env.example`.
3. Set `DATABASE_URL` to your local PostgreSQL database. If the password contains `@`, encode it as `%40`.
4. From `backend`, install dependencies with `venv\Scripts\python.exe -m pip install -r requirements.txt`.
5. Start with `venv\Scripts\python.exe -m uvicorn app.main:app --reload`.

## Frontend
From `frontend`, run `npm.cmd install`, then `npm.cmd run dev`. Open the URL Vite prints, normally `http://localhost:5173/docguard/`.

## Authentication
Create Account uses full name, email, phone number, username and an 8+ character password. Sign In uses email + password.

## Prototype flow
Login → Dashboard → New Screening → upload document → OCR/validation/tamper analysis → selfie/face matching → finalize → risk score → officer decision.
