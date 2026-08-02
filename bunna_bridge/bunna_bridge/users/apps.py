from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class UsersConfig(AppConfig):
    name = "bunna_bridge.users"
    verbose_name = _("Users")

    def ready(self):
        import bunna_bridge.users.signals  # noqa
