import requests
from typing import Dict, Any
from ..config import settings


def verify_with_sandbox(document_type: str, id_number: str, name: str, dob: str) -> Dict[str, Any]:
    """
    Sandbox/Reference Verification Adapter Architecture.
    Cross-checks extracted document data against reference/government sandbox APIs (DigiLocker, UIDAI sandbox, etc.)
    Returns status: NOT_CONFIGURED, VERIFIED, MISMATCH, or UNAVAILABLE.
    """
    if not settings.sandbox_base_url or not settings.sandbox_client_id:
        return {
            "sandbox_verified": None,
            "sandbox_status": "NOT_CONFIGURED",
            "note": "Reference sandbox API not configured — external registry check skipped (AI-only evidence used).",
        }

    try:
        token_resp = requests.post(
            f"{settings.sandbox_base_url.rstrip('/')}/token",
            data={
                "grant_type": "client_credentials",
                "client_id": settings.sandbox_client_id,
                "client_secret": settings.sandbox_client_secret,
            },
            timeout=5,
        )
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")

        verify_resp = requests.post(
            f"{settings.sandbox_base_url.rstrip('/')}/verify/{document_type}",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"id_number": id_number, "name": name, "dob": dob},
            timeout=5,
        )
        verify_resp.raise_for_status()
        result = verify_resp.json()
        is_matched = bool(result.get("match", False))

        return {
            "sandbox_verified": is_matched,
            "sandbox_status": "VERIFIED" if is_matched else "MISMATCH",
            "note": result.get("message", "Checked against reference registry"),
        }

    except Exception as exc:
        return {
            "sandbox_verified": None,
            "sandbox_status": "UNAVAILABLE",
            "note": f"External reference sandbox service unavailable ({type(exc).__name__}).",
        }