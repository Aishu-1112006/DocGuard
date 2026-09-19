from typing import Dict, Any, List, Optional


def compute_case_risk(
    has_documents: bool = True,
    avg_tamper_score: float = 0.0,
    avg_template_score: float = 100.0,
    forgery_probability: float = 0.0,
    any_format_invalid: bool = False,
    ocr_confidence: float = 100.0,
    face_match_score: Optional[float] = None,
    liveness_score: Optional[float] = None,
    periocular_score: Optional[float] = None,
    cross_doc_match: Optional[bool] = None,
    sandbox_status: Optional[str] = "NOT_CONFIGURED",
    historical_match: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Evidence Fusion & Explainable Risk Engine (0-100 Score).
    0-33: LOW RISK (CLEAR)
    34-66: MEDIUM RISK (SECONDARY REVIEW)
    67-100: HIGH RISK (ESCALATE)
    If critical biometrics/documents missing: NOT DETERMINED
    """
    # Check if verification is incomplete
    if not has_documents or (face_match_score is None and liveness_score is None):
        return {
            "risk_score": 0.0,
            "risk_category": "NOT DETERMINED",
            "recommendation": "INCOMPLETE VERIFICATION — UPLOAD DOCUMENT AND CAPTURE LIVE PASSENGER FACE",
            "evidence_breakdown": [
                {
                    "source": "verification_engine",
                    "signal": "missing_required_evidence",
                    "score": 0.0,
                    "severity": "MEDIUM",
                    "impact": "Pending Data",
                    "explanation": "Verification pipeline incomplete. Requires both document upload and live camera biometric capture."
                }
            ]
        }

    base_score = 10.0  # Baseline low risk
    evidence_breakdown = []

    # 1. Document Forensics & Tampering (Weight: up to 30)
    if avg_tamper_score > 60:
        base_score += 25.0
        evidence_breakdown.append({
            "source": "document_forensics",
            "signal": "high_ela_anomaly",
            "score": round(avg_tamper_score, 1),
            "severity": "HIGH",
            "impact": "+25 Risk",
            "explanation": "High Error Level Analysis (ELA) compression anomaly detected on document."
        })
    elif avg_tamper_score > 35:
        base_score += 12.0
        evidence_breakdown.append({
            "source": "document_forensics",
            "signal": "moderate_ela_anomaly",
            "score": round(avg_tamper_score, 1),
            "severity": "MEDIUM",
            "impact": "+12 Risk",
            "explanation": "Moderate image artifact anomaly observed on document."
        })

    # 2. Forgery & Template Analysis (Weight: up to 25)
    if forgery_probability > 0.6:
        base_score += 25.0
        evidence_breakdown.append({
            "source": "forgery_model",
            "signal": "forgery_pattern_detected",
            "score": round(forgery_probability * 100, 1),
            "severity": "HIGH",
            "impact": "+25 Risk",
            "explanation": "Field forgery classification model identified suspicious layout/font discrepancy."
        })
    elif avg_template_score < 50:
        base_score += 15.0
        evidence_breakdown.append({
            "source": "template_analysis",
            "signal": "template_mismatch",
            "score": round(avg_template_score, 1),
            "severity": "MEDIUM",
            "impact": "+15 Risk",
            "explanation": "Document layout deviated from standard issuing template."
        })

    # 3. Document Format & Syntax Validation (Weight: up to 20)
    if any_format_invalid:
        base_score += 20.0
        evidence_breakdown.append({
            "source": "document_validation",
            "signal": "format_or_checksum_error",
            "score": 0.0,
            "severity": "HIGH",
            "impact": "+20 Risk",
            "explanation": "Document dates or checksum formatting failed validation rules."
        })

    # 4. Face Recognition & Biometric Matching (Weight: up to 35)
    if face_match_score is not None:
        if face_match_score < 45.0:
            base_score += 35.0
            evidence_breakdown.append({
                "source": "face_verification",
                "signal": "identity_mismatch",
                "score": round(face_match_score, 1),
                "severity": "HIGH",
                "impact": "+35 Risk",
                "explanation": f"Live face similarity match is critically low ({face_match_score:.1f}%). Presenting person does not match document photo."
            })
        elif face_match_score < 65.0:
            base_score += 15.0
            evidence_breakdown.append({
                "source": "face_verification",
                "signal": "low_face_match",
                "score": round(face_match_score, 1),
                "severity": "MEDIUM",
                "impact": "+15 Risk",
                "explanation": f"Moderate face match confidence ({face_match_score:.1f}%). Secondary verification suggested."
            })
        else:
            evidence_breakdown.append({
                "source": "face_verification",
                "signal": "face_match_passed",
                "score": round(face_match_score, 1),
                "severity": "LOW",
                "impact": "0 Risk",
                "explanation": f"Live face matches document photo with high confidence ({face_match_score:.1f}%)."
            })

    # 5. Liveness & Anti-Spoofing (Weight: up to 20)
    if liveness_score is not None and liveness_score < 50.0:
        base_score += 20.0
        evidence_breakdown.append({
            "source": "liveness_detection",
            "signal": "liveness_check_failed",
            "score": round(liveness_score, 1),
            "severity": "HIGH",
            "impact": "+20 Risk",
            "explanation": "Liveness analysis indicates potential static photo/presentation attack."
        })

    # 6. Cross-Document Consistency (Weight: up to 25)
    if cross_doc_match is False:
        base_score += 25.0
        evidence_breakdown.append({
            "source": "cross_document",
            "signal": "field_mismatch",
            "score": 0.0,
            "severity": "HIGH",
            "impact": "+25 Risk",
            "explanation": "Discrepancy detected between fields across presented documents (e.g., Name/DOB mismatch)."
        })

    # 7. Sandbox Reference Verification (Weight: up to 20)
    if sandbox_status == "MISMATCH":
        base_score += 20.0
        evidence_breakdown.append({
            "source": "sandbox_verification",
            "signal": "government_registry_mismatch",
            "score": 0.0,
            "severity": "HIGH",
            "impact": "+20 Risk",
            "explanation": "Document number or details do not match external reference database."
        })

    # 8. Historical Flag Intelligence (Weight: up to 15)
    if historical_match and historical_match.get("found"):
        rec = historical_match.get("record", {})
        if rec.get("risk_level") == "High" or rec.get("tamper_flag"):
            base_score += 15.0
            evidence_breakdown.append({
                "source": "historical_intelligence",
                "signal": "prior_border_flag",
                "score": 0.0,
                "severity": "HIGH",
                "impact": "+15 Risk",
                "explanation": f"Prior border screening record found with High Risk flag (Record #{rec.get('record_id')})."
            })

    # Compute numerical risk components for UI breakdown (0 to 100 per component)
    risk_components = {
        "tamper": round(min(100.0, avg_tamper_score), 1),
        "template_mismatch": round(max(0.0, min(100.0, 100.0 - avg_template_score)), 1),
        "invalid_format": 100.0 if any_format_invalid else 0.0,
        "face_mismatch": round(max(0.0, min(100.0, 100.0 - face_match_score)), 1) if face_match_score is not None else 0.0,
        "cross_doc_mismatch": 100.0 if cross_doc_match is False else 0.0,
        "sandbox_mismatch": 100.0 if sandbox_status == "MISMATCH" else 0.0
    }

    # Generate structured mismatch items identifying WHAT, WHY, EVIDENCE, and IMPACT
    mismatches = []
    if avg_tamper_score > 35:
        mismatches.append({
            "what": "Document Compression & ELA Tamper Anomaly",
            "why": f"Error Level Analysis tamper intensity score is {avg_tamper_score:.1f}/100, exceeding normal compression threshold.",
            "evidence": "Localized pixel compression artifacts detected via ELA forensic analysis.",
            "impact": "+25.0 Risk Contribution" if avg_tamper_score > 60 else "+12.0 Risk Contribution"
        })
    if forgery_probability > 0.6:
        mismatches.append({
            "what": "Document Layout & Font Forgery Discrepancy",
            "why": f"Field forgery classifier returned {forgery_probability*100:.1f}% forgery probability.",
            "evidence": "Document template structure deviates from standard issuing authority specification.",
            "impact": "+25.0 Risk Contribution"
        })
    if any_format_invalid:
        mismatches.append({
            "what": "Document Format / Checksum Validation Failure",
            "why": "Extracted document fields failed format standards, MRZ check digits, or expiration rules.",
            "evidence": "Format validator flagged invalid ID number structure or expired document date.",
            "impact": "+20.0 Risk Contribution"
        })
    if face_match_score is not None and face_match_score < 65.0:
        mismatches.append({
            "what": "Biometric Face Similarity Mismatch",
            "why": f"Live passenger camera photo match against document portrait is {face_match_score:.1f}% (below 65% match threshold).",
            "evidence": "InsightFace ArcFace feature vector cosine similarity comparison.",
            "impact": "+35.0 Risk Contribution" if face_match_score < 45.0 else "+15.0 Risk Contribution"
        })
    if liveness_score is not None and liveness_score < 50.0:
        mismatches.append({
            "what": "Liveness Anti-Spoofing Failure",
            "why": f"Live camera anti-spoofing score is {liveness_score:.1f}%. Presenting photo indicates static presentation attack.",
            "evidence": "High-frequency texture and motion variance analysis failed liveness criteria.",
            "impact": "+20.0 Risk Contribution"
        })
    if cross_doc_match is False:
        mismatches.append({
            "what": "Cross-Document Field Discrepancy",
            "why": "Field values mismatch across presented identity documents.",
            "evidence": "Name, DOB, or Nationality details differ between primary and secondary uploaded documents.",
            "impact": "+25.0 Risk Contribution"
        })
    if sandbox_status == "MISMATCH":
        mismatches.append({
            "what": "External Government Reference Mismatch",
            "why": "Document identifier details do not match external reference database.",
            "evidence": "Sandbox reference check returned MISMATCH status.",
            "impact": "+20.0 Risk Contribution"
        })
    if historical_match and historical_match.get("found"):
        rec = historical_match.get("record", {})
        if rec.get("risk_level") == "High" or rec.get("tamper_flag"):
            mismatches.append({
                "what": "Historical Border Intelligence Prior Flag",
                "why": f"Prior border screening record (Record #{rec.get('record_id')}) contains a High Risk flag.",
                "evidence": "5,000-row historical border intelligence record match.",
                "impact": "+15.0 Risk Contribution"
            })

    final_score = round(min(100.0, max(0.0, base_score)), 1)
    category = risk_category_from_score(final_score)

    recommendation = "CLEAR"
    if category == "HIGH":
        recommendation = "ESCALATE — SECONDARY OFFICER REVIEW MANDATORY"
    elif category == "MEDIUM":
        recommendation = "SECONDARY REVIEW — VERIFY BIOMETRICS OR RE-INSPECT"

    return {
        "risk_score": final_score,
        "risk_category": category,
        "recommendation": recommendation,
        "risk_components": risk_components,
        "mismatches": mismatches,
        "evidence_breakdown": evidence_breakdown
    }


def risk_category_from_score(score: float) -> str:
    if score >= 67.0:
        return "HIGH"
    elif score >= 34.0:
        return "MEDIUM"
    return "LOW"