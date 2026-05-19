"""
DrishtiAI — Multi-Model Inference Pipeline
============================================
Runs all 5 models in parallel and returns a comparative analysis.
Used for the research/benchmark feature of the application.

Returns:
  - Per-model predictions, confidence, timing
  - Ensemble weighted vote
  - Disagreement analysis
  - Statistical summary
"""

import time
import cv2
import torch
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
import logging

from .multi_model_loader import load_all_models, load_model, MODEL_CONFIGS, DEVICE
from .preprocess import preprocess_from_bgr

logger = logging.getLogger(__name__)

# ── Performance Benchmarks (from training/test set) ───────────────────────────
BENCHMARK_RESULTS = {
    "ResNet18": {
        "accuracy": 98.255,
        "f1": 0.9825,
        "auc": 0.9981,
        "precision": 98.33,
        "recall": 98.18,
        "fpr": 1.67,
        "fnr": 1.82,
        "params_m": 11.7,
        "inference_ms": 12,
        "size_mb": 44.7,
    },
    "EfficientNet": {
        "accuracy": 98.49,
        "f1": 0.9848,
        "auc": 0.9973,
        "precision": 98.91,
        "recall": 98.06,
        "fpr": 1.08,
        "fnr": 1.94,
        "params_m": 5.3,
        "inference_ms": 18,
        "size_mb": 20.4,
    },
    "MobileNetV2": {
        "accuracy": 98.315,
        "f1": 0.9831,
        "auc": 0.9968,
        "precision": 98.40,
        "recall": 98.23,
        "fpr": 1.60,
        "fnr": 1.77,
        "params_m": 3.4,
        "inference_ms": 8,
        "size_mb": 13.6,
    },
    "DenseNet121": {
        "accuracy": 98.615,
        "f1": 0.9861,
        "auc": 0.9979,
        "precision": 98.78,
        "recall": 98.45,
        "fpr": 1.22,
        "fnr": 1.55,
        "params_m": 8.0,
        "inference_ms": 22,
        "size_mb": 30.8,
    },
    "CustomCNN": {
        "accuracy": 94.57,
        "f1": 0.9452,
        "auc": 0.9877,
        "precision": 95.45,
        "recall": 93.60,
        "fpr": 4.46,
        "fnr": 6.40,
        "params_m": 2.1,
        "inference_ms": 5,
        "size_mb": 8.2,
    },
}

MODEL_ORDER = ["ResNet18", "EfficientNet", "MobileNetV2", "DenseNet121", "CustomCNN"]
# Weights for ensemble based on validation AUC
ENSEMBLE_WEIGHTS = {
    "ResNet18": 0.22,
    "EfficientNet": 0.20,
    "MobileNetV2": 0.18,
    "DenseNet121": 0.25,
    "CustomCNN": 0.15,
}


def _run_single_model(model_name: str, tensor: torch.Tensor) -> dict:
    """Run inference on a single model and return result dict."""
    t0 = time.perf_counter()
    try:
        model = load_model(model_name)
        with torch.no_grad():
            output = model(tensor)
            probs = torch.softmax(output, dim=1)[0]
        p_fake = float(probs[1].item())
        p_real = float(probs[0].item())
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

        return {
            "model": model_name,
            "p_fake": round(p_fake, 4),
            "p_real": round(p_real, 4),
            "prediction": "FAKE" if p_fake >= 0.5 else "REAL",
            "confidence": round(max(p_fake, p_real) * 100, 2),
            "inference_ms": elapsed_ms,
            "error": None,
        }
    except Exception as e:
        logger.error(f"[{model_name}] Inference failed: {e}")
        return {
            "model": model_name,
            "p_fake": 0.5,
            "p_real": 0.5,
            "prediction": "UNKNOWN",
            "confidence": 0.0,
            "inference_ms": 0,
            "error": str(e),
        }


