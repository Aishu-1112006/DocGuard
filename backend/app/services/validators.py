import re
import datetime as dt

# Verhoeff checksum tables (used for 12-digit Aadhaar / national ID numbers)
_D = [
    [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
]
_P = [
    [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
]


def verhoeff_is_valid(number: str) -> bool:
    digits = [int(d) for d in re.sub(r"\D", "", number)][::-1]
    if not digits:
        return False
    checksum = 0
    for i, digit in enumerate(digits):
        checksum = _D[checksum][_P[i % 8][digit]]
    return checksum == 0


def _parse_flexible_date(value: str) -> dt.datetime:
    if not value:
        return None
    val_str = str(value).strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d",
        "%d %b %Y", "%d %B %Y"
    ]
    for fmt in formats:
        try:
            return dt.datetime.strptime(val_str, fmt)
        except ValueError:
            continue
    return None


def validate_document(document_type: str, extracted_name, extracted_id_number, extracted_dob, extracted_expiry) -> dict:
    """
    Document Validation Module — checks extracted fields follow official document standards
    for Passport, Aadhaar Card, PAN Card, Voter ID, Driving Licence, Visa, National ID, Other.
    """
    notes = []
    valid = True
    dt_type = (document_type or "").lower().replace(" ", "_")

    if not extracted_name:
        valid = False
        notes.append("Name field could not be clearly extracted")

    if not extracted_id_number:
        valid = False
        notes.append("Document ID number could not be read")
    else:
        clean_id = extracted_id_number.strip().replace(" ", "").replace("-", "").upper()

        if "passport" in dt_type:
            if not re.fullmatch(r"^[A-Z0-9]{8,9}$", clean_id):
                notes.append("Passport number does not match standard 8-9 character format (e.g. Z1234567)")
        elif "aadhaar" in dt_type:
            if not re.fullmatch(r"^[2-9][0-9]{11}$", clean_id):
                valid = False
                notes.append("Aadhaar number must be a 12-digit number (starting 2-9)")
            elif not verhoeff_is_valid(clean_id):
                valid = False
                notes.append("Aadhaar number failed Verhoeff checksum validation")
        elif "pan" in dt_type:
            if not re.fullmatch(r"^[A-Z]{5}[0-9]{4}[A-Z]$", clean_id):
                valid = False
                notes.append("PAN Card number does not match official 10-char pattern (e.g. ABCDE1234F)")
        elif "voter" in dt_type:
            if not re.fullmatch(r"^[A-Z]{3}[0-9]{7}$", clean_id):
                notes.append("Voter ID (EPIC) number does not match 10-char pattern (e.g. ABC1234567)")
        elif "driving" in dt_type or "dl" in dt_type or "licence" in dt_type or "license" in dt_type:
            if len(clean_id) < 8 or len(clean_id) > 16:
                notes.append("Driving Licence number length appears non-standard")
        elif "visa" in dt_type:
            if len(clean_id) < 6:
                notes.append("Visa identifier format non-standard")

    if extracted_expiry:
        expiry_date = _parse_flexible_date(extracted_expiry)
        if expiry_date and expiry_date < dt.datetime.utcnow():
            valid = False
            notes.append("Document has expired")

    if not notes:
        notes.append("All extracted fields passed format & syntax validation")

    return {"format_valid": valid, "validation_note": "; ".join(notes)}