"""
DrishtiAI — Comparison View
============================
API endpoint for multi-model comparison and research data.
"""

import os
import time
import logging
import cv2

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from detection.services.face_detection import detect_and_crop_face, NoFaceError, FaceQualityError
from detection.services.multi_model_inference import (
    run_all_models,
    run_single_model_inference,
    get_research_data,
    BENCHMARK_RESULTS,
    MODEL_ORDER,
)
from detection.services.multi_model_loader import MODEL_CONFIGS
from detection.models.detect import DetectionResult

logger = logging.getLogger(__name__)


class ResearchDataView(APIView):
    """Returns static research benchmark data — no auth required."""

    def get(self, request):
        data = get_research_data()
        return Response(data, status=status.HTTP_200_OK)


class MultiModelComparisonView(APIView):
    """
    POST an image → run all 5 models → return comparative analysis.
    """
    parser_classes = [MultiPartParser, FormParser]
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    MAX_FILE_SIZE_MB = 15

    def post(self, request):
        t_start = time.time()

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"error": "No image provided."}, status=400)

        if image_file.content_type not in self.ALLOWED_TYPES:
            return Response({"error": f"Unsupported type: {image_file.content_type}"}, status=400)

        if image_file.size > self.MAX_FILE_SIZE_MB * 1024 * 1024:
            return Response({"error": "File too large (max 15MB)."}, status=400)

        # Save temp file
        import tempfile
        suffix = os.path.splitext(image_file.name)[1] or ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in image_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            # Face detection
            try:
                face_bgr, face_meta = detect_and_crop_face(
                    tmp_path, min_sharpness=10.0, min_face_ratio=0.02
                )
            except NoFaceError as e:
                return Response({
                    "verdict": "NO_FACE",
                    "message": str(e),
                    "face_detected": False,
                }, status=200)
            except FaceQualityError as e:
                return Response({
                    "verdict": "NO_FACE",
                    "message": str(e),
                    "face_detected": False,
                }, status=200)

            # Run all 5 models
            comparison = run_all_models(face_bgr)
            comparison["face_meta"] = face_meta
            comparison["total_time_ms"] = round((time.time() - t_start) * 1000, 1)
            comparison["face_detected"] = True

            # Save to DB if authenticated
            if request.user.is_authenticated:
                instance = DetectionResult.objects.create(
                    user=request.user,
                    image=image_file,
                    is_fake=comparison["ensemble"]["prediction"] == "FAKE",
                    confidence_score=comparison["ensemble"]["confidence"],
                    status=DetectionResult.Status.COMPLETED,
                    model_version="multi_v1",
                )
                comparison["detection_id"] = instance.pk

            return Response(comparison, status=200)

        except Exception as e:
            logger.exception(f"Comparison failed: {e}")
            return Response({"error": f"Analysis failed: {str(e)}"}, status=500)
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


class SingleModelInferenceView(APIView):
    """
    POST image + model_name → run only that model.
    """
    parser_classes = [MultiPartParser, FormParser]
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}

    def post(self, request):
        image_file = request.FILES.get("image")
        model_name = request.data.get("model_name", "DenseNet121")

        if model_name not in MODEL_CONFIGS:
            return Response({"error": f"Unknown model: {model_name}"}, status=400)

        if not image_file or image_file.content_type not in self.ALLOWED_TYPES:
            return Response({"error": "Valid image required."}, status=400)

        import tempfile
        suffix = os.path.splitext(image_file.name)[1] or ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in image_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            face_bgr, face_meta = detect_and_crop_face(tmp_path)
            result = run_single_model_inference(model_name, face_bgr)
            result["face_meta"] = face_meta
            return Response(result, status=200)
        except NoFaceError as e:
            return Response({"verdict": "NO_FACE", "message": str(e)}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


class ModelBenchmarkView(APIView):
    """Returns performance benchmarks for all models."""

    def get(self, request):
        return Response({
            "benchmarks": BENCHMARK_RESULTS,
            "model_order": MODEL_ORDER,
            "configs": MODEL_CONFIGS,
        })
