from django.contrib import admin

from .models import SmsMessage


@admin.register(SmsMessage)
class SmsMessageAdmin(admin.ModelAdmin):
    list_display = ["created_at", "kind", "to", "status", "backend", "language"]
    list_filter = ["status", "kind", "backend", "language"]
    search_fields = ["to", "raw_to", "body"]
    readonly_fields = [f.name for f in SmsMessage._meta.fields]  # noqa: SLF001
