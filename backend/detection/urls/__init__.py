"""
DrishtiAI — Detection URL Configuration
"""
from django.urls import path
from detection.views.detect_v3 import DetectionResultViewSet
from detection.views.comparison_view import (
    ResearchDataView,
    MultiModelComparisonView,
    SingleModelInferenceView,
    ModelBenchmarkView,
)

urlpatterns = [
    # ── Single-model detection (existing) ────────────────────────────────────
    path(
        "detection/",
        DetectionResultViewSet.as_view({"get": "list", "post": "create"}),
        name="detection-list",
    ),
    path(
        "detection/stats/",
        DetectionResultViewSet.as_view({"get": "stats"}),
        name="detection-stats",
    ),

    # ── Multi-model comparison (new) ──────────────────────────────────────────
    path(
        "compare/",
        MultiModelComparisonView.as_view(),
        name="multi-model-comparison",
    ),
    path(
        "compare/single/",
        SingleModelInferenceView.as_view(),
        name="single-model-inference",
    ),

    # ── Research & benchmark data ──────────────────────────────────────────────
    path(
        "research/",
        ResearchDataView.as_view(),
        name="research-data",
    ),
    path(
        "benchmark/",
        ModelBenchmarkView.as_view(),
        name="model-benchmark",
    ),
]
