import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import settings
from ..models import Case
from ..schemas import BhashiniTranslateRequest, BhashiniTranslateResponse, PassengerAssistantRequest, PassengerAssistantResponse

router = APIRouter(prefix="/bhashini", tags=["bhashini"])

# Dictionary fallback translations when external BHASHINI API key is not configured
DICTIONARY_TRANSLATIONS = {
    "ta": {
        "Low Risk": "குறைந்த ஆபத்து",
        "Medium Risk": "மிதமான ஆபத்து",
        "High Risk": "அதிக ஆபத்து",
        "Document verified": "ஆவணம் சரிபார்க்கப்பட்டது",
        "Live face match passed": "நேரலை முக பொருத்தம் வெற்றி பெற்றது",
        "Re-appeal under review": "மறுமுறையீடு ஆய்வில் உள்ளது",
        "Secondary review required": "இரண்டாம் கட்ட ஆய்வு தேவைப்படுகிறது",
    },
    "hi": {
        "Low Risk": "कम जोखिम",
        "Medium Risk": "मध्यम जोखिम",
        "High Risk": "उच्च जोखिम",
        "Document verified": "दस्तावेज़ सत्यापित",
        "Live face match passed": "लाइव चेहरा मिलान सफल",
        "Re-appeal under review": "पुनर्याचिका समीक्षाधीन है",
        "Secondary review required": "द्वितीयक समीक्षा आवश्यक है",
    }
}


@router.post("/translate", response_model=BhashiniTranslateResponse)
def translate_text(payload: BhashiniTranslateRequest):
    """Backend BHASHINI translation proxy keeping credentials safe."""
    target_lang = payload.target_language.lower()
    source_text = payload.text.strip()

    if target_lang == "en" or not source_text:
        return BhashiniTranslateResponse(translated_text=source_text, status="OK")

    # If BHASHINI API is configured, call official API
    if settings.bhashini_enabled and settings.bhashini_api_key and settings.bhashini_base_url:
        try:
            resp = requests.post(
                f"{settings.bhashini_base_url.rstrip('/')}/v1/translate",
                headers={"Authorization": settings.bhashini_api_key, "Content-Type": "application/json"},
                json={
                    "pipelineTasks": [{"taskType": "translation", "config": {"language": {"sourceLanguage": payload.source_language, "targetLanguage": target_lang}}}],
                    "inputData": {"input": [{"source": source_text}]}
                },
                timeout=5
            )
            if resp.status_code == 200:
                out = resp.json()
                translated = out.get("pipelineResponse", [{}])[0].get("output", [{}])[0].get("target", source_text)
                return BhashiniTranslateResponse(translated_text=translated, status="BHASHINI_OK")
        except Exception:
            pass  # Fallback to local dictionary

    # Local fallback
    dict_map = DICTIONARY_TRANSLATIONS.get(target_lang, {})
    translated = dict_map.get(source_text, f"[{target_lang.upper()}] {source_text}")
    return BhashiniTranslateResponse(translated_text=translated, status="DICTIONARY_FALLBACK")


@router.post("/assistant", response_model=PassengerAssistantResponse)
def passenger_assistant(payload: PassengerAssistantRequest, db: Session = Depends(get_db)):
    """
    AI Passenger Assistant.
    Grounded strictly in case evidence data to prevent hallucinated risk claims.
    """
    case = db.query(Case).filter(Case.id == payload.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    q = payload.question.lower()

    # Formulate grounded explanation
    risk_cat = case.risk_category or "UNKNOWN"
    status = case.final_status
    doc_count = len(case.documents)
    face_score = case.face_match_score if case.face_match_score is not None else "N/A"
    reappeal_status = case.reappeal_status

    if "why" in q or "reason" in q or "flag" in q or "problem" in q:
        notes = []
        if case.face_match_score is not None and case.face_match_score < 60:
            notes.append(f"Face verification match was {case.face_match_score:.1f}% (below threshold)")
        if case.liveness_status == "FAILED":
            notes.append("Liveness verification check was inconclusive")
        if case.cross_doc_match is False:
            notes.append("Inconsistency detected across uploaded identity documents")
        if case.sandbox_status == "MISMATCH":
            notes.append("Details mismatched reference registry records")

        if notes:
            reason_str = "; ".join(notes)
            answer = f"Your document screening case (ID: {case.id[:8]}) was categorized as {risk_cat} risk due to: {reason_str}."
        else:
            answer = f"Your document screening case (ID: {case.id[:8]}) is currently {status} with a risk rating of {risk_cat}."

    elif "appeal" in q or "reappeal" in q or "review" in q:
        if reappeal_status != "NONE":
            answer = f"Your re-appeal request is currently in status: '{reappeal_status}'. An authorized border officer is reviewing your submission."
        else:
            answer = "You may submit a formal Re-Appeal through the passenger portal by explaining your query and providing contact details."

    elif "status" in q or "result" in q:
        answer = f"Screening Case {case.id[:8]} status is '{status}'. Documents presented: {doc_count}. Biometric match score: {face_score}%."

    else:
        answer = f"DOCGUARD Screening Case {case.id[:8]}: Status is '{status}', Risk Category: '{risk_cat}'. If you have questions regarding your screening, you can request officer re-appeal review."

    return PassengerAssistantResponse(answer=answer, evidence_grounded=True)
