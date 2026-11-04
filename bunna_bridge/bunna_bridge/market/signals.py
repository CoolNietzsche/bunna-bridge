"""Saved-search alerts when a lot is newly listed on the marketplace (M-4)."""

from django.db import transaction
from django.db.models.signals import post_save
from django.db.models.signals import pre_save
from django.dispatch import receiver

from bunna_bridge.lots.models import CoffeeLot


@receiver(pre_save, sender=CoffeeLot)
def remember_status(sender, instance, **kwargs):
    instance._market_prev_status = (  # noqa: SLF001
        CoffeeLot.objects.filter(pk=instance.pk).values_list("status", flat=True).first() if instance.pk else None
    )


@receiver(post_save, sender=CoffeeLot)
def alert_new_listing(sender, instance, created, **kwargs):
    if kwargs.get("raw") or instance.status != "listed" or instance.archived_at:
        return
    if getattr(instance, "_market_prev_status", None) == "listed":
        return
    from .services import alert_for_new_listing

    transaction.on_commit(lambda: alert_for_new_listing(instance))
