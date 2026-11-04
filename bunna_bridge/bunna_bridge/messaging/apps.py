from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bunna_bridge.messaging"
    label = "messaging"
    verbose_name = "SMS messaging"

    def ready(self):
        import bunna_bridge.messaging.signals  # noqa: F401
