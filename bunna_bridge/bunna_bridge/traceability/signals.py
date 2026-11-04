"""Keep lot gates and risk registers in step with the traceability records."""

from django.db.models.signals import post_delete
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import LotSource
from .models import Plot
from .models import ProducerConsent


def _resave_lot(lot_id):
    from bunna_bridge.lots.models import CoffeeLot

    lot = CoffeeLot.objects.filter(pk=lot_id).first()
    if lot is not None:
        lot.save()


@receiver([post_save, post_delete], sender=LotSource)
def lot_source_changed(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return
    _resave_lot(instance.lot_id)


@receiver(post_save, sender=Plot)
def plot_changed(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return
    from .due_diligence import refresh_lots_for_plot

    refresh_lots_for_plot(instance)


@receiver([post_save, post_delete], sender=ProducerConsent)
def consent_changed(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return
    from bunna_bridge.lots.models import CoffeeLot

    for lot in CoffeeLot.objects.filter(
        sources__plot__producer_id=instance.producer_id,
    ).distinct():
        lot.save()
