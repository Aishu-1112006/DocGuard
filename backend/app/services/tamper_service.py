import io
import base64
import cv2
import numpy as np
from PIL import Image, ImageChops, UnidentifiedImageError


def run_ela(image_path: str, quality: int = 90) -> dict:
    """
    Perform Error Level Analysis (ELA) and extract localized compression anomaly regions.
    Returns structured forensic data with real region coordinates for heatmap rendering.
    """
    try:
        original = Image.open(image_path).convert("RGB")
    except UnidentifiedImageError as exc:
        raise ValueError(
            "Could not read the uploaded file as an image. Please upload a valid JPG or PNG."
        ) from exc

    orig_w, orig_h = original.size
    buffer = io.BytesIO()
    original.save(buffer, "JPEG", quality=quality)
    buffer.seek(0)
    resaved = Image.open(buffer)

    diff = ImageChops.difference(original, resaved)
    diff_array = np.array(diff).astype(np.float32)

    max_error = diff_array.max()
    if max_error == 0:
        tamper_score = 0.0
    else:
        mean_error = diff_array.mean()
        tamper_score = float(min(100.0, (mean_error / max_error) * 100.0 * 6.5))

    # Amplify difference array for forensic visualization
    amplified = np.clip(diff_array * 15, 0, 255).astype(np.uint8)
    heatmap_img = Image.fromarray(amplified)
    heatmap_buffer = io.BytesIO()
    heatmap_img.save(heatmap_buffer, "PNG")
    heatmap_bytes = heatmap_buffer.getvalue()
    heatmap_base64 = base64.b64encode(heatmap_bytes).decode("utf-8")

    # Region extraction using OpenCV contours on amplified error intensity
    gray_diff = cv2.cvtColor(amplified, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray_diff, 120, 255, cv2.THRESH_BINARY)

    # Morphological dilation to group nearby pixels into cohesive region bounding boxes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    dilated = cv2.dilate(thresh, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    regions = []

    min_area = (orig_w * orig_h) * 0.002  # At least 0.2% of image area
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(cnt)
            region_mask = np.zeros_like(gray_diff)
            cv2.drawContours(region_mask, [cnt], -1, 255, -1)
            mean_val = float(np.mean(gray_diff[region_mask == 255])) if np.any(region_mask == 255) else 0.0
            region_score = round(min(1.0, mean_val / 255.0 * 1.5), 2)

            reason = "Localized compression inconsistency"
            if y < orig_h * 0.4 and x < orig_w * 0.4:
                reason = "Portrait region compression anomaly"
            elif y > orig_h * 0.7:
                reason = "MRZ / Bottom zone compression anomaly"
            elif x > orig_w * 0.5:
                reason = "Document field / stamp area anomaly"

            regions.append({
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "score": region_score,
                "reason": reason,
                "method": "ELA"
            })

    regions.sort(key=lambda r: r["score"], reverse=True)
    overall_forgery_prob = round(min(1.0, tamper_score / 100.0), 2)

    return {
        "tamper_score": round(tamper_score, 2),
        "overall_forgery_probability": overall_forgery_prob,
        "heatmap_available": True,
        "heatmap_png_bytes": heatmap_bytes,
        "heatmap_image_base64": f"data:image/png;base64,{heatmap_base64}",
        "regions": regions
    }