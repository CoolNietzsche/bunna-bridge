from django.db.models.signals import post_delete
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Certification

# cert_type -> the CoffeeLot boolean it drives. Only these three cert types
# have a corresponding lot-level trust badge today.
LOT_BADGE_CERT_TYPES = {
    Certification.CertType.ORGANIC:             "is_organic",
    Certification.CertType.FAIR_TRADE:          "is_fair_trade",
    Certification.CertType.RAINFOREST_ALLIANCE: "is_rainforest_alliance",
}


def _recompute_lot_badge(holder, cert_type):
    field = LOT_BADGE_CERT_TYPES.get(cert_type)
    if not field:
        return
    from django.db.models import Q
    from bunna_bridge.lots.models import CoffeeLot  # avoid circular import

    today = timezone.localdate()
    # A cert with no expiry_date, or one expiring in the future, counts as valid.
    has_valid = holder.certifications.filter(cert_type=cert_type).filter(
        Q(expiry_date__isnull=True) | Q(expiry_date__gte=today),
    ).exists()
    CoffeeLot.objects.filter(exporter=holder).update(**{field: has_valid})


@receiver(post_save, sender=Certification)
def certification_saved(sender, instance, **kwargs):
    _recompute_lot_badge(instance.holder, instance.cert_type)


@receiver(post_delete, sender=Certification)
def certification_deleted(sender, instance, **kwargs):
    _recompute_lot_badge(instance.holder, instance.cert_type)
