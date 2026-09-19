from functools import lru_cache
import numpy as np
import cv2
from insightface.app import FaceAnalysis


@lru_cache(maxsize=1)
def _get_face_app():
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(640, 640))  # -1 = CPU
    return app


def _enhance_contrast(img):
    """Applies CLAHE contrast enhancement for low-light or washed out images."""
    if img is not None and len(img.shape) == 3 and img.shape[2] == 3:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    return img


def _get_embedding(image_path: str):
    app = _get_face_app()
    img = cv2.imread(image_path)
    if img is None:
        return None
    
    faces = app.get(img)
    # Retry with CLAHE contrast enhancement if initial detection found no face
    if not faces:
        enhanced = _enhance_contrast(img)
        faces = app.get(enhanced)

    if not faces:
        return None

    faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
    return faces[0].normed_embedding


def calibrate_cosine_similarity(sim: float) -> float:
    """
    Calibrates raw ArcFace 512-d cosine similarity values into standard
    biometric confidence percentages:
    - sim <= 0.15: Mismatch (0% - 25%)
    - sim in (0.15, 0.28): Borderline / Low confidence (25% - 50%)
    - sim in (0.28, 0.38): Moderate match (50% - 80%)
    - sim in (0.38, 0.48): High match (80% - 95%)
    - sim >= 0.48: Identical match (95% - 100%)
    """
    if sim <= 0.15:
        return max(0.0, (sim / 0.15) * 25.0)
    elif sim <= 0.28:
        return 25.0 + ((sim - 0.15) / 0.13) * 25.0
    elif sim <= 0.38:
        return 50.0 + ((sim - 0.28) / 0.10) * 30.0
    elif sim <= 0.48:
        return 80.0 + ((sim - 0.38) / 0.10) * 15.0
    else:
        return min(100.0, 95.0 + ((sim - 0.48) / 0.52) * 5.0)


def match_faces(id_photo_path: str, selfie_path: str) -> dict:
    id_embedding = _get_embedding(id_photo_path)
    selfie_embedding = _get_embedding(selfie_path)

    if id_embedding is None or selfie_embedding is None:
        return {
            "face_match_score": 0.0,
            "raw_similarity": 0.0,
            "note": "Face not detected in one or both images"
        }

    raw_similarity = float(np.dot(id_embedding, selfie_embedding))
    calibrated_score = round(calibrate_cosine_similarity(raw_similarity), 2)

    return {
        "face_match_score": calibrated_score,
        "raw_similarity": round(raw_similarity, 4),
        "note": "OK"
    }


def compare_faces(id_photo_path: str, selfie_path: str) -> float:
    """Helper for passenger re-verification returning float match score directly."""
    res = match_faces(id_photo_path, selfie_path)
    return res.get("face_match_score", 0.0)