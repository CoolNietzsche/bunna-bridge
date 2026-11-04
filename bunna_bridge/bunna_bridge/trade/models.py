"""
Trade execution (roadmap Phase 3).

Contract (T-1) ← accepted Offer
  ├─ ECTA registration fields + minimum-price check (T-2)
  ├─ ContractSample: pre-shipment / arrival samples, Claim (T-3)
  ├─ Shipment → ShipmentEvent milestones, ShipmentDocument checklist (T-4, T-5)
  ├─ Payment: money received and the NBE FX conversion (T-6)
  └─ Conversation / Message between buyer and exporter (T-7)
"""

import hashlib
import json
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from bunna_bridge.lots.validators import document_extension_validator
from bunna_bridge.lots.validators import validate_document_size

BAG_KG = Decimal("60")


class Contract(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SENT = "sent", "Sent for signature"
        SIGNED = "signed", "Signed by both parties"
        REGISTERED = "registered", "Registered with ECTA"
        SHIPPED = "shipped", "Shipped"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class Incoterm(models.TextChoices):
        FOB = "FOB", "FOB — Free on board"
        FCA = "FCA", "FCA — Free carrier"
        CFR = "CFR", "CFR — Cost and freight"
        CIF = "CIF", "CIF — Cost, insurance and freight"
        DAP = "DAP", "DAP — Delivered at place"

    class PaymentTerms(models.TextChoices):
        CAD = "cad", "Cash against documents (CAD)"
        LC = "lc", "Letter of credit (LC)"
        ADVANCE = "advance", "Advance payment"
        ADVANCE_CAD = "advance_cad", "Part advance, balance against documents"

    class TermsBasis(models.TextChoices):
        GCA = "gca", "Green Coffee Association (GCA) contract terms"
        ECF = "ecf", "European Coffee Federation (ECF) contract terms"
        CUSTOM = "custom", "Terms written in this contract"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=30, unique=True)
    offer = models.OneToOneField(
        "lots.Offer", on_delete=models.PROTECT, null=True, blank=True, related_name="contract",
    )
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.PROTECT, related_name="contracts")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="contracts_sold")
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="contracts_bought")

    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    price_usd_per_kg = models.DecimalField(max_digits=10, decimal_places=4)
    incoterm = models.CharField(max_length=3, choices=Incoterm.choices, default=Incoterm.FOB)
    named_place = models.CharField(max_length=100, default="Djibouti")
    shipment_from = models.DateField(null=True, blank=True)
    shipment_to = models.DateField(null=True, blank=True)
    payment_terms = models.CharField(max_length=12, choices=PaymentTerms.choices, default=PaymentTerms.CAD)
    advance_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    terms_basis = models.CharField(max_length=6, choices=TermsBasis.choices, default=TermsBasis.ECF)
    quality_spec = models.TextField(
        blank=True, help_text="Grade, process, screen size, moisture limit, cup profile the coffee must match.",
    )
    pss_required = models.BooleanField(default=True, help_text="Buyer must approve a pre-shipment sample.")
    destination = models.CharField(max_length=100, blank=True, help_text="Port or city of destination.")
    notes = models.TextField(blank=True)

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    terms_hash = models.CharField(max_length=64, blank=True)
    seller_signed_at = models.DateTimeField(null=True, blank=True)
    seller_signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    buyer_signed_at = models.DateTimeField(null=True, blank=True)
    buyer_signed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )

    # T-2 — ECTA contract registration
    ecta_registration_number = models.CharField(max_length=60, blank=True)
    ecta_registered_on = models.DateField(null=True, blank=True)
    ecta_floor_price_usd = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    ecta_floor_source = models.CharField(max_length=200, blank=True)

    cancelled_reason = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.number

    TERM_FIELDS = (
        "quantity_kg", "price_usd_per_kg", "incoterm", "named_place", "shipment_from", "shipment_to",
        "payment_terms", "advance_percent", "terms_basis", "quality_spec", "pss_required", "destination", "notes",
    )

    def compute_terms_hash(self):
        payload = {f: str(getattr(self, f)) for f in self.TERM_FIELDS}
        payload.update({"lot": str(self.lot_id), "seller": self.seller_id, "buyer": self.buyer_id,
                        "number": self.number})
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

    @property
    def value_usd(self):
        return (self.quantity_kg * self.price_usd_per_kg).quantize(Decimal("0.01"))

    @property
    def bags(self):
        return int((self.quantity_kg / BAG_KG).to_integral_value())

    @property
    def fully_signed(self):
        return bool(self.seller_signed_at and self.buyer_signed_at)

    @classmethod
    def next_number(cls):
        year = timezone.localdate().year
        prefix = f"BB-{year}-"
        last = cls.objects.filter(number__startswith=prefix).order_by("-number").values_list("number", flat=True).first()
        n = int(last.rsplit("-", 1)[1]) + 1 if last else 1
        return f"{prefix}{n:04d}"


class ContractSample(models.Model):
    """Type, pre-shipment (PSS) or arrival sample on a contract (T-3)."""

    class Kind(models.TextChoices):
        PSS = "pss", "Pre-shipment sample"
        ARRIVAL = "arrival", "Arrival sample"
        TYPE = "type", "Type / offer sample"

    class Status(models.TextChoices):
        SENT = "sent", "Sent"
        RECEIVED = "received", "Received"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="samples")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.SENT)
    sent_on = models.DateField(null=True, blank=True)
    courier = models.CharField(max_length=60, blank=True)
    tracking_number = models.CharField(max_length=80, blank=True)
    weight_g = models.PositiveIntegerField(default=300)
    cup_score = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    moisture_pct = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    buyer_notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    decided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]


class Claim(models.Model):
    """A buyer's claim after arrival (quality, weight, moisture, delay) (T-3)."""

    class Reason(models.TextChoices):
        QUALITY = "quality", "Quality below contract"
        WEIGHT = "weight", "Weight shortfall"
        MOISTURE = "moisture", "Moisture or damage"
        DELAY = "delay", "Late shipment"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACCEPTED = "accepted", "Accepted by exporter"
        REJECTED = "rejected", "Rejected by exporter"
        SETTLED = "settled", "Settled"

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name="claims")
    reason = models.CharField(max_length=10, choices=Reason.choices)
    description = models.TextField()
    amount_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    evidence = models.FileField(
        upload_to="trade/claims/", null=True, blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    resolution = models.TextField(blank=True)
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    raised_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-raised_at"]


class Shipment(models.Model):
    """Physical movement from the exporter's warehouse to the destination port (T-4)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(Contract, on_delete=models.PROTECT, related_name="shipments")
    forwarder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="shipments_forwarded",
        help_text="Freight forwarder account that may update milestones and documents.",
    )
    booking_number = models.CharField(max_length=60, blank=True)
    container_number = models.CharField(max_length=20, blank=True)
    seal_number = models.CharField(max_length=30, blank=True)
    shipping_line = models.CharField(max_length=80, blank=True)
    vessel = models.CharField(max_length=80, blank=True)
    voyage = models.CharField(max_length=30, blank=True)
    bl_number = models.CharField(max_length=60, blank=True)
    port_of_loading = models.CharField(max_length=80, default="Djibouti")
    port_of_discharge = models.CharField(max_length=80, blank=True)
    bags = models.PositiveIntegerField(null=True, blank=True)
    net_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    etd = models.DateField(null=True, blank=True, help_text="Estimated departure from port of loading.")
    eta = models.DateField(null=True, blank=True, help_text="Estimated arrival at port of discharge.")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    @property
    def last_event(self):
        return self.events.order_by("-happened_at", "-id").first()


class ShipmentEvent(models.Model):
    class Kind(models.TextChoices):
        BOOKED = "booked", "Space booked with shipping line"
        STUFFED = "stuffed", "Container stuffed at warehouse"
        TRUCKED = "trucked", "Truck left for Djibouti"
        AT_PORT = "at_port", "Arrived at Djibouti port"
        CUSTOMS = "customs", "Export customs cleared"
        LOADED = "loaded", "Loaded on vessel"
        DEPARTED = "departed", "Vessel departed"
        TRANSSHIPPED = "transshipped", "Transshipped"
        ARRIVED = "arrived", "Arrived at destination port"
        DELIVERED = "delivered", "Delivered to buyer"
        DELAYED = "delayed", "Delay reported"

    ORDER = ["booked", "stuffed", "trucked", "at_port", "customs", "loaded", "departed", "transshipped",
             "arrived", "delivered"]

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="events")
    kind = models.CharField(max_length=14, choices=Kind.choices)
    happened_at = models.DateTimeField(default=timezone.now)
    location = models.CharField(max_length=100, blank=True)
    note = models.CharField(max_length=300, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["happened_at", "id"]


class ShipmentDocument(models.Model):
    """One item on a shipment's export-document checklist (T-5)."""

    class Kind(models.TextChoices):
        ECTA_QUALITY = "ecta_quality", "ECTA quality certificate"
        PHYTO = "phyto", "Phytosanitary certificate"
        ORIGIN = "origin", "Certificate of origin"
        ICO_MARKS = "ico_marks", "ICO marks / export number"
        INVOICE = "invoice", "Commercial invoice"
        PACKING = "packing", "Packing list"
        CUSTOMS = "customs", "Customs export declaration"
        BL = "bl", "Bill of lading"
        WEIGHT = "weight", "Weight certificate"
        FUMIGATION = "fumigation", "Fumigation certificate"
        OTHER = "other", "Other"

    class Party(models.TextChoices):
        EXPORTER = "exporter", "Exporter"
        FORWARDER = "forwarder", "Freight forwarder"
        BUYER = "buyer", "Buyer"

    class Status(models.TextChoices):
        MISSING = "missing", "Missing"
        UPLOADED = "uploaded", "Uploaded"
        APPROVED = "approved", "Checked by buyer"
        REJECTED = "rejected", "Needs correction"
        NOT_NEEDED = "not_needed", "Not needed"

    DEFAULT_CHECKLIST = [
        ("ecta_quality", "exporter"), ("phyto", "exporter"), ("origin", "exporter"), ("ico_marks", "exporter"),
        ("invoice", "exporter"), ("packing", "exporter"), ("customs", "forwarder"), ("bl", "forwarder"),
        ("weight", "forwarder"),
    ]

    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name="documents")
    kind = models.CharField(max_length=14, choices=Kind.choices)
    responsible = models.CharField(max_length=10, choices=Party.choices, default=Party.EXPORTER)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.MISSING)
    number = models.CharField(max_length=80, blank=True)
    issued_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)
    file = models.FileField(
        upload_to="trade/documents/", null=True, blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    comment = models.CharField(max_length=300, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    uploaded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
        constraints = [models.UniqueConstraint(fields=["shipment", "kind"], name="unique_document_kind_per_shipment")]

    @property
    def is_expired(self):
        return bool(self.expires_on and self.expires_on < timezone.localdate())


class Payment(models.Model):
    """Money the exporter received for a contract, and the NBE conversion of it (T-6)."""

    class Kind(models.TextChoices):
        ADVANCE = "advance", "Advance"
        BALANCE = "balance", "Balance / against documents"
        LC = "lc", "Letter of credit"
        ADJUSTMENT = "adjustment", "Claim adjustment"

    contract = models.ForeignKey(Contract, on_delete=models.PROTECT, related_name="payments")
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.BALANCE)
    amount_usd = models.DecimalField(max_digits=12, decimal_places=2)
    received_on = models.DateField()
    bank = models.CharField(max_length=100, blank=True)
    reference = models.CharField(max_length=100, blank=True)
    converted_usd = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Part of this payment converted to Birr (NBE requires 50% of export proceeds).",
    )
    rate_etb_per_usd = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    converted_on = models.DateField(null=True, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["received_on", "id"]

    @property
    def converted_etb(self):
        if self.converted_usd is None or self.rate_etb_per_usd is None:
            return None
        return (self.converted_usd * self.rate_etb_per_usd).quantize(Decimal("0.01"))


class Conversation(models.Model):
    """Messages between a buyer and the exporter's team about one lot (and its contract) (T-7)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.CASCADE, related_name="conversations")
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="buyer_conversations")
    contract = models.ForeignKey(Contract, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name="conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]
        constraints = [models.UniqueConstraint(fields=["lot", "buyer"], name="unique_conversation_per_lot_buyer")]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    body = models.TextField()
    attachment = models.FileField(
        upload_to="trade/messages/", null=True, blank=True,
        validators=[document_extension_validator, validate_document_size],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class ConversationRead(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="reads")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    last_read_at = models.DateTimeField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["conversation", "user"], name="unique_read_marker")]
