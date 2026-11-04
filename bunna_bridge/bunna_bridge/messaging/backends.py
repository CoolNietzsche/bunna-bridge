"""
SMS gateways. Choose with the SMS_BACKEND setting:

- "log" (default): nothing leaves the server; messages are stored and logged.
  Safe for development and for running before a gateway contract exists.
- "africastalking": Africa's Talking bulk SMS (covers Ethio telecom and Safaricom Ethiopia).
  Needs SMS_AT_USERNAME, SMS_AT_API_KEY, optional SMS_SENDER_ID.
- "http": any local aggregator with a simple JSON API. POSTs
  {"to": ..., "message": ..., "sender": ...} to SMS_HTTP_URL with
  "Authorization: Bearer SMS_HTTP_TOKEN".
"""

import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)
TIMEOUT = 10


class SmsError(Exception):
    pass


class LogBackend:
    name = "log"

    def send(self, to, body):
        logger.info("SMS (log backend) to %s: %s", to, body)
        return "log"


class AfricasTalkingBackend:
    name = "africastalking"
    URL = "https://api.africastalking.com/version1/messaging"

    def send(self, to, body):
        data = {"username": settings.SMS_AT_USERNAME, "to": to, "message": body}
        if settings.SMS_SENDER_ID:
            data["from"] = settings.SMS_SENDER_ID
        req = urllib.request.Request(  # noqa: S310 - fixed https URL
            self.URL, data=urllib.parse.urlencode(data).encode(), method="POST",
            headers={"apiKey": settings.SMS_AT_API_KEY, "Accept": "application/json",
                     "Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:  # noqa: S310
                payload = json.loads(resp.read().decode())
        except Exception as exc:
            raise SmsError(str(exc)[:300]) from exc
        recipients = payload.get("SMSMessageData", {}).get("Recipients", [])
        if not recipients or recipients[0].get("status") not in ("Success", "Sent", "Queued"):
            raise SmsError(json.dumps(payload)[:300])
        return recipients[0].get("messageId", "")


class HttpBackend:
    name = "http"

    def send(self, to, body):
        url = settings.SMS_HTTP_URL
        if not url.startswith("https://"):
            raise SmsError("SMS_HTTP_URL must be an https:// URL.")
        req = urllib.request.Request(  # noqa: S310 - https enforced above
            url, data=json.dumps({"to": to, "message": body, "sender": settings.SMS_SENDER_ID}).encode(),
            method="POST",
            headers={"Authorization": f"Bearer {settings.SMS_HTTP_TOKEN}", "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:  # noqa: S310
                text = resp.read().decode()[:200]
        except Exception as exc:
            raise SmsError(str(exc)[:300]) from exc
        try:
            return str(json.loads(text).get("id", ""))
        except (ValueError, AttributeError):
            return ""


BACKENDS = {b.name: b for b in (LogBackend, AfricasTalkingBackend, HttpBackend)}


def get_backend():
    cls = BACKENDS.get(getattr(settings, "SMS_BACKEND", "log"), LogBackend)
    return cls()
