"""DrishtiAI — Detection Result Model"""
from django.db import models
from django_currentuser.db.models import CurrentUserField


class DetectionResult(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class Verdict(models.TextChoices):
        FAKE = "FAKE", "Fake"
        REAL = "REAL", "Real"
        SUSPICIOUS = "SUSPICIOUS", "Suspicious"
        NO_FACE = "NO_FACE", "No Face"
        UNKNOWN = "UNKNOWN", "Unknown"

    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="detections"
    )
    image = models.ImageField(upload_to="detection/")
    heatmap = models.ImageField(upload_to="heatmaps/", null=True, blank=True)

    # Core results
    verdict = models.CharField(max_length=20, choices=Verdict.choices, default=Verdict.UNKNOWN)
    is_fake = models.BooleanField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    decision_score = models.FloatField(null=True, blank=True)

    # Multi-model results (JSON)
    model_results = models.JSONField(null=True, blank=True)
    ensemble_score = models.FloatField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    model_version = models.CharField(max_length=50, default="multi_v1")
    processing_time = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    created_by = CurrentUserField(
        related_name="detectionresult_created", on_update=False, null=True
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"[{self.pk}] {self.verdict} ({self.confidence_score}%) — {self.status}"
