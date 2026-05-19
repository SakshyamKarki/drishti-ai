"""
DrishtiAI — Multi-Model Loader
===============================
Loads and manages all 5 CNN models for comparative inference:
  1. ResNet18     (baseline, fast)
  2. EfficientNet (balanced)
  3. MobileNetV2  (lightweight)
  4. DenseNet121  (best accuracy)
  5. CustomCNN    (from-scratch architecture)

All models are cached as singletons for performance.
"""

import torch
import torch.nn as nn
from torchvision import models
from collections import OrderedDict
import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Model singletons ───────────────────────────────────────────────────────────
_models_cache = {}

MODEL_CONFIGS = {
    "ResNet18": {
        "filename": "ResNet18.pth",
        "params": "11.7M",
        "description": "Lightweight residual network with skip connections",
        "year": 2015,
    },
    "EfficientNet": {
        "filename": "EfficientNet.pth",
        "params": "5.3M",
        "description": "Compound scaling of depth, width & resolution",
        "year": 2019,
    },
    "MobileNetV2": {
        "filename": "MobileNetV2.pth",
        "params": "3.4M",
        "description": "Inverted residuals for mobile deployment",
        "year": 2018,
    },
    "DenseNet121": {
        "filename": "DenseNet121.pth",
        "params": "8.0M",
        "description": "Dense connections between all layers",
        "year": 2016,
    },
    "CustomCNN": {
        "filename": "CustomCNN.pth",
        "params": "2.1M",
        "description": "Custom architecture trained from scratch",
        "year": 2024,
    },
}


# ── Custom CNN Architecture ────────────────────────────────────────────────────
class CustomCNN(nn.Module):
    """
    Custom CNN built from scratch for deepfake detection.
    Architecture: 4 conv blocks + attention + classifier head.
    """
    def __init__(self, num_classes=2):
        super().__init__()

        self.block1 = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(inplace=True),
            nn.Conv2d(32, 32, 3, padding=1), nn.BatchNorm2d(32), nn.ReLU(inplace=True),
            nn.MaxPool2d(2), nn.Dropout2d(0.1),
        )
        self.block2 = nn.Sequential(
            nn.Conv2d(32, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, 3, padding=1), nn.BatchNorm2d(64), nn.ReLU(inplace=True),
            nn.MaxPool2d(2), nn.Dropout2d(0.15),
        )
        self.block3 = nn.Sequential(
            nn.Conv2d(64, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, 3, padding=1), nn.BatchNorm2d(128), nn.ReLU(inplace=True),
            nn.MaxPool2d(2), nn.Dropout2d(0.2),
        )
        self.block4 = nn.Sequential(
            nn.Conv2d(128, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, 3, padding=1), nn.BatchNorm2d(256), nn.ReLU(inplace=True),
            nn.MaxPool2d(2), nn.Dropout2d(0.25),
        )
        # Channel attention
        self.attention = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(256, 64), nn.ReLU(inplace=True),
            nn.Linear(64, 256), nn.Sigmoid(),
        )
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(256, 512), nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(512, 128), nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.block4(x)
        att = self.attention(x).unsqueeze(-1).unsqueeze(-1)
        x = x * att
        return self.classifier(x)


# ── Model Builders ─────────────────────────────────────────────────────────────
def _build_resnet18():
    model = models.resnet18(weights=None)
    model.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(model.fc.in_features, 2))
    return model


def _build_efficientnet():
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(in_features, 2))
    return model


def _build_mobilenetv2():
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(nn.Dropout(0.2), nn.Linear(in_features, 2))
    return model


def _build_densenet121():
    model = models.densenet121(weights=None)
    in_features = model.classifier.in_features
    model.classifier = nn.Sequential(nn.Dropout(0.3), nn.Linear(in_features, 2))
    return model


def _build_custom_cnn():
    return CustomCNN(num_classes=2)


BUILDERS = {
    "ResNet18": _build_resnet18,
    "EfficientNet": _build_efficientnet,
    "MobileNetV2": _build_mobilenetv2,
    "DenseNet121": _build_densenet121,
    "CustomCNN": _build_custom_cnn,
}


def load_model(model_name: str) -> nn.Module:
    """Load and cache a single model by name."""
    if model_name in _models_cache:
        return _models_cache[model_name]

    model_config = MODEL_CONFIGS.get(model_name)
    if not model_config:
        raise ValueError(f"Unknown model: {model_name}")

    # Use pathlib.Path.resolve() for cross-platform absolute path (fixes Windows mixed-slash)
    from pathlib import Path
    ml_dir     = Path(getattr(settings, "ML_MODELS_DIR", "ml_models")).resolve()
    model_path = ml_dir / model_config["filename"]

    logger.debug(f"[{model_name}] Resolved model path: {model_path}")

    if not model_path.exists():
        raise FileNotFoundError(f"Model weights not found: {model_path}")

    model_path = str(model_path)   # str is safest for torch.load on all platforms
    model = BUILDERS[model_name]()

    try:
        state_dict = torch.load(model_path, map_location=DEVICE)
        # Handle DataParallel prefix
        new_state = OrderedDict()
        for k, v in state_dict.items():
            new_state[k.replace("module.", "")] = v
        model.load_state_dict(new_state, strict=False)
    except Exception as e:
        logger.error(f"Failed to load {model_name} weights: {e}")
        raise

    model.to(DEVICE).eval()
    _models_cache[model_name] = model
    logger.info(f"Loaded {model_name} on {DEVICE}")
    return model


def load_all_models() -> dict:
    """Load all 5 models and return as dict."""
    loaded = {}
    for name in MODEL_CONFIGS:
        try:
            loaded[name] = load_model(name)
        except Exception as e:
            logger.error(f"Could not load {name}: {e}")
    return loaded


def get_best_model() -> nn.Module:
    """Return the best-performing model (DenseNet121)."""
    return load_model("DenseNet121")