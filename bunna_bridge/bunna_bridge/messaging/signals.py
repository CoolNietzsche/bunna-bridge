"""Send producers an SMS when coffee is received, when they are paid, and when consent is recorded."""

from django.db.models.signals import post_save
from django.db.models.signals import pre_save
from django.dispatch import receiver

from bunna_bridge.traceability.models import CherryDelivery
from bunna_bridge.traceability.models import ProducerConsent

from .service import queue_sms


def _buyer_name(user):
    return (getattr(user, "company_name", "") or user.get_full_name() or "Beersheba")[:40]


@receiver(pre_save, sender=CherryDelivery)
def remember_payment(sender, instance, **kwargs):
    previous = CherryDelivery.objects.filter(pk=instance.pk).values_list("amount_paid_etb", flat=True).first()
    instance._previous_paid = previous  # noqa: SLF001


@receiver(post_save, sender=CherryDelivery)
def delivery_sms(sender, instance, created, **kwargs):
    if kwargs.get("raw"):
        return
    p = instance.producer
    ctx = {"name": p.name.split()[0] if p.name else "", "buyer": _buyer_name(instance.owner),
           "receipt": instance.receipt_number}
    if created:
        queue_sms("delivery_receipt", p.phone, p.language,
                  {**ctx, "weight": f"{instance.weight_kg:g}", "date": f"{instance.delivered_on:%d/%m/%Y}"},
                  producer=p, sent_by=instance.recorded_by)
    paid = instance.amount_paid_etb
    previous = getattr(instance, "_previous_paid", None)
    if paid and paid > 0 and paid != previous:
        queue_sms("payment", p.phone, p.language,
                  {**ctx, "amount": f"{paid:,.2f}", "ref": instance.payment_reference or "-"},
                  producer=p, sent_by=instance.recorded_by)


@receiver(post_save, sender=ProducerConsent)
def consent_sms(sender, instance, created, **kwargs):
    if kwargs.get("raw") or not created or not instance.granted:
        return
    if instance.purpose != ProducerConsent.Purpose.EUDR_SHARING:
        return
    p = instance.producer
    queue_sms("consent", p.phone, p.language,
              {"name": p.name.split()[0] if p.name else "", "buyer": _buyer_name(p.owner)},
              producer=p, sent_by=instance.captured_by)
