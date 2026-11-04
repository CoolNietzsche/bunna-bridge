"""Outgoing SMS to producers and field agents (roadmap O-6). Every message is kept as a record."""

from django.conf import settings
from django.db import models


class SmsMessage(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped (no valid number)"

    class Kind(models.TextChoices):
        DELIVERY_RECEIPT = "delivery_receipt", "Delivery receipt"
        PAYMENT = "payment", "Payment confirmation"
        CONSENT = "consent", "Consent confirmation"
        OTHER = "other", "Other"

    to = models.CharField(max_length=20, blank=True)
    raw_to = models.CharField(max_length=40, blank=True, help_text="Number as entered.")
    body = models.TextField()
    language = models.CharField(max_length=2, default="en")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.OTHER)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED)
    backend = models.CharField(max_length=30, blank=True)
    provider_id = models.CharField(max_length=100, blank=True)
    error = models.CharField(max_length=300, blank=True)
    producer = models.ForeignKey(
        "traceability.Producer", on_delete=models.SET_NULL, null=True, blank=True, related_name="sms_messages",
    )
    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} → {self.to or self.raw_to} [{self.status}]"
