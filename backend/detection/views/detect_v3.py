"""
DrishtiAI — Detection View (Best Model: DenseNet121)
Handles single-image detection + history + stats endpoints.
"""
import time
import logging
import os
import tempfile

from rest_framework.viewsets import ViewSet
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg

from detection.models.detect import DetectionResult
from detection.serializers.detectserializer import DetectionResultSerializer
from detection.services.face_detection import detect_and_crop_face, NoFaceError, FaceQualityError
from detection.services.multi_model_inference import run_single_model_inference

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_MB = 15


class DetectionResultViewSet(ViewSet):
    parser_classes   = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def create(self, request):
        """POST /api/detection/  — analyse with DenseNet121 (best model)."""
        t0 = time.time()

        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"error": "No image provided."}, status=400)
        if image_file.content_type not in ALLOWED_TYPES:
            return Response({"error": f"Unsupported type: {image_file.content_type}"}, status=400)
        if image_file.size > MAX_MB * 1024 * 1024:
            return Response({"error": f"File too large (max {MAX_MB}MB)."}, status=400)

        # Save to temp file for face detection
        suffix = os.path.splitext(image_file.name)[1] or ".jpg"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            for chunk in image_file.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            # Face detection
            try:
                face_bgr, face_meta = detect_and_crop_face(tmp_path, min_sharpness=10.0, min_face_ratio=0.02)
            except NoFaceError as e:
                return Response({"verdict": "NO_FACE", "message": str(e), "face_detected": False}, 200)
            except FaceQualityError as e:
                return Response({"verdict": "NO_FACE", "message": str(e), "face_detected": False}, 200)

            # Run best model
            image_file.seek(0)  # rewind for ImageField save
            result = run_single_model_inference("DenseNet121", face_bgr)
            elapsed = round(time.time() - t0, 3)

            verdict  = result["prediction"]
            is_fake  = verdict == "FAKE"
            conf     = result["confidence"]

            # Persist
            instance = DetectionResult.objects.create(
                user=request.user,
                image=image_file,
                verdict=verdict,
                is_fake=is_fake,
                confidence_score=conf,
                processing_time=elapsed,
                status=DetectionResult.Status.COMPLETED,
                model_version="DenseNet121_v1",
                model_results={"DenseNet121": result},
            )

            return Response({
                "id":               instance.pk,
                "verdict":          verdict,
                "is_fake":          is_fake,
                "confidence":       conf,
                "p_fake":           result["p_fake"],
                "p_real":           result["p_real"],
                "risk_label":       "High Risk — Likely AI Generated" if is_fake else "Low Risk — Likely Authentic",
                "face_detected":    True,
                "face_meta":        face_meta,
                "processing_time":  elapsed,
                "model":            "DenseNet121",
                "image":            request.build_absolute_uri(instance.image.url),
            }, status=201)

        except Exception as e:
            logger.exception(f"Detection failed: {e}")
            try:
                DetectionResult.objects.create(
                    user=request.user, image=image_file,
                    status=DetectionResult.Status.FAILED,
                )
            except Exception:
                pass
            return Response({"error": f"Analysis failed: {str(e)}"}, status=500)
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    def list(self, request):
        """GET /api/detection/  — history for authenticated user."""
        qs = DetectionResult.objects.filter(user=request.user).order_by("-created_at")[:50]
        serializer = DetectionResultSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """GET /api/detection/stats/"""
        from django.utils import timezone
        from datetime import timedelta
        qs    = DetectionResult.objects.filter(user=request.user)
        total = qs.count()
        fake  = qs.filter(is_fake=True).count()
        real  = qs.filter(is_fake=False, verdict="REAL").count()
        avg   = qs.aggregate(avg=Avg("confidence_score"))["avg"] or 0
        week  = qs.filter(created_at__gte=timezone.now() - timedelta(days=7)).count()
        return Response({
            "total_checked":    total,
            "fake_count":       fake,
            "real_count":       real,
            "suspicious_count": total - fake - real,
            "avg_confidence":   round(avg, 1),
            "weekly_count":     week,
            "fake_rate":        round(fake / total * 100, 1) if total else 0,
        })
