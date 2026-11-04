from django.db.models.signals import post_save
from django.dispatch import receiver

from bunna_bridge.lots.models import Offer


@receiver(post_save, sender=Offer)
def contract_for_accepted_offer(sender, instance, **kwargs):
    """An accepted offer becomes a draft contract the exporter completes and both parties sign (T-1)."""
    if kwargs.get("raw") or instance.status != "accepted":
        return
    from .services import create_from_offer

    create_from_offer(instance)
