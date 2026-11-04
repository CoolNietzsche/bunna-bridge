from django.apps import AppConfig


class TraceabilityConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bunna_bridge.traceability"
    label = "traceability"
    verbose_name = "EUDR traceability"

    def ready(self):
        import bunna_bridge.traceability.signals  # noqa: F401
