import re
from functools import lru_cache
from typing import Optional

from paddleocr import PaddleOCR


@lru_cache(maxsize=1)
def _get_ocr_engine():
    return PaddleOCR(use_angle_cls=True, lang="en")


def _run_ocr_lines(image_path: str):
    ocr = _get_ocr_engine()
    result = ocr.ocr(image_path, cls=True)
    lines, confidences = [], []
    if result and result[0]:
        for line in result[0]:
            lines.append(line[1][0])
            confidences.append(line[1][1])
    return lines, confidences


def _icao_check_digit(data: str) -> int:
    """Calculates standard ICAO 9303 7-3-1 weighting check digit."""
    weights = [7, 3, 1]
    total = 0
    for i, char in enumerate(data):
        if char == "<":
            val = 0
        elif char.isdigit():
            val = int(char)
        elif char.isalpha():
            val = ord(char.upper()) - 55
        else:
            val = 0
        total += val * weights[i % 3]
    return total % 10


def _clean_mrz_digits(s: str) -> str:
    """Repairs common OCR character misreads in numeric MRZ sections."""
    trans = str.maketrans({"O": "0", "o": "0", "I": "1", "l": "1", "Z": "2", "S": "5", "B": "8", "Q": "0"})
    return s.translate(trans)


def _parse_mrz(lines: list) -> Optional[dict]:
    """
    Enhanced TD3 (passport) & TD1/TD2 MRZ parser with ICAO 9303 checksum validation
    and OCR character error correction.
    """
    mrz_candidates = [l.replace(" ", "") for l in lines if len(l.replace(" ", "")) >= 36]
    for i, line in enumerate(mrz_candidates):
        if line.startswith("P<") and i + 1 < len(mrz_candidates):
            line1, line2 = line, mrz_candidates[i + 1]
            try:
                names_part = line1[5:].split("<<", 1)
                surname = names_part[0].replace("<", " ").strip()
                given = names_part[1].replace("<", " ").strip() if len(names_part) > 1 else ""
                
                raw_passport_num = line2[0:9].replace("<", "").strip()
                passport_num = _clean_mrz_digits(raw_passport_num)
                nationality = line2[10:13].replace("<", "").strip()
                
                raw_dob = _clean_mrz_digits(line2[13:19])
                raw_expiry = _clean_mrz_digits(line2[21:27])

                # Check digits validation
                pass_check_valid = False
                dob_check_valid = False
                expiry_check_valid = False

                if len(line2) > 9 and line2[9].isdigit():
                    expected_pass_chk = int(line2[9])
                    pass_check_valid = (_icao_check_digit(line2[0:9]) == expected_pass_chk)

                if len(line2) > 19 and line2[19].isdigit():
                    expected_dob_chk = int(line2[19])
                    dob_check_valid = (_icao_check_digit(raw_dob) == expected_dob_chk)

                if len(line2) > 27 and line2[27].isdigit():
                    expected_exp_chk = int(line2[27])
                    expiry_check_valid = (_icao_check_digit(raw_expiry) == expected_exp_chk)

                mrz_checksum_passed = (dob_check_valid and expiry_check_valid) or pass_check_valid

                def fmt_date(raw):
                    if len(raw) < 6:
                        return None
                    yy, mm, dd = raw[0:2], raw[2:4], raw[4:6]
                    century = "19" if int(yy) > 30 else "20"
                    return f"{dd}/{mm}/{century}{yy}"

                full_name = f"{given} {surname}".strip()
                return {
                    "extracted_name": full_name if full_name else None,
                    "extracted_id_number": passport_num,
                    "extracted_nationality": nationality if len(nationality) == 3 else None,
                    "extracted_dob": fmt_date(raw_dob),
                    "extracted_expiry": fmt_date(raw_expiry),
                    "mrz_found": True,
                    "mrz_checksum_passed": mrz_checksum_passed,
                }
            except (IndexError, ValueError):
                return None
    return None


def extract_fields(image_path: str, document_type: str = "passport") -> dict:
    lines, confidences = _run_ocr_lines(image_path)
    full_text = "\n".join(lines)
    avg_confidence = (sum(confidences) / len(confidences) * 100) if confidences else 0.0

    mrz_data = _parse_mrz(lines) if document_type == "passport" or "passport" in (document_type or "").lower() else None
    if mrz_data:
        # Boost confidence if MRZ checksum is mathematically validated
        if mrz_data.get("mrz_checksum_passed"):
            avg_confidence = max(avg_confidence, 92.5)
        mrz_data["ocr_confidence"] = round(avg_confidence, 2)
        mrz_data["raw_text"] = full_text
        return mrz_data

    # Multi-format date extraction
    dob_match = (
        re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", full_text) or
        re.search(r"\b(\d{4}[/-]\d{2}[/-]\d{2})\b", full_text) or
        re.search(r"\b(\d{2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+\d{4})\b", full_text, re.IGNORECASE)
    )

    # Multi-pattern document ID extraction
    id_match = (
        re.search(r"\b([A-Z]{1,2}\d{6,9})\b", full_text) or
        re.search(r"\b([A-Z]{5}\d{4}[A-Z])\b", full_text) or  # PAN
        re.search(r"\b([A-Z]{3}\d{7})\b", full_text) or       # Voter ID
        re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", full_text) or # Aadhaar
        re.search(r"\b(\d{9,12})\b", full_text)
    )

    # Clean name extraction ignoring field headers/stopwords
    stopwords = {
        "PASSPORT", "REPUBLIC", "INDIA", "UNITED", "STATES", "KINGDOM", "PERMIT", "VISA",
        "IDENTITY", "CARD", "DRIVING", "LICENCE", "LICENSE", "SURNAME", "GIVEN", "NAME",
        "NATIONALITY", "SEX", "GENDER", "DATE", "BIRTH", "EXPIRY", "ISSUE", "AUTHORITY",
        "DOCUMENT", "TYPE", "GOVERNMENT", "OFFICIAL", "INDIAN"
    }

    name_line = None
    for line in lines:
        clean_line = line.strip().upper()
        tokens = set(clean_line.split())
        if (
            clean_line.isupper()
            and 2 <= len(clean_line.split()) <= 4
            and not any(ch.isdigit() for ch in clean_line)
            and not tokens.intersection(stopwords)
        ):
            name_line = line.strip()
            break

    return {
        "extracted_name": name_line,
        "extracted_id_number": id_match.group(1).replace(" ", "") if id_match else None,
        "extracted_dob": dob_match.group(1) if dob_match else None,
        "extracted_nationality": None,
        "extracted_expiry": None,
        "ocr_confidence": round(avg_confidence, 2),
        "raw_text": full_text,
        "mrz_found": False,
        "mrz_checksum_passed": False,
    }