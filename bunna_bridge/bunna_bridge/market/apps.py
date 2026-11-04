from django.apps import AppConfig


class MarketConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bunna_bridge.market"
    label = "market"
    verbose_name = "Marketplace growth"

    def ready(self):
        import bunna_bridge.market.signals  # noqa: F401
