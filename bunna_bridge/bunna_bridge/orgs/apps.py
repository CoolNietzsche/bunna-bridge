from django.apps import AppConfig


class OrgsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "bunna_bridge.orgs"
    label = "orgs"
    verbose_name = "Organisations and teams"

    def ready(self):
        import bunna_bridge.orgs.signals  # noqa: F401
