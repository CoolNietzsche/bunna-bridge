"""Build and send SMS in the producer's language (English, Amharic, Afaan Oromo)."""

import re

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .backends import SmsError
from .backends import get_backend
from .models import SmsMessage

# NOTE: Amharic (am) and Afaan Oromo (om) texts need review by native speakers before go-live.
TEMPLATES = {
    "delivery_receipt": {
        "en": "Dear {name}, we received {weight} kg of coffee on {date}. Receipt no. {receipt}. — {buyer}",
        "am": "ውድ {name}፣ {date} {weight} ኪ.ግ ቡና ተረክበናል። የደረሰኝ ቁጥር {receipt}። — {buyer}",
        "om": "Kabajamoo {name}, guyyaa {date} buna kg {weight} isin irraa fudhanneerra. "
              "Lakk. nagahee {receipt}. — {buyer}",
    },
    "payment": {
        "en": "Dear {name}, {amount} Birr has been paid for receipt no. {receipt}. Ref {ref}. — {buyer}",
        "am": "ውድ {name}፣ ለደረሰኝ ቁጥር {receipt} {amount} ብር ተከፍሏል። ማጣቀሻ {ref}። — {buyer}",
        "om": "Kabajamoo {name}, nagahee lakk. {receipt}f qarshiin {amount} kaffalameera. Ragaa {ref}. — {buyer}",
    },
    "consent": {
        "en": "Dear {name}, you agreed that your farm location and name may be shared with EU buyers (EUDR). "
              "To withdraw, contact {buyer}.",
        "am": "ውድ {name}፣ የእርሻዎ ቦታና ስም ለአውሮፓ ገዢዎች (EUDR) እንዲጋራ ፈቃድ ሰጥተዋል። ለመሰረዝ {buyer}ን ያነጋግሩ።",
        "om": "Kabajamoo {name}, bakki fi maqaan qonnaa keessanii bitattoota Awurooppaa (EUDR) waliin akka "
              "qoodamu eeyyamtaniittu. Haquuf {buyer} quunnamaa.",
    },
}

ET_MOBILE = re.compile(r"^\+251[79]\d{8}$")


def normalize_et_phone(raw):
    """Return +2519XXXXXXXX / +2517XXXXXXXX, or '' if the number is not an Ethiopian mobile."""
    digits = re.sub(r"[^\d+]", "", raw or "")
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if digits.startswith("+"):
        number = digits
    elif digits.startswith("251"):
        number = "+" + digits
    elif digits.startswith("0") and len(digits) == 10:  # noqa: PLR2004
        number = "+251" + digits[1:]
    elif len(digits) == 9:  # noqa: PLR2004
        number = "+251" + digits
    else:
        return ""
    return number if ET_MOBILE.match(number) else ""


def render(kind, language, **context):
    texts = TEMPLATES[kind]
    return texts.get(language, texts["en"]).format(**context)


def _deliver(message_id):
    message = SmsMessage.objects.get(pk=message_id)
    if message.status != SmsMessage.Status.QUEUED:
        return message
    backend = get_backend()
    message.backend = backend.name
    try:
        message.provider_id = backend.send(message.to, message.body)[:100]
        message.status = SmsMessage.Status.SENT
        message.sent_at = timezone.now()
    except SmsError as exc:
        message.status = SmsMessage.Status.FAILED
        message.error = str(exc)[:300]
    message.save()
    return message


def queue_sms(kind, phone, language, context, producer=None, sent_by=None):
    """Record the message and send it after the current transaction commits."""
    if not getattr(settings, "SMS_ENABLED", True):
        return None
    to = normalize_et_phone(phone)
    message = SmsMessage.objects.create(
        to=to, raw_to=(phone or "")[:40], body=render(kind, language, **context), language=language, kind=kind,
        producer=producer, sent_by=sent_by,
        status=SmsMessage.Status.QUEUED if to else SmsMessage.Status.SKIPPED,
        error="" if to else "No valid Ethiopian mobile number.",
    )
    if to:
        if getattr(settings, "SMS_ASYNC", False):
            from .tasks import deliver_sms

            transaction.on_commit(lambda: deliver_sms.delay(message.pk))
        else:
            transaction.on_commit(lambda: _deliver(message.pk))
    return message
