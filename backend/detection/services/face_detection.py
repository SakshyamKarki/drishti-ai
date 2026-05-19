"""
DrishtiAI — Face Detection Service
Haar Cascade + NMS-based face detection with NoFaceError for strict mode.
"""
import cv2
import numpy as np
from typing import Optional, Tuple, List

_FRONTAL     = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
_FRONTAL_ALT = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_alt2.xml")
_PROFILE     = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")


class NoFaceError(ValueError):
    pass


class FaceQualityError(ValueError):
    pass


def _iou(a, b):
    ax1,ay1,aw,ah = a; ax2,ay2 = ax1+aw,ay1+ah
    bx1,by1,bw,bh = b; bx2,by2 = bx1+bw,by1+bh
    ix1,iy1 = max(ax1,bx1), max(ay1,by1)
    ix2,iy2 = min(ax2,bx2), min(ay2,by2)
    inter = max(0,ix2-ix1)*max(0,iy2-iy1)
    union = aw*ah + bw*bh - inter
    return float(inter/(union+1e-6))


def _nms(faces, iou_threshold=0.40):
    if len(faces) <= 1: return faces
    faces = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)
    kept = []
    for c in faces:
        if all(_iou(c[:4],k[:4]) < iou_threshold for k in kept):
            kept.append(c)
    return kept


def detect_and_crop_face(
    image_path: str,
    min_sharpness: float = 15.0,
    min_face_ratio: float = 0.02,
    pad_ratio: float = 0.15,
) -> Tuple[Optional[np.ndarray], dict]:
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot load: {image_path}")
    ih, iw = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(2.0, (8,8))
    gray_eq = clahe.apply(gray)

    all_faces = []
    for cas, name, sc, mn in [
        (_FRONTAL,"frontal",1.1,5),
        (_FRONTAL_ALT,"alt",1.1,4),
        (_PROFILE,"profile",1.1,4),
    ]:
        det = cas.detectMultiScale(gray_eq,scaleFactor=sc,minNeighbors=mn,minSize=(50,50))
        if len(det):
            for (x,y,w,h) in det:
                all_faces.append((x,y,w,h,name))

    if not all_faces:
        # Small-image retry at 75% scale
        sg = cv2.resize(gray_eq, (int(iw*.75), int(ih*.75)))
        det = _FRONTAL.detectMultiScale(sg,1.05,3,minSize=(30,30))
        if len(det):
            for (x,y,w,h) in det:
                all_faces.append((int(x/.75),int(y/.75),int(w/.75),int(h/.75),"rescaled"))

    if not all_faces:
        raise NoFaceError(
            "No human face detected. Please submit a clear profile photo with a visible face."
        )

    all_faces = _nms(all_faces)
    # Pick largest
    best = sorted(all_faces, key=lambda f: f[2]*f[3], reverse=True)[0]
    x,y,w,h,used = best

    ratio = (w*h)/(iw*ih)
    if ratio < min_face_ratio:
        raise FaceQualityError(f"Face too small (ratio={ratio:.3f}). Please use a higher-resolution image.")

    sharpness = float(cv2.Laplacian(gray[y:y+h,x:x+w], cv2.CV_64F).var())

    px = int(w*pad_ratio); py = int(h*pad_ratio)
    x1 = max(0,x-px); y1 = max(0,y-py)
    x2 = min(iw,x+w+px); y2 = min(ih,y+h+py)
    face_crop = img[y1:y2, x1:x2]

    meta = {
        "found": True, "sharpness": round(sharpness,2),
        "face_ratio": round(ratio,4), "cascade_used": used,
        "n_faces": len(all_faces),
    }
    return face_crop, meta


def get_face_landmarks_simple(gray_face: np.ndarray) -> dict:
    h, w = gray_face.shape[:2]
    left  = gray_face[:, :w//2]
    right = cv2.flip(gray_face[:, w//2:], 1)
    mw = min(left.shape[1], right.shape[1])
    diff = np.abs(left[:,:mw].astype(np.float32) - right[:,:mw].astype(np.float32))
    symmetry = float(1.0 - diff.mean()/255.0)
    return {
        "landmark_symmetry_score": round(symmetry,4),
        "upper_texture_std": round(float(gray_face[:h//2].std()),4),
        "lower_texture_std": round(float(gray_face[h//2:].std()),4),
    }
