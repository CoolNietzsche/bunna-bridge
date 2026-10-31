"""Scheduled compliance jobs (see CELERY_BEAT_SCHEDULE in config/settings/base.py)."""

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

ALERT_DAYS = (30, 7, 1, 0)


def _alert(recipient, title, message, link):
    from .models import Notification

    Notification.objects.create(
        recipient=recipient,
        notification_type="compliance",
        title=title,
        message=message,
        link=link,
    )


def _expiry_phrase(days):
    if days == 0:
        return "expires today"
    if days == 1:
        return "expires tomorrow"
    return f"expires in {days} days"


@shared_task()
def daily_compliance_refresh():
    """
    1. Re-derive every gate on open lots (picks up expired certificates and
       licenses, floor-price changes).
    2. Recompute certification trust badges (certs expire with time).
    3. Send 30/7/1/0-day expiry reminders for lot documents, ECTA licenses
       and certifications.
    """
    from bunna_bridge.users.models import Certification
    from bunna_bridge.users.models import User
    from bunna_bridge.users.signals import _recompute_lot_badge

    from .models import CoffeeLot

    today = timezone.localdate()
    alert_dates = {today + timedelta(days=d): d for d in ALERT_DAYS}
    refreshed = 0
    alerts = 0

    for lot in CoffeeLot.objects.exclude(status="exported").select_related("exporter"):
        lot.save()
        refreshed += 1
        for field, label in (
            ("phyto_cert_expiry", "Phytosanitary certificate"),
            ("ecex_permit_expiry", "ECEX export permit"),
        ):
            expiry = getattr(lot, field)
            if expiry in alert_dates:
                _alert(
                    lot.exporter,
                    f"{label} {_expiry_phrase(alert_dates[expiry])}",
                    f"The {label.lower()} for lot {lot.lot_id} ({lot.name}) "
                    f"{_expiry_phrase(alert_dates[expiry])} ({expiry:%d %b %Y}).",
                    f"/lots/{lot.id}",
                )
                alerts += 1

    for user in User.objects.filter(ecta_license_expiry__in=list(alert_dates)):
        days = alert_dates[user.ecta_license_expiry]
        _alert(
            user,
            f"ECTA license {_expiry_phrase(days)}",
            f"Your ECTA export license {_expiry_phrase(days)}. Upload the renewal in Settings "
            "to keep your lots export-ready.",
            "/settings",
        )
        alerts += 1

    for cert in Certification.objects.select_related("holder"):
        _recompute_lot_badge(cert.holder, cert.cert_type)
        if cert.expiry_date in alert_dates:
            days = alert_dates[cert.expiry_date]
            _alert(
                cert.holder,
                f"{cert.get_cert_type_display()} certification {_expiry_phrase(days)}",
                f"Your {cert.get_cert_type_display()} certification {_expiry_phrase(days)}.",
                "/certifications",
            )
            alerts += 1

    return {"lots_refreshed": refreshed, "alerts_sent": alerts}
