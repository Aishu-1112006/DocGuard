import uuid
import datetime as dt

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, LargeBinary, Text, Boolean
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Officer(Base):
    __tablename__ = "officers"

    id = Column(String, primary_key=True, default=gen_uuid)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone_number = Column(String, nullable=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="OFFICER")  # OFFICER, SUPERVISOR, ADMIN, PASSENGER
    badge_number = Column(String, nullable=True)
    assigned_airport = Column(String, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    cases = relationship("Case", back_populates="officer")
    assigned_reappeals = relationship("ReAppealRequest", back_populates="assigned_officer")


def gen_req_id():
    return "REQ-" + uuid.uuid4().hex[:8].upper()


class Case(Base):
    """One traveller's screening session — holds every document they
    presented plus their live face, liveness, periocular metrics and final fused risk."""
    __tablename__ = "cases"

    id = Column(String, primary_key=True, default=gen_uuid)
    officer_id = Column(String, ForeignKey("officers.id"), nullable=False, index=True)

    # Airport metadata
    airport_name = Column(String, nullable=True)
    airport_code = Column(String, nullable=True)
    airport_city = Column(String, nullable=True)
    airport_state = Column(String, nullable=True)

    # Face & Biometric
    selfie_image = Column(LargeBinary, nullable=True)
    face_match_score = Column(Float, nullable=True)
    liveness_score = Column(Float, nullable=True)
    liveness_status = Column(String, nullable=True)  # PASSED / FAILED / UNCHECKED
    periocular_score = Column(Float, nullable=True)
    periocular_status = Column(String, nullable=True)

    # Consistency & Intelligence
    cross_doc_match = Column(Boolean, nullable=True)
    cross_doc_note = Column(Text, nullable=True)

    sandbox_verified = Column(Boolean, nullable=True)
    sandbox_status = Column(String, default="NOT_CONFIGURED")  # VERIFIED / MISMATCH / NOT_CONFIGURED / UNAVAILABLE
    sandbox_note = Column(Text, nullable=True)

    historical_match_found = Column(Boolean, default=False)
    historical_match_details = Column(Text, nullable=True)

    # Risk & Status
    risk_score = Column(Float, nullable=True)
    risk_category = Column(String, nullable=True)  # low / medium / high
    final_status = Column(String, default="in_progress")  # in_progress / pending / cleared / flagged / rejected
    officer_note = Column(Text, nullable=True)

    reappeal_status = Column(String, default="NONE")  # NONE / SUBMITTED / UNDER_REVIEW / NEED_INFO / ACCEPTED / REJECTED / ESCALATED

    created_at = Column(DateTime, default=dt.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    officer = relationship("Officer", back_populates="cases")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    audit_events = relationship("AuditLog", back_populates="case", cascade="all, delete-orphan")
    reappeals = relationship("ReAppealRequest", back_populates="case", cascade="all, delete-orphan")
    passenger_requests = relationship("PassengerRequest", back_populates="case", cascade="all, delete-orphan")


class Document(Base):
    """One uploaded document belonging to a Case."""
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)

    document_type = Column(String, nullable=False)
    image = Column(LargeBinary, nullable=True)

    extracted_name = Column(String, nullable=True)
    extracted_id_number = Column(String, nullable=True)
    extracted_dob = Column(String, nullable=True)
    extracted_nationality = Column(String, nullable=True)
    extracted_expiry = Column(String, nullable=True)
    extracted_gender = Column(String, nullable=True)
    extracted_issue_date = Column(String, nullable=True)
    mrz_found = Column(Boolean, default=False)

    ocr_confidence = Column(Float, default=0.0)
    tamper_score = Column(Float, default=0.0)
    template_score = Column(Float, default=0.0)
    forgery_probability = Column(Float, default=0.0)
    format_valid = Column(Boolean, default=False)
    validation_note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=dt.datetime.utcnow)

    case = relationship("Case", back_populates="documents")


class HistoricalScreeningRecord(Base):
    """Reference dataset containing historical screening records (e.g. 5,000-row sample).
    Separated strictly from operational officer cases."""
    __tablename__ = "historical_screening_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(String, unique=True, index=True, nullable=True)
    document_number = Column(String, index=True, nullable=True)
    full_name = Column(String, index=True, nullable=True)
    dob = Column(String, nullable=True)
    country = Column(String, index=True, nullable=True)
    document_type = Column(String, nullable=True)
    risk_level = Column(String, nullable=True)  # Low / Medium / High
    tamper_flag = Column(Boolean, default=False)
    sandbox_status = Column(String, nullable=True)
    verification_result = Column(String, nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)


