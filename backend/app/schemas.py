import datetime as dt
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone_number: str = ""
    username: str
    password: str
    role: str = "OFFICER"
    badge_number: str = ""
    assigned_airport: str = ""


class OfficerOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone_number: Optional[str]
    username: str
    role: str
    badge_number: Optional[str]
    assigned_airport: Optional[str]

    class Config:
        from_attributes = True


class DocumentOut(BaseModel):
    id: str
    document_type: str
    extracted_name: Optional[str]
    extracted_id_number: Optional[str]
    extracted_dob: Optional[str]
    extracted_nationality: Optional[str]
    extracted_expiry: Optional[str]
    extracted_gender: Optional[str]
    extracted_issue_date: Optional[str]
    mrz_found: bool = False
    ocr_confidence: float
    tamper_score: float
    template_score: float
    forgery_probability: float = 0.0
    format_valid: bool
    validation_note: Optional[str]
    image_url: Optional[str] = None
    heatmap_url: Optional[str] = None

    class Config:
        from_attributes = True


class CaseCreate(BaseModel):
    airport_name: Optional[str] = "Chennai International Airport"
    airport_code: Optional[str] = "MAA"
    airport_city: Optional[str] = "Chennai"
    airport_state: Optional[str] = "Tamil Nadu"


class CaseSummary(BaseModel):
    id: str
    airport_code: Optional[str]
    airport_name: Optional[str]
    risk_score: Optional[float]
    risk_category: Optional[str]
    final_status: str
    reappeal_status: str = "NONE"
    created_at: dt.datetime

    class Config:
        from_attributes = True


class CaseDetail(BaseModel):
    id: str
    officer_id: str
    airport_name: Optional[str]
    airport_code: Optional[str]
    airport_city: Optional[str]
    airport_state: Optional[str]
    documents: List[DocumentOut]
    selfie_image_url: Optional[str] = None
    face_match_score: Optional[float]
    liveness_score: Optional[float]
    liveness_status: Optional[str]
    periocular_score: Optional[float]
    periocular_status: Optional[str]
    cross_doc_match: Optional[bool]
    cross_doc_note: Optional[str]
    sandbox_verified: Optional[bool]
    sandbox_status: Optional[str]
    sandbox_note: Optional[str]
    historical_match_found: Optional[bool]
    historical_match_details: Optional[str]
    risk_score: Optional[float]
    risk_category: Optional[str]
    risk_components: Optional[Dict[str, float]] = None
    mismatches: Optional[List[Dict[str, Any]]] = None
    final_status: str
    reappeal_status: Optional[str]
    officer_note: Optional[str]
    created_at: dt.datetime

    class Config:
        from_attributes = True


class OfficerDecision(BaseModel):
    decision: str  # approve / reject / escalate
    note: Optional[str] = None


class ReAppealCreate(BaseModel):
    case_id: str
    passenger_name: str
    passenger_email: Optional[str] = ""
    reason: str
    additional_explanation: Optional[str] = ""
    contact_preference: Optional[str] = "email"


class ReAppealActionCreate(BaseModel):
    action_type: str  # REVIEW / REQUEST_INFO / ACCEPT / REJECT / ESCALATE / NOTE
    note: Optional[str] = None


class ReAppealActionOut(BaseModel):
    id: int
    actor: str
    role: str
    action_type: str
    note: Optional[str]
    created_at: dt.datetime

    class Config:
        from_attributes = True


class ReAppealOut(BaseModel):
    id: str
    case_id: str
    passenger_name: str
    passenger_email: Optional[str]
    reason: str
    additional_explanation: Optional[str]
    contact_preference: str
    status: str
    priority: str
    assigned_officer_id: Optional[str]
    created_at: dt.datetime
    updated_at: dt.datetime
    actions: List[ReAppealActionOut] = []

    class Config:
        from_attributes = True


