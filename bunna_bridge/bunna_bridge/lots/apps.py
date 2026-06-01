from django.apps import AppConfig


class LotsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bunna_bridge.lots"

    def ready(self):
        import bunna_bridge.lots.signals  # noqa
