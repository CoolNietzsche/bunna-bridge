from django.apps import AppConfig


class TradeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bunna_bridge.trade"
    label = "trade"
    verbose_name = "Trade execution"

    def ready(self):
        import bunna_bridge.trade.signals  # noqa: F401
