"""
Sync endpoint for the offline field app (roadmap O-4).

POST /api/v1/traceability/field-sync/
    {"items": [
        {"client_id": "<uuid>", "type": "producer", "data": {...ProducerSerializer fields}},
        {"client_id": "<uuid>", "type": "plot", "data": {"producer": "client:<uuid>" | "<server id>", ...}},
        {"client_id": "<uuid>", "type": "consent", "data": {"producer": ..., "purpose": "...", "method": "...",
                                                         "evidence": "data:image/jpeg;base64,..."}},
        {"client_id": "<uuid>", "type": "delivery", "data": {"producer": ..., "receipt_number": ..., ...}}
    ]}

Items are applied in order, each in its own transaction, so one bad item
never blocks the rest. Each result says created / duplicate / error.
"""

import base64
import binascii
import uuid

from django.core.files.base import ContentFile
from django.db import IntegrityError
from django.db import transaction
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.orgs.access import same_team

from .models import FieldSyncRecord
from .models import Producer
from .serializers import ConsentSerializer
from .serializers import PlotSerializer
from .serializers import ProducerSerializer
from .supply_serializers import CherryDeliverySerializer
from .views import CanManageSupply

MAX_ITEMS = 200
MAX_PHOTO_BYTES = 5 * 1024 * 1024
PHOTO_TYPES = {"image/jpeg": "jpg", "image/png": "png"}


class SyncError(Exception):
    pass


def _decode_photo(data_url, name):
    if not data_url:
        return None
    try:
        header, b64 = data_url.split(",", 1)
        mime = header.split(";")[0].removeprefix("data:")
        raw = base64.b64decode(b64, validate=True)
    except (ValueError, binascii.Error) as exc:
        msg = "Photo could not be read."
        raise SyncError(msg) from exc
    if mime not in PHOTO_TYPES:
        msg = "Photos must be JPEG or PNG."
        raise SyncError(msg)
    if len(raw) > MAX_PHOTO_BYTES:
        msg = "Photo is larger than 5 MB."
        raise SyncError(msg)
    return ContentFile(raw, name=f"{name}.{PHOTO_TYPES[mime]}")


def _resolve(ref, user):
    """'client:<uuid>' → server id created earlier by the same user; anything else is passed through."""
    if isinstance(ref, str) and ref.startswith("client:"):
        record = FieldSyncRecord.objects.filter(client_id=ref.removeprefix("client:"), user=user).first()
        if record is None:
            msg = "Refers to an item that has not been synced yet."
            raise SyncError(msg)
        return record.object_id
    return ref


def _errors(serializer):
    parts = []
    for field, msgs in serializer.errors.items():
        text = " ".join(str(m) for m in (msgs if isinstance(msgs, list) else [msgs]))
        parts.append(text if field == "non_field_errors" else f"{field}: {text}")
    return "; ".join(parts)[:500]


def _apply(item, request):
    kind = item.get("type")
    data = dict(item.get("data") or {})
    user = request.user
    ctx = {"request": request}
    if kind == "producer":
        s = ProducerSerializer(data=data, context=ctx)
        if not s.is_valid():
            raise SyncError(_errors(s))
        return s.save(owner=user, created_by=user)
    if kind == "plot":
        data["producer"] = _resolve(data.get("producer"), user)
        photo = _decode_photo(data.pop("photo", None), f"plot-{item['client_id']}")
        s = PlotSerializer(data=data, context=ctx)
        if not s.is_valid():
            raise SyncError(_errors(s))
        plot = s.save(created_by=user)
        if photo:
            plot.photo.save(photo.name, photo, save=True)
        return plot
    if kind == "consent":
        producer_id = _resolve(data.pop("producer", None), user)
        producer = Producer.objects.filter(pk=producer_id).first()
        if producer is None or not same_team(user, producer.owner_id):
            msg = "Producer not found."
            raise SyncError(msg)
        evidence = _decode_photo(data.pop("evidence", None), f"consent-{item['client_id']}")
        if evidence:
            data["evidence"] = evidence
        s = ConsentSerializer(data=data, context=ctx)
        if not s.is_valid():
            raise SyncError(_errors(s))
        producer.consents.filter(purpose=s.validated_data["purpose"], revoked_at__isnull=True).update(
            revoked_at=timezone.now(),
        )
        return s.save(producer=producer, captured_by=user)
    if kind == "delivery":
        data["producer"] = _resolve(data.get("producer"), user)
        if data.get("plot"):
            data["plot"] = _resolve(data["plot"], user)
        s = CherryDeliverySerializer(data=data, context=ctx)
        if not s.is_valid():
            raise SyncError(_errors(s))
        return s.save(owner=user, recorded_by=user)
    msg = f"Unknown item type '{kind}'."
    raise SyncError(msg)


class FieldSyncView(APIView):
    permission_classes = [CanManageSupply]

    def post(self, request):
        items = request.data.get("items")
        if not isinstance(items, list) or not items:
            return Response({"detail": "Send a non-empty 'items' list."}, status=400)
        if len(items) > MAX_ITEMS:
            return Response({"detail": f"Send at most {MAX_ITEMS} items per request."}, status=400)
        results = []
        for item in items:
            client_id = str(item.get("client_id", ""))
            try:
                uuid.UUID(client_id)
            except ValueError:
                results.append({"client_id": client_id, "status": "error", "error": "Missing or invalid client_id."})
                continue
            existing = FieldSyncRecord.objects.filter(client_id=client_id).first()
            if existing is not None:
                if existing.user_id != request.user.id:
                    results.append({"client_id": client_id, "status": "error", "error": "Duplicate client_id."})
                else:
                    results.append({"client_id": client_id, "status": "duplicate", "id": existing.object_id})
                continue
            try:
                with transaction.atomic():
                    obj = _apply(item, request)
                    FieldSyncRecord.objects.create(client_id=client_id, kind=item.get("type", ""),
                                                   object_id=str(obj.pk), user=request.user)
                results.append({"client_id": client_id, "status": "created", "id": str(obj.pk)})
            except SyncError as exc:
                results.append({"client_id": client_id, "status": "error", "error": str(exc)})
            except IntegrityError:
                results.append({"client_id": client_id, "status": "error", "error": "Conflicts with an existing record."})
        return Response({"results": results})

