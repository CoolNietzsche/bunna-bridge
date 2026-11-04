from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Membership
from .models import Organization

# Account types that represent a business and get an organisation.
ORG_ROLES = {"exporter", "importer", "buyer", "roaster", "cooperative", "forwarder"}


def create_personal_org(user):
    """Give a business account its own organisation with the user as owner."""
    name = (
        getattr(user, "company_name", "")
        or getattr(user, "cooperative", "")
        or user.get_full_name()
        or user.email
    )
    org = Organization.objects.create(name=name[:200], kind=user.role, country=getattr(user, "country", "") or "")
    Membership.objects.create(organization=org, user=user, role=Membership.Role.OWNER)
    return org


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_organization(sender, instance, created, **kwargs):
    if kwargs.get("raw") or not created:
        return
    if getattr(instance, "_skip_org_creation", False):
        return  # joining an existing organisation through an invitation
    if instance.role in ORG_ROLES and not Membership.objects.filter(user=instance).exists():
        create_personal_org(instance)