class ReAppealRequest(Base):
    """Passenger re-appeal submitted for a flagged case."""
    __tablename__ = "reappeal_requests"

    id = Column(String, primary_key=True, default=gen_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)

    passenger_name = Column(String, nullable=False)
    passenger_email = Column(String, nullable=True)
    reason = Column(String, nullable=False)
    additional_explanation = Column(Text, nullable=True)
    contact_preference = Column(String, default="email")

    status = Column(String, default="Submitted")  # Submitted / Under Review / Need More Information / Accepted / Rejected / Escalated / Resolved
    priority = Column(String, default="Normal")  # Normal / High / Urgent
    assigned_officer_id = Column(String, ForeignKey("officers.id"), nullable=True)

    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    case = relationship("Case", back_populates="reappeals")
    assigned_officer = relationship("Officer", back_populates="assigned_reappeals")
    actions = relationship("ReAppealAction", back_populates="reappeal", cascade="all, delete-orphan")


class ReAppealAction(Base):
    """Audit action history for a passenger re-appeal."""
    __tablename__ = "reappeal_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reappeal_id = Column(String, ForeignKey("reappeal_requests.id"), nullable=False, index=True)

    actor = Column(String, nullable=False)
    role = Column(String, nullable=False)
    action_type = Column(String, nullable=False)  # REVIEW / REQUEST_INFO / ACCEPT / REJECT / ESCALATE / NOTE
    note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=dt.datetime.utcnow)

    reappeal = relationship("ReAppealRequest", back_populates="actions")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=True, index=True)
    actor = Column(String, nullable=False)
    role = Column(String, default="OFFICER")
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow, index=True)

    case = relationship("Case", back_populates="audit_events")


def gen_human_req_id():
    year = dt.datetime.utcnow().year
    return f"REQ-{year}-{uuid.uuid4().hex[:6].upper()}"


class PassengerRequest(Base):
    """Passenger request raised directly via chatbot or passenger portal."""
    __tablename__ = "passenger_requests"

    id = Column(String, primary_key=True, default=gen_uuid)
    request_id = Column(String, default=gen_human_req_id, index=True, unique=True)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    passenger_id = Column(String, nullable=True, index=True)
    passenger_name = Column(String, nullable=True)
    passenger_email = Column(String, nullable=True)
    
    request_type = Column(String, nullable=False, default="RE_VERIFICATION") # DOCUMENT_FLAG, IDENTITY_MISMATCH, FACE_VERIFICATION, VERIFICATION_DELAY, RE_VERIFICATION, GENERAL_QUERY, OTHER
    subject = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    conversation_summary = Column(Text, nullable=True)
    
    status = Column(String, default="PENDING", index=True)  # PENDING / UNDER_REVIEW / MORE_INFORMATION_REQUIRED / RE_VERIFICATION_REQUIRED / RESOLVED / REJECTED / CANCELLED
    priority = Column(String, default="NORMAL") # NORMAL / HIGH / URGENT
    
    assigned_officer_id = Column(String, ForeignKey("officers.id"), nullable=True)
    officer_response = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=dt.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    case = relationship("Case", back_populates="passenger_requests")
    assigned_officer = relationship("Officer")
    messages = relationship("PassengerRequestMessage", back_populates="request", cascade="all, delete-orphan", order_by="PassengerRequestMessage.created_at.asc()")
    reverifications = relationship("ReVerificationLog", back_populates="request", cascade="all, delete-orphan")


class PassengerRequestMessage(Base):
    """Individual chat thread message attached to a PassengerRequest."""
    __tablename__ = "passenger_request_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    request_id = Column(String, ForeignKey("passenger_requests.id"), nullable=False, index=True)
    
    sender_type = Column(String, nullable=False) # PASSENGER / CHATBOT / OFFICER
    sender_id = Column(String, nullable=True)
    sender_name = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    
    attachment_bytes = Column(LargeBinary, nullable=True)
    attachment_filename = Column(String, nullable=True)
    attachment_mimetype = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=dt.datetime.utcnow, index=True)

    request = relationship("PassengerRequest", back_populates="messages")


class ReVerificationLog(Base):
    """Log of fresh camera re-verifications triggered by duty officer."""
    __tablename__ = "reverification_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    case_id = Column(String, ForeignKey("cases.id"), nullable=False, index=True)
    request_id = Column(String, ForeignKey("passenger_requests.id"), nullable=False, index=True)
    
    selfie_image = Column(LargeBinary, nullable=True)
    face_match_score = Column(Float, nullable=True)
    liveness_score = Column(Float, nullable=True)
    liveness_status = Column(String, nullable=True)
    periocular_score = Column(Float, nullable=True)
    cross_doc_match = Column(Boolean, nullable=True)
    overall_result = Column(String, default="VERIFIED")
    
    created_at = Column(DateTime, default=dt.datetime.utcnow, index=True)

    request = relationship("PassengerRequest", back_populates="reverifications")