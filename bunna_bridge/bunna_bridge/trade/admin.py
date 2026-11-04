from django.contrib import admin

from .models import Claim
from .models import Contract
from .models import ContractSample
from .models import Conversation
from .models import Message
from .models import Payment
from .models import Shipment
from .models import ShipmentDocument
from .models import ShipmentEvent


class SampleInline(admin.TabularInline):
    model = ContractSample
    extra = 0


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ["number", "lot", "seller", "buyer", "quantity_kg", "price_usd_per_kg", "status", "created_at"]
    list_filter = ["status", "incoterm", "payment_terms"]
    search_fields = ["number", "lot__lot_id", "seller__email", "buyer__email", "ecta_registration_number"]
    readonly_fields = ["terms_hash", "seller_signed_at", "buyer_signed_at"]
    inlines = [SampleInline, PaymentInline]


class EventInline(admin.TabularInline):
    model = ShipmentEvent
    extra = 0


class DocumentInline(admin.TabularInline):
    model = ShipmentDocument
    extra = 0


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ["contract", "container_number", "vessel", "etd", "eta", "forwarder"]
    inlines = [EventInline, DocumentInline]


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = ["contract", "reason", "amount_usd", "status", "raised_at"]
    list_filter = ["status", "reason"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["lot", "buyer", "contract", "last_message_at"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["conversation", "sender", "created_at"]
