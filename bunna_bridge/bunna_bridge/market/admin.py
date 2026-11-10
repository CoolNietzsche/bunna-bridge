from django.contrib import admin

from .models import Article
from .models import Bid
from .models import Lead
from .models import SavedSearch
from .models import SelectEntry
from .models import SelectProgramme
from .models import StockOrder
from .models import WarehouseStock


class EntryInline(admin.TabularInline):
    model = SelectEntry
    extra = 0
    raw_id_fields = ["lot"]


@admin.register(SelectProgramme)
class ProgrammeAdmin(admin.ModelAdmin):
    list_display = ["name", "season", "status", "nominations_close", "auction_ends"]
    inlines = [EntryInline]


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ["entry", "bidder", "price_usd_per_kg", "created_at"]


@admin.register(WarehouseStock)
class StockAdmin(admin.ModelAdmin):
    list_display = ["lot", "warehouse", "partner", "bags_available", "bags_total", "price_eur_per_kg", "active"]


@admin.register(StockOrder)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "buyer", "partner", "warehouse", "status", "created_at"]


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ["user", "name", "alert", "last_alerted_at"]


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "kind", "region", "published_at"]
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["created_at", "name", "company", "role", "country", "volume", "status", "notified_at"]
    list_filter = ["status", "role", "country"]
    list_editable = ["status"]
    search_fields = ["name", "company", "email", "message"]
    readonly_fields = ["role", "name", "email", "company", "country", "phone", "volume", "message", "source",
                       "notified_at", "created_at"]
    fields = ["status", "notes", *readonly_fields]
    date_hierarchy = "created_at"
