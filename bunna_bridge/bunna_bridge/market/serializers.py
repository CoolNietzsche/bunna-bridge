from rest_framework import serializers

from .models import Article
from .models import SavedSearch
from .models import SelectEntry
from .models import SelectProgramme
from .models import StockOrder
from .models import WarehouseStock


def _name(u):
    return (u.company_name or u.get_full_name() or u.email) if u else None


class ProgrammeSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    entries_count = serializers.SerializerMethodField()
    selected_count = serializers.SerializerMethodField()

    class Meta:
        model = SelectProgramme
        fields = ["id", "name", "season", "description", "status", "status_label", "nominations_close",
                  "min_jury_score", "jury_session", "auction", "auction_starts", "auction_ends", "min_increment_usd",
                  "extension_minutes", "entries_count", "selected_count", "created_at"]
        read_only_fields = ["id", "status", "jury_session", "auction_starts", "auction_ends", "created_at"]

    def get_entries_count(self, obj):
        return obj.entries.count()

    def get_selected_count(self, obj):
        return obj.entries.filter(status__in=["selected", "sold", "unsold"]).count()


class EntrySerializer(serializers.ModelSerializer):
    lot_code = serializers.CharField(source="lot.lot_id", read_only=True)
    lot_name = serializers.CharField(source="lot.name", read_only=True)
    region = serializers.CharField(source="lot.get_region_display", read_only=True)
    processing = serializers.CharField(source="lot.get_processing_display", read_only=True)
    exporter_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    high_bid_usd = serializers.SerializerMethodField()
    bids_count = serializers.SerializerMethodField()
    next_min_bid_usd = serializers.SerializerMethodField()
    my_high_bid_usd = serializers.SerializerMethodField()
    i_am_winning = serializers.SerializerMethodField()
    reserve_met = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()

    class Meta:
        model = SelectEntry
        fields = ["id", "lot", "lot_code", "lot_name", "region", "processing", "exporter_name", "status", "status_label",
                  "eligibility_notes", "jury_score", "rank", "quantity_kg", "starting_price_usd", "closes_at",
                  "high_bid_usd", "bids_count", "next_min_bid_usd", "my_high_bid_usd", "i_am_winning", "reserve_met",
                  "photo"]

    def _user(self):
        r = self.context.get("request")
        return getattr(r, "user", None)

    def get_exporter_name(self, obj):
        return _name(obj.lot.exporter)

    def get_high_bid_usd(self, obj):
        h = obj.high_bid
        return str(h.price_usd_per_kg) if h else None

    def get_bids_count(self, obj):
        return obj.bids.count()

    def get_next_min_bid_usd(self, obj):
        from .services import minimum_next_bid

        return str(minimum_next_bid(obj))

    def get_my_high_bid_usd(self, obj):
        u = self._user()
        if not u or not u.is_authenticated:
            return None
        b = obj.bids.filter(bidder=u).order_by("-price_usd_per_kg").first()
        return str(b.price_usd_per_kg) if b else None

    def get_i_am_winning(self, obj):
        u = self._user()
        h = obj.high_bid
        return bool(u and u.is_authenticated and h and h.bidder_id == u.id)

    def get_reserve_met(self, obj):
        h = obj.high_bid
        if obj.reserve_price_usd is None:
            return True
        return bool(h and h.price_usd_per_kg >= obj.reserve_price_usd)

    def get_photo(self, obj):
        photos = obj.lot.farm_photos or []
        return photos[0] if photos else None


class StockSerializer(serializers.ModelSerializer):
    lot_code = serializers.CharField(source="lot.lot_id", read_only=True)
    lot_name = serializers.CharField(source="lot.name", read_only=True)
    region = serializers.CharField(source="lot.get_region_display", read_only=True)
    processing = serializers.CharField(source="lot.get_processing_display", read_only=True)
    score = serializers.DecimalField(source="lot.sca_score", max_digits=4, decimal_places=1, read_only=True)
    partner_name = serializers.SerializerMethodField()
    warehouse_label = serializers.CharField(source="get_warehouse_display", read_only=True)

    class Meta:
        model = WarehouseStock
        fields = ["id", "lot", "lot_code", "lot_name", "region", "processing", "score", "partner_name", "warehouse",
                  "warehouse_label", "warehouse_name", "bag_kg", "bags_total", "bags_available", "price_eur_per_kg",
                  "min_bags", "landed_on", "dds_reference", "sample_available", "active"]
        read_only_fields = ["id", "bags_available"]

    def get_partner_name(self, obj):
        return _name(obj.partner)

    def validate(self, attrs):
        if attrs.get("bags_total", 1) <= 0 or attrs.get("bag_kg", 1) <= 0 or attrs.get("price_eur_per_kg", 1) <= 0:
            raise serializers.ValidationError("Bags, bag size and price must be greater than zero.")
        return attrs


class OrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    warehouse_label = serializers.CharField(source="get_warehouse_display", read_only=True)
    lines = serializers.SerializerMethodField()
    total_kg = serializers.DecimalField(max_digits=12, decimal_places=1, read_only=True)
    total_eur = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = StockOrder
        fields = ["id", "buyer_name", "partner_name", "warehouse", "warehouse_label", "status", "status_label",
                  "delivery", "notes", "lines", "total_kg", "total_eur", "created_at"]

    def get_buyer_name(self, obj):
        return _name(obj.buyer)

    def get_partner_name(self, obj):
        return _name(obj.partner)

    def get_lines(self, obj):
        return [{"stock": str(line.stock_id), "lot_code": line.stock.lot.lot_id, "lot_name": line.stock.lot.name,
                 "bags": line.bags, "bag_kg": str(line.stock.bag_kg), "price_eur_per_kg": str(line.price_eur_per_kg)}
                for line in obj.lines.select_related("stock__lot")]


class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ["id", "name", "filters", "alert", "last_alerted_at", "created_at"]
        read_only_fields = ["id", "last_alerted_at", "created_at"]

    def validate_filters(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Filters must be an object.")
        allowed = {"q", "origin", "process", "grade", "cert", "compliance", "minAltitude", "minScore", "maxPrice",
                   "availability", "sort"}
        return {k: v for k, v in value.items() if k in allowed and v not in ("", None, 0)}


class ArticleSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ["id", "slug", "title", "kind", "kind_label", "region", "summary", "body", "cover_image_url",
                  "video_url", "event_at", "author_name", "published_at", "updated_at"]
        read_only_fields = ["id", "author_name", "updated_at"]

    def get_author_name(self, obj):
        return _name(obj.author)

    def validate_cover_image_url(self, v):
        if v and not v.startswith("https://"):
            raise serializers.ValidationError("Use an https:// link.")
        return v

    def validate_video_url(self, v):
        if v and not v.startswith("https://"):
            raise serializers.ValidationError("Use an https:// link.")
        return v