class HistoricalRecordOut(BaseModel):
    id: int
    record_id: Optional[str]
    document_number: Optional[str]
    full_name: Optional[str]
    dob: Optional[str]
    country: Optional[str]
    document_type: Optional[str]
    risk_level: Optional[str]
    tamper_flag: bool
    sandbox_status: Optional[str]
    verification_result: Optional[str]

    class Config:
        from_attributes = True


class BhashiniTranslateRequest(BaseModel):
    source_language: str = "en"
    target_language: str = "ta"  # ta / hi / en
    text: str


class BhashiniTranslateResponse(BaseModel):
    translated_text: str
    status: str = "OK"


class PassengerAssistantMessageItem(BaseModel):
    sender: str # passenger / chatbot / officer
    text: str


class PassengerAssistantRequest(BaseModel):
    case_id: str
    question: str
    language: str = "en"  # en / ta / hi
    chat_history: Optional[List[PassengerAssistantMessageItem]] = None


class PassengerAssistantResponse(BaseModel):
    answer: str
    inferred_request_type: Optional[str] = "OTHER"
    suggested_summary: Optional[str] = None
    evidence_grounded: bool = True
    quick_actions: Optional[List[str]] = None
    request_draft: Optional[dict] = None


class PassengerRequestMessageCreate(BaseModel):
    message: str
    sender_type: str = "PASSENGER"  # PASSENGER / CHATBOT / OFFICER
    sender_name: Optional[str] = None


class PassengerRequestMessageOut(BaseModel):
    id: str
    request_id: str
    sender_type: str
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    message: str
    has_attachment: bool = False
    attachment_filename: Optional[str] = None
    attachment_mimetype: Optional[str] = None
    created_at: dt.datetime

    class Config:
        from_attributes = True


class ReVerificationLogOut(BaseModel):
    id: str
    case_id: str
    request_id: str
    face_match_score: Optional[float]
    liveness_score: Optional[float]
    liveness_status: Optional[str]
    periocular_score: Optional[float]
    cross_doc_match: Optional[bool]
    overall_result: str
    created_at: dt.datetime

    class Config:
        from_attributes = True


class PassengerRequestMessageInput(BaseModel):
    sender_type: str
    message: str
    sender_name: Optional[str] = None


class PassengerRequestCreate(BaseModel):
    case_id: Optional[str] = None
    request_type: str = "RE_VERIFICATION"  # DOCUMENT_FLAG, IDENTITY_MISMATCH, FACE_VERIFICATION, VERIFICATION_DELAY, RE_VERIFICATION, GENERAL_QUERY, OTHER
    subject: Optional[str] = ""
    message: str
    conversation_summary: Optional[str] = ""
    passenger_name: Optional[str] = ""
    passenger_email: Optional[str] = ""
    initial_messages: Optional[List[PassengerRequestMessageInput]] = None


class PassengerRequestRespond(BaseModel):
    status: str  # UNDER_REVIEW / MORE_INFORMATION_REQUIRED / RE_VERIFICATION_REQUIRED / RESOLVED / REJECTED
    officer_response: str
    action_type: Optional[str] = "REPLY" # REPLY / REQUEST_INFO / START_REVERIFICATION / RESOLVE / REJECT


class PassengerRequestOut(BaseModel):
    id: str
    request_id: str
    case_id: str
    passenger_id: Optional[str] = None
    passenger_name: Optional[str] = None
    passenger_email: Optional[str] = None
    request_type: str
    subject: Optional[str] = None
    message: str
    conversation_summary: Optional[str] = None
    status: str
    priority: str
    assigned_officer_id: Optional[str] = None
    officer_response: Optional[str] = None
    created_at: dt.datetime
    updated_at: dt.datetime
    reviewed_at: Optional[dt.datetime] = None
    resolved_at: Optional[dt.datetime] = None
    messages: List[PassengerRequestMessageOut] = []
    reverifications: List[ReVerificationLogOut] = []

    class Config:
        from_attributes = True