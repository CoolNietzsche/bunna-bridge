"""
Marketplace growth (roadmap Phase 5).

SelectProgramme / SelectEntry / Bid   Beersheba Select: curated, jury-cupped lots, optional timed auction (M-1)
WarehouseStock / StockOrder           coffee held in an EU warehouse, sold in small bag lots (M-3)
SavedSearch / WatchItem               alerts and a watchlist that follows the user across devices (M-4)
Article                               education hub: origin reports, harvest updates, guides (M-7)

Availability states (M-2) live on CoffeeLot.availability; impact and
reliability scores (M-5, M-6) are computed in market/scores.py.
"""

import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class SelectProgramme(models.Model):
    class Status(models.TextChoices):
        NOMINATIONS = "nominations", "Taking nominations"
        JURY = "jury", "Jury cupping"
        CATALOGUE = "catalogue", "Catalogue published"
        AUCTION = "auction", "Auction live"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    season = models.CharField(max_length=20, help_text="Harvest season, e.g. 2026/27.")
    description = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NOMINATIONS)
    nominations_close = models.DateField()
    min_jury_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("86.00"))
    jury_session = models.ForeignKey("quality.CuppingSession", on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name="select_programmes")
    auction = models.BooleanField(default=True, help_text="Selected lots are sold by timed auction.")
    auction_starts = models.DateTimeField(null=True, blank=True)
    auction_ends = models.DateTimeField(null=True, blank=True)
    min_increment_usd = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.10"))
    extension_minutes = models.PositiveSmallIntegerField(
        default=3, help_text="A bid in the last minutes extends that lot's closing time (anti-sniping).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} {self.season}"


class SelectEntry(models.Model):
    class Status(models.TextChoices):
        NOMINATED = "nominated", "Nominated"
        INELIGIBLE = "ineligible", "Not eligible"
        IN_JURY = "in_jury", "With the jury"
        SELECTED = "selected", "Selected"
        NOT_SELECTED = "not_selected", "Not selected"
        SOLD = "sold", "Sold"
        UNSOLD = "unsold", "Unsold"

    programme = models.ForeignKey(SelectProgramme, on_delete=models.CASCADE, related_name="entries")
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.PROTECT, related_name="select_entries")
    nominated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    status = models.CharField(max_length=14, choices=Status.choices, default=Status.NOMINATED)
    eligibility_notes = models.CharField(max_length=500, blank=True)
    jury_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    rank = models.PositiveSmallIntegerField(null=True, blank=True)
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=2)
    starting_price_usd = models.DecimalField(max_digits=10, decimal_places=2)
    reserve_price_usd = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, help_text="Hidden minimum; unsold below it.",
    )
    closes_at = models.DateTimeField(null=True, blank=True, help_text="Per-lot close, extended by late bids.")
    winning_bid = models.ForeignKey("Bid", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["rank", "-jury_score", "created_at"]
        constraints = [models.UniqueConstraint(fields=["programme", "lot"], name="unique_lot_per_programme")]

    @property
    def high_bid(self):
        return self.bids.order_by("-price_usd_per_kg", "created_at").first()


class Bid(models.Model):
    entry = models.ForeignKey(SelectEntry, on_delete=models.CASCADE, related_name="bids")
    bidder = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="select_bids")
    price_usd_per_kg = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-price_usd_per_kg", "created_at"]