def run_all_models(face_bgr: np.ndarray) -> dict:
    """
    Run all 5 models on the given face crop and return comparative results.

    Args:
        face_bgr: BGR numpy array of face crop

    Returns:
        Comprehensive comparison dict with per-model results + ensemble
    """
    t_total = time.perf_counter()

    # Preprocess once, share tensor
    tensor = preprocess_from_bgr(face_bgr)

    # Run all models (ThreadPoolExecutor for parallel execution)
    results = {}
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(_run_single_model, name, tensor): name
            for name in MODEL_ORDER
        }
        for future in as_completed(futures):
            result = future.result()
            results[result["model"]] = result

    # ── Ensemble weighted vote ────────────────────────────────────────────────
    ensemble_fake_score = sum(
        results[m]["p_fake"] * ENSEMBLE_WEIGHTS[m]
        for m in MODEL_ORDER if m in results
    )
    ensemble_prediction = "FAKE" if ensemble_fake_score >= 0.5 else "REAL"
    ensemble_confidence = round(max(ensemble_fake_score, 1 - ensemble_fake_score) * 100, 2)

    # ── Agreement analysis ────────────────────────────────────────────────────
    predictions = [results[m]["prediction"] for m in MODEL_ORDER if m in results]
    fake_votes = predictions.count("FAKE")
    real_votes = predictions.count("REAL")
    agreement_pct = round(max(fake_votes, real_votes) / len(predictions) * 100, 1)

    if fake_votes == len(predictions):
        consensus = "unanimous_fake"
    elif real_votes == len(predictions):
        consensus = "unanimous_real"
    elif fake_votes > real_votes:
        consensus = "majority_fake"
    elif real_votes > fake_votes:
        consensus = "majority_real"
    else:
        consensus = "split"

    # ── Statistical summary ───────────────────────────────────────────────────
    fake_probs = [results[m]["p_fake"] for m in MODEL_ORDER if m in results]
    mean_fake = round(float(np.mean(fake_probs)), 4)
    std_fake = round(float(np.std(fake_probs)), 4)
    max_fake = round(float(np.max(fake_probs)), 4)
    min_fake = round(float(np.min(fake_probs)), 4)

    # ── Model-level trust scores ──────────────────────────────────────────────
    # Combine prediction confidence with benchmark accuracy
    trust_scores = {}
    for m in MODEL_ORDER:
        if m in results:
            bench_acc = BENCHMARK_RESULTS[m]["accuracy"] / 100
            model_conf = results[m]["confidence"] / 100
            trust_scores[m] = round(0.6 * bench_acc + 0.4 * model_conf, 4)

    total_ms = round((time.perf_counter() - t_total) * 1000, 1)

    return {
        "models": {m: results[m] for m in MODEL_ORDER if m in results},
        "ensemble": {
            "prediction": ensemble_prediction,
            "confidence": ensemble_confidence,
            "fake_score": round(ensemble_fake_score, 4),
        },
        "agreement": {
            "consensus": consensus,
            "agreement_pct": agreement_pct,
            "fake_votes": fake_votes,
            "real_votes": real_votes,
            "total_models": len(predictions),
        },
        "statistics": {
            "mean_fake_prob": mean_fake,
            "std_fake_prob": std_fake,
            "max_fake_prob": max_fake,
            "min_fake_prob": min_fake,
            "range": round(max_fake - min_fake, 4),
        },
        "trust_scores": trust_scores,
        "total_inference_ms": total_ms,
        "best_model": "DenseNet121",
        "benchmark": BENCHMARK_RESULTS,
    }


def run_single_model_inference(model_name: str, face_bgr: np.ndarray) -> dict:
    """Run inference with a specific model only."""
    tensor = preprocess_from_bgr(face_bgr)
    return _run_single_model(model_name, tensor)


def get_research_data() -> dict:
    """Return static benchmark/research data for the research page."""
    return {
        "models": MODEL_CONFIGS,
        "benchmark": BENCHMARK_RESULTS,
        "training": {
            "dataset": "200K Real vs AI Visuals Dataset",
            "train_size": 160000,
            "val_size": 20000,
            "test_size": 20000,
            "epochs": 10,
            "batch_size": 64,
            "optimizer": "Adam",
            "lr": 0.0001,
            "img_size": 64,
            "classes": ["FAKE", "REAL"],
        },
        "best_model": "DenseNet121",
        "ensemble_weights": ENSEMBLE_WEIGHTS,
        "model_order": MODEL_ORDER,
    }
