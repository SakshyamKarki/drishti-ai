"""
DrishtiAI — Image Preprocessing
=================================
Provides preprocessing for all 5 model architectures.
All use the same ImageNet normalisation but accept the same input size.
"""
import torch
import cv2
import numpy as np
from torchvision import transforms

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

_TRANSFORM = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def _bgr_to_rgb_safe(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Image array is None")
    if len(img.shape) == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    if img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def preprocess_from_bgr(face_bgr: np.ndarray) -> torch.Tensor:
    """
    Convert BGR face crop → normalised tensor on DEVICE.
    Applies mild CLAHE for lighting normalisation.
    """
    face_rgb = _bgr_to_rgb_safe(face_bgr)
    # Mild CLAHE
    lab = cv2.cvtColor(face_rgb, cv2.COLOR_RGB2LAB)
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    face_rgb = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
    return _TRANSFORM(face_rgb).unsqueeze(0).to(DEVICE)