class WarehouseStock(models.Model):
    """Coffee from a Beersheba lot held by a partner importer in an EU warehouse (M-3)."""

    class Warehouse(models.TextChoices):
        ANTWERP = "antwerp", "Antwerp"
        HAMBURG = "hamburg", "Hamburg"
        TRIESTE = "trieste", "Trieste"
        LE_HAVRE = "le_havre", "Le Havre"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.PROTECT, related_name="eu_stock")
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="stock_held",
                                help_text="Importer holding the stock.")
    warehouse = models.CharField(max_length=10, choices=Warehouse.choices)
    warehouse_name = models.CharField(max_length=120, blank=True)
    bag_kg = models.DecimalField(max_digits=5, decimal_places=1, default=Decimal("30"))
    bags_total = models.PositiveIntegerField()
    bags_available = models.PositiveIntegerField()
    price_eur_per_kg = models.DecimalField(max_digits=8, decimal_places=2)
    min_bags = models.PositiveSmallIntegerField(default=1)
    landed_on = models.DateField(null=True, blank=True)
    dds_reference = models.CharField(max_length=80, blank=True, help_text="DDS filed for this stock (EUDR).")
    sample_available = models.BooleanField(default=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["warehouse", "-created_at"]


class StockOrder(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        RELEASED = "released", "Released from warehouse"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="stock_orders")
    partner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="stock_orders_received")
    warehouse = models.CharField(max_length=10, choices=WarehouseStock.Warehouse.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.REQUESTED)
    delivery = models.CharField(max_length=300, blank=True, help_text="Delivery address, or 'collect'.")
    notes = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def total_kg(self):
        return sum((line.bags * line.stock.bag_kg for line in self.lines.all()), Decimal("0"))

    @property
    def total_eur(self):
        return sum((line.bags * line.stock.bag_kg * line.price_eur_per_kg for line in self.lines.all()), Decimal("0"))


class StockOrderLine(models.Model):
    order = models.ForeignKey(StockOrder, on_delete=models.CASCADE, related_name="lines")
    stock = models.ForeignKey(WarehouseStock, on_delete=models.PROTECT, related_name="order_lines")
    bags = models.PositiveIntegerField()
    price_eur_per_kg = models.DecimalField(max_digits=8, decimal_places=2)


class WatchItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watch_items")
    lot = models.ForeignKey("lots.CoffeeLot", on_delete=models.CASCADE, related_name="watchers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "lot"], name="unique_watch")]


class SavedSearch(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_searches")
    name = models.CharField(max_length=80)
    filters = models.JSONField(default=dict)
    alert = models.BooleanField(default=True, help_text="Notify me when a new lot matches.")
    last_alerted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Article(models.Model):
    class Kind(models.TextChoices):
        ORIGIN = "origin", "Origin report"
        HARVEST = "harvest", "Harvest update"
        GUIDE = "guide", "Guide"
        WEBINAR = "webinar", "Webinar"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=160)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.ORIGIN)
    region = models.CharField(max_length=50, blank=True)
    summary = models.CharField(max_length=300)
    body = models.TextField(help_text="Plain text. Blank lines separate paragraphs; lines starting with '## ' are headings.")
    cover_image_url = models.URLField(blank=True)
    video_url = models.URLField(blank=True)
    event_at = models.DateTimeField(null=True, blank=True, help_text="Webinars: when it takes place.")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title


class Lead(models.Model):
    """An enquiry from the public website (landing page, /exporters, /buyers, /pricing, /contact).

    Saved first, then emailed to settings.LEADS_NOTIFY_EMAIL by tasks.notify_new_lead,
    so nothing is lost if the mail server is down. Worked in the Django admin.
    """

    class Role(models.TextChoices):
        EXPORTER = "exporter", "Exporter"
        COOPERATIVE = "cooperative", "Cooperative / union"
        IMPORTER = "importer", "Importer"
        ROASTER = "roaster", "Roaster"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        CLOSED = "closed", "Closed"

    role = models.CharField(max_length=12, choices=Role.choices)
    name = models.CharField(max_length=120)
    email = models.EmailField()
    company = models.CharField(max_length=160)
    country = models.CharField(max_length=80)
    phone = models.CharField(max_length=40, blank=True)
    volume = models.CharField(max_length=60, blank=True, help_text="Yearly volume, as the visitor chose it.")
    message = models.TextField(blank=True, max_length=4000)
    source = models.CharField(max_length=60, blank=True, help_text="Page the form was sent from.")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)
    notes = models.TextField(blank=True, help_text="Internal notes; never shown to the visitor.")
    notified_at = models.DateTimeField(null=True, blank=True, help_text="When the alert email was sent.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.company}) - {self.get_role_display()}"
