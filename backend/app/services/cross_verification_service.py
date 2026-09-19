from difflib import SequenceMatcher
import re


def _normalize_name(name) -> str:
    """Strips common honorific titles and special characters for clean matching."""
    if not name:
        return ""
    clean = str(name).strip().upper()
    titles = [r"\bMR\b", r"\bMRS\b", r"\bMS\b", r"\bDR\b", r"\bPROF\b", r"\bSHRI\b", r"\bSMT\b"]
    for t in titles:
        clean = re.sub(t, "", clean)
    clean = re.sub(r"[^A-Z\s]", "", clean)
    return " ".join(clean.split())


def _name_similarity(a, b) -> float:
    norm_a = _normalize_name(a)
    norm_b = _normalize_name(b)
    
    if not norm_a or not norm_b:
        return 0.0

    if norm_a == norm_b:
        return 1.0

    tokens_a = norm_a.split()
    tokens_b = norm_b.split()

    # 1. Standard SequenceMatcher ratio
    raw_ratio = SequenceMatcher(None, norm_a, norm_b).ratio()

    # 2. Token-sorted ratio (handles name word order changes e.g. "GOKUL RAMASAMY" vs "RAMASAMY GOKUL")
    sorted_a = " ".join(sorted(tokens_a))
    sorted_b = " ".join(sorted(tokens_b))
    sorted_ratio = SequenceMatcher(None, sorted_a, sorted_b).ratio()

    # 3. Token-set intersection ratio
    set_a = set(tokens_a)
    set_b = set(tokens_b)
    intersection = set_a.intersection(set_b)
    set_ratio = (2.0 * len(intersection)) / (len(set_a) + len(set_b)) if (set_a or set_b) else 0.0

    return max(raw_ratio, sorted_ratio, set_ratio)


def check_cross_document_consistency(documents: list) -> dict:
    """
    Compares name and DOB across every document uploaded for this case
    (passport, visa, national ID...) to catch identity discrepancies.
    """
    if not documents:
        return {
            "cross_doc_match": None,
            "cross_doc_note": "No documents uploaded.",
        }

    docs_with_name = [d for d in documents if d.get("extracted_name")]
    docs_with_dob = [d for d in documents if d.get("extracted_dob")]

    if len(docs_with_name) < 2 and len(docs_with_dob) < 2:
        return {
            "cross_doc_match": None,
            "cross_doc_note": "Only one document uploaded — nothing to cross-check yet.",
        }

    mismatches = []

    for i in range(len(docs_with_name)):
        for j in range(i + 1, len(docs_with_name)):
            sim = _name_similarity(docs_with_name[i]["extracted_name"], docs_with_name[j]["extracted_name"])
            if sim < 0.70:
                mismatches.append(
                    f"Name mismatch between {docs_with_name[i].get('document_type', 'Document')} ({docs_with_name[i]['extracted_name']}) and {docs_with_name[j].get('document_type', 'Document')} ({docs_with_name[j]['extracted_name']})"
                )

    for i in range(len(docs_with_dob)):
        for j in range(i + 1, len(docs_with_dob)):
            dob1 = str(docs_with_dob[i]["extracted_dob"] or "").strip()
            dob2 = str(docs_with_dob[j]["extracted_dob"] or "").strip()
            if dob1 and dob2 and dob1 != dob2:
                mismatches.append(
                    f"DOB mismatch between {docs_with_dob[i].get('document_type', 'Document')} ({dob1}) and {docs_with_dob[j].get('document_type', 'Document')} ({dob2})"
                )

    if mismatches:
        return {"cross_doc_match": False, "cross_doc_note": "; ".join(mismatches)}

    return {"cross_doc_match": True, "cross_doc_note": "Name and DOB consistent across all uploaded documents."}