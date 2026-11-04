"""
Trade execution API (roadmap Phase 3) — all under /api/v1/trade/.

contracts/                              list (?status=, ?role=selling|buying)
contracts/<id>/                         detail + terms edit (seller, draft/sent)
contracts/<id>/send/ | sign/ | cancel/  signing flow
contracts/<id>/pdf/                     printable contract
contracts/<id>/floor-check/             ECTA minimum-price check
contracts/<id>/register/                record ECTA registration (blocked below the floor)
contracts/<id>/samples/                 PSS / arrival samples; samples/<sid>/decide/ by buyer
contracts/<id>/claims/                  buyer raises; claims/<cid>/respond/ by seller
contracts/<id>/shipments/               create (seller); shipments/<sid>/ update
shipments/<sid>/events/                 milestone (seller team or forwarder)
shipments/<sid>/documents/<did>/        upload / review / download a checklist document
contracts/<id>/payments/                payments received + FX conversion; money summary
conversations/                          inbox; POST {lot} to start one (buyer)
conversations/<id>/messages/            read / send
floor-prices/                           admin: list + CSV import
"""

import csv
import io
from datetime import date
from decimal import Decimal
from decimal import InvalidOperation

from django.db import transaction
from django.db.models import Q
from django.http import FileResponse
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import permissions
from rest_framework import status
from rest_framework.parsers import FormParser
from rest_framework.parsers import JSONParser
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import FloorPrice
from bunna_bridge.lots.views import is_admin
from bunna_bridge.lots.views import visible_lots
from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids

from . import services as svc
from .models import Claim
from .models import Contract
from .models import ContractSample
from .models import Conversation
from .models import ConversationRead
from .models import Message
from .models import Payment
from .models import Shipment
from .models import ShipmentDocument
from .models import ShipmentEvent
from .pdf import contract_pdf
from .serializers import ClaimSerializer
from .serializers import ContractListSerializer
from .serializers import ContractSerializer
from .serializers import ConversationSerializer
from .serializers import DocumentSerializer
from .serializers import EventSerializer
from .serializers import MessageSerializer
from .serializers import PaymentSerializer
from .serializers import SampleSerializer
from .serializers import ShipmentSerializer

IsAuth = permissions.IsAuthenticated


def _err(exc, code=400):
    return Response({"detail": str(exc)}, status=code)


def _contract(request, pk):
    contract = get_object_or_404(svc.contracts_for(request.user).select_related("lot", "seller", "buyer"), pk=pk)
    return contract, svc.party(request.user, contract)


def _date(value):
    if not value:
        return None
    d = parse_date(str(value))
    if d is None:
        raise svc.TradeError("Dates must be YYYY-MM-DD.")
    return d


# ── Contracts ────────────────────────────────────────────────────────────────

class ContractListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        qs = svc.contracts_for(request.user).select_related("lot", "seller", "buyer")
        role = request.query_params.get("role")
        ids = team_ids(request.user)
        if role == "selling":
            qs = qs.filter(seller_id__in=ids)
        elif role == "buying":
            qs = qs.filter(buyer_id__in=ids)
        if request.query_params.get("status"):
            qs = qs.filter(status=request.query_params["status"])
        if request.query_params.get("lot"):
            qs = qs.filter(lot_id=request.query_params["lot"])
        return Response(ContractListSerializer(qs, many=True).data)


class ContractDetailView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        contract, who = _contract(request, pk)
        data = ContractSerializer(contract).data
        ok, floor, message = svc.floor_check(contract)
        data.update({
            "my_party": who,
            "can_edit_terms": svc.can_edit_terms(request.user, contract),
            "floor_check": {"ok": ok, "message": message,
                            "floor_usd": str(floor.min_price_usd_per_kg) if floor else None},
            "pss_approved": svc.pss_approved(contract),
            "money": svc.money_summary(contract) if who in ("seller", "buyer", "admin") else None,
        })
        return Response(data)

    def patch(self, request, pk):
        contract, _ = _contract(request, pk)
        if not svc.can_edit_terms(request.user, contract):
            return _err("Only the exporter's sales team can change terms before both parties sign.", 403)
        serializer = ContractSerializer(contract, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            old_qty = contract.quantity_kg
            contract = serializer.save()
            if contract.quantity_kg != old_qty:
                lot = contract.lot
                lot.available_qty_kg = (lot.available_qty_kg or 0) + old_qty - contract.quantity_kg
                lot.save(update_fields=["available_qty_kg"])
            if contract.status == Contract.Status.SENT or contract.seller_signed_at:
                svc.terms_changed(contract)
        return self.get(request, pk)


class ContractActionView(APIView):
    permission_classes = [IsAuth]
    action = ""

    def post(self, request, pk):
        contract, _ = _contract(request, pk)
        try:
            if self.action == "send":
                svc.send_for_signature(request.user, contract)
            elif self.action == "sign":
                svc.buyer_sign(request.user, contract, request.data.get("terms_hash", ""))
            elif self.action == "cancel":
                svc.cancel(request.user, contract, request.data.get("reason", ""))
            elif self.action == "register":
                svc.register_with_ecta(request.user, contract, request.data.get("registration_number", ""),
                                       _date(request.data.get("registered_on")))
        except svc.TradeError as exc:
            return _err(exc)
        return ContractDetailView().get(request, pk)


class ContractPdfView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        contract, _ = _contract(request, pk)
        response = HttpResponse(contract_pdf(contract), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="Contract-{contract.number}.pdf"'
        return response


class FloorCheckView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        contract, _ = _contract(request, pk)
        ok, floor, message = svc.floor_check(contract)
        return Response({"ok": ok, "message": message, "floor_usd": str(floor.min_price_usd_per_kg) if floor else None,
                         "source": floor.source if floor else ""})


# ── T-3 samples and claims ───────────────────────────────────────────────────

class SampleListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        contract, _ = _contract(request, pk)
        return Response(SampleSerializer(contract.samples.all(), many=True).data)

    def post(self, request, pk):
        contract, who = _contract(request, pk)
        if who not in ("seller", "admin"):
            return _err("The exporter sends samples.", 403)
        if contract.status in (Contract.Status.CANCELLED, Contract.Status.DRAFT):
            return _err("Samples are sent once the contract has been sent to the buyer.")
        serializer = SampleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sample = serializer.save(contract=contract, created_by=request.user)
        svc.notify([contract.buyer], f"{sample.get_kind_display()} sent for {contract.number}",
                   f"Courier {sample.courier or '—'}, tracking {sample.tracking_number or '—'}.",
                   f"/contracts/{contract.pk}")
        return Response(SampleSerializer(sample).data, status=201)


class SampleDecideView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk, sid):
        contract, who = _contract(request, pk)
        sample = get_object_or_404(ContractSample, pk=sid, contract=contract)
        if who not in ("buyer", "admin"):
            return _err("The buyer approves samples.", 403)
        decision = request.data.get("decision")
        if decision not in ("received", "approved", "rejected"):
            return _err("Use received, approved or rejected.")
        if decision == "rejected" and not (request.data.get("notes") or "").strip():
            return _err("Say why the sample was rejected.")
        sample.status = decision
        for field in ("cup_score", "moisture_pct"):
            if request.data.get(field) not in (None, ""):
                try:
                    setattr(sample, field, Decimal(str(request.data[field])))
                except InvalidOperation:
                    return _err(f"{field} must be a number.")
        sample.buyer_notes = (request.data.get("notes") or sample.buyer_notes)[:2000]
        if decision in ("approved", "rejected"):
            sample.decided_by = request.user
            sample.decided_at = timezone.now()
        sample.save()
        svc.notify([contract.seller], f"{sample.get_kind_display()} {decision} — {contract.number}",
                   sample.buyer_notes or "", f"/contracts/{contract.pk}")
        return Response(SampleSerializer(sample).data)


class ClaimListView(APIView):
    permission_classes = [IsAuth]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        contract, _ = _contract(request, pk)
        return Response(ClaimSerializer(contract.claims.select_related("raised_by"), many=True).data)

    def post(self, request, pk):
        contract, who = _contract(request, pk)
        if who not in ("buyer", "admin"):
            return _err("The buyer raises claims.", 403)
        if contract.status not in (Contract.Status.SHIPPED, Contract.Status.COMPLETED):
            return _err("Claims can be raised once the coffee has shipped.")
        serializer = ClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        claim = serializer.save(contract=contract, raised_by=request.user)
        svc.notify([contract.seller], f"Claim on {contract.number}", claim.description[:200],
                   f"/contracts/{contract.pk}")
        return Response(ClaimSerializer(claim).data, status=201)


class ClaimRespondView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, pk, cid):
        contract, who = _contract(request, pk)
        claim = get_object_or_404(Claim, pk=cid, contract=contract)
        action = request.data.get("action")
        resolution = (request.data.get("resolution") or "").strip()
        if action in ("accept", "reject") and who in ("seller", "admin"):
            if claim.status != Claim.Status.OPEN:
                return _err("This claim was already answered.")
            if action == "reject" and not resolution:
                return _err("Explain why the claim is rejected.")
            claim.status = Claim.Status.ACCEPTED if action == "accept" else Claim.Status.REJECTED
            if request.data.get("amount_usd") not in (None, ""):
                claim.amount_usd = Decimal(str(request.data["amount_usd"]))
        elif action == "settle" and who in ("buyer", "seller", "admin"):
            if claim.status != Claim.Status.ACCEPTED:
                return _err("Only an accepted claim can be marked settled.")
            claim.status = Claim.Status.SETTLED
        else:
            return _err("Not allowed.", 403)
        claim.resolution = resolution or claim.resolution
        claim.resolved_at = timezone.now()
        claim.save()
        svc.notify([svc.other_side(contract, request.user)], f"Claim {claim.status} — {contract.number}",
                   claim.resolution[:200], f"/contracts/{contract.pk}")
        return Response(ClaimSerializer(claim).data)


# ── T-4 / T-5 shipments ──────────────────────────────────────────────────────

class ShipmentListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        contract, _ = _contract(request, pk)
        qs = contract.shipments.select_related("forwarder").prefetch_related("events__recorded_by", "documents")
        return Response(ShipmentSerializer(qs, many=True).data)

    def post(self, request, pk):
        contract, _ = _contract(request, pk)
        serializer = ShipmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        forwarder = data.pop("forwarder_email", None)
        if forwarder is not None:
            data["forwarder"] = forwarder
        data.setdefault("bags", contract.bags)
        data.setdefault("net_weight_kg", contract.quantity_kg)
        data.setdefault("port_of_discharge", contract.destination)
        try:
            shipment = svc.create_shipment(request.user, contract, data)
        except svc.TradeError as exc:
            return _err(exc)
        return Response(ShipmentSerializer(shipment).data, status=201)


def _shipment(request, sid):
    shipment = get_object_or_404(
        Shipment.objects.select_related("contract", "contract__lot", "contract__seller", "contract__buyer"), pk=sid,
    )
    if svc.party(request.user, shipment.contract) is None:
        from django.http import Http404

        raise Http404
    return shipment


class ShipmentDetailView(APIView):
    permission_classes = [IsAuth]

    def patch(self, request, sid):
        shipment = _shipment(request, sid)
        if not svc.can_update_shipment(request.user, shipment):
            return _err("Only the exporter's team or the assigned forwarder can update this shipment.", 403)
        serializer = ShipmentSerializer(shipment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        if "forwarder_email" in data:
            if svc.party(request.user, shipment.contract) not in ("seller", "admin"):
                return _err("Only the exporter assigns the forwarder.", 403)
            data["forwarder"] = data.pop("forwarder_email")
        for k, v in data.items():
            setattr(shipment, k, v)
        shipment.save()
        return Response(ShipmentSerializer(shipment).data)


class ShipmentEventView(APIView):
    permission_classes = [IsAuth]

    def post(self, request, sid):
        shipment = _shipment(request, sid)
        kind = request.data.get("kind")
        if kind not in ShipmentEvent.Kind.values:
            return _err("Unknown milestone.")
        try:
            happened = request.data.get("happened_at")
            when = timezone.make_aware(timezone.datetime.fromisoformat(happened)) if happened and "T" in happened \
                else None
            event = svc.record_event(request.user, shipment, kind, when, request.data.get("location", ""),
                                     request.data.get("note", ""))
        except (svc.TradeError, ValueError) as exc:
            return _err(exc)
        return Response(EventSerializer(event).data, status=201)


class ShipmentDocumentView(APIView):
    permission_classes = [IsAuth]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _doc(self, request, sid, did):
        shipment = _shipment(request, sid)
        return shipment, get_object_or_404(ShipmentDocument, pk=did, shipment=shipment)

    def get(self, request, sid, did):
        _, doc = self._doc(request, sid, did)
        if not doc.file:
            return _err("No file uploaded.", 404)
        return FileResponse(doc.file.open("rb"), filename=doc.file.name.rsplit("/", 1)[-1])

    def post(self, request, sid, did):
        """Upload (exporter team / forwarder) or review (buyer: approve / reject)."""
        shipment, doc = self._doc(request, sid, did)
        who = svc.party(request.user, shipment.contract)
        review = request.data.get("review")
        if review:
            if who not in ("buyer", "admin"):
                return _err("The buyer reviews documents.", 403)
            if review not in ("approved", "rejected"):
                return _err("Use approved or rejected.")
            if review == "rejected" and not (request.data.get("comment") or "").strip():
                return _err("Say what needs correcting.")
            doc.status = review
            doc.comment = (request.data.get("comment") or "")[:300]
            doc.save()
            svc.notify([shipment.contract.seller, shipment.forwarder],
                       f"{doc.get_kind_display()} {review} — {shipment.contract.number}", doc.comment,
                       f"/contracts/{shipment.contract_id}")
            return Response(DocumentSerializer(doc).data)
        if not svc.can_update_shipment(request.user, shipment):
            return _err("Only the exporter's team or the assigned forwarder can upload documents.", 403)
        if request.data.get("not_needed") in ("1", "true", True):
            doc.status = ShipmentDocument.Status.NOT_NEEDED
            doc.save()
            return Response(DocumentSerializer(doc).data)
        upload = request.FILES.get("file")
        if not upload and not doc.file:
            return _err("Attach the document.")
        serializer = DocumentSerializer(doc, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save()
        if upload:
            from bunna_bridge.lots.validators import document_extension_validator
            from bunna_bridge.lots.validators import validate_document_size

            document_extension_validator(upload)
            validate_document_size(upload)
            doc.file.save(upload.name, upload, save=False)
        doc.status = ShipmentDocument.Status.UPLOADED
        doc.comment = ""
        doc.uploaded_by = request.user
        doc.uploaded_at = timezone.now()
        doc.save()
        return Response(DocumentSerializer(doc).data)


# ── T-6 payments and FX ──────────────────────────────────────────────────────

class PaymentListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, pk):
        contract, who = _contract(request, pk)
        if who not in ("seller", "buyer", "admin"):
            return _err("Not allowed.", 403)
        return Response({"payments": PaymentSerializer(contract.payments.all(), many=True).data,
                         "summary": svc.money_summary(contract)})

    def post(self, request, pk):
        contract, who = _contract(request, pk)
        if who not in ("seller", "admin"):
            return _err("The exporter records payments received.", 403)
        serializer = PaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(contract=contract, recorded_by=request.user)
        return self.get(request, pk)


class PaymentDetailView(APIView):
    permission_classes = [IsAuth]

    def patch(self, request, pk, pid):
        contract, who = _contract(request, pk)
        if who not in ("seller", "admin"):
            return _err("Not allowed.", 403)
        payment = get_object_or_404(Payment, pk=pid, contract=contract)
        serializer = PaymentSerializer(payment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return PaymentListView().get(request, pk)


# ── T-7 messaging ────────────────────────────────────────────────────────────

def _conversations_for(user):
    ids = team_ids(user)
    return Conversation.objects.filter(Q(buyer_id__in=ids) | Q(lot__exporter_id__in=ids)).select_related(
        "lot", "lot__exporter", "buyer", "contract",
    )


class ConversationListView(APIView):
    permission_classes = [IsAuth]

    def get(self, request):
        qs = _conversations_for(request.user)
        if request.query_params.get("lot"):
            qs = qs.filter(lot_id=request.query_params["lot"])
        data = ConversationSerializer(qs, many=True, context={"request": request}).data
        return Response({"results": data, "unread": sum(c["unread"] for c in data)})

    def post(self, request):
        """Buyer starts (or reopens) the conversation about a lot."""
        lot = get_object_or_404(visible_lots(request.user, CoffeeLot.objects.all()), pk=request.data.get("lot"))
        if same_team(request.user, lot.exporter_id):
            return _err("This is your own lot.")
        conv, _ = Conversation.objects.get_or_create(lot=lot, buyer=request.user)
        contract = Contract.objects.filter(lot=lot, buyer_id__in=team_ids(request.user)).exclude(
            status="cancelled").first()
        if contract and conv.contract_id != contract.pk:
            conv.contract = contract
            conv.save(update_fields=["contract"])
        return Response(ConversationSerializer(conv, context={"request": request}).data, status=201)


class MessageListView(APIView):
    permission_classes = [IsAuth]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _conv(self, request, cid):
        return get_object_or_404(_conversations_for(request.user), pk=cid)

    def get(self, request, cid):
        conv = self._conv(request, cid)
        ConversationRead.objects.update_or_create(conversation=conv, user=request.user,
                                                  defaults={"last_read_at": timezone.now()})
        return Response({
            "conversation": ConversationSerializer(conv, context={"request": request}).data,
            "messages": MessageSerializer(conv.messages.select_related("sender", "conversation"), many=True).data,
        })

    def post(self, request, cid):
        conv = self._conv(request, cid)
        body = (request.data.get("body") or "").strip()
        upload = request.FILES.get("attachment")
        if not body and not upload:
            return _err("Write a message.")
        if len(body) > 5000:  # noqa: PLR2004
            return _err("Messages are limited to 5,000 characters.")
        msg = Message(conversation=conv, sender=request.user, body=body)
        if upload:
            from bunna_bridge.lots.validators import document_extension_validator
            from bunna_bridge.lots.validators import validate_document_size

            document_extension_validator(upload)
            validate_document_size(upload)
            msg.attachment.save(upload.name, upload, save=False)
        msg.save()
        conv.last_message_at = msg.created_at
        conv.save(update_fields=["last_message_at"])
        ConversationRead.objects.update_or_create(conversation=conv, user=request.user,
                                                  defaults={"last_read_at": timezone.now()})
        recipient = conv.lot.exporter if same_team(request.user, conv.buyer_id) else conv.buyer
        name = request.user.company_name or request.user.get_full_name() or request.user.email
        svc.notify([recipient], f"Message from {name}", f"Lot {conv.lot.lot_id}: {body[:150]}",
                   f"/messages?c={conv.pk}")
        return Response(MessageSerializer(msg).data, status=201)


class MessageAttachmentView(APIView):
    permission_classes = [IsAuth]

    def get(self, request, cid, mid):
        conv = get_object_or_404(_conversations_for(request.user), pk=cid)
        msg = get_object_or_404(Message, pk=mid, conversation=conv)
        if not msg.attachment:
            return _err("No attachment.", 404)
        return FileResponse(msg.attachment.open("rb"), filename=msg.attachment.name.rsplit("/", 1)[-1])


# ── T-2 floor price table (admin) ────────────────────────────────────────────

FLOOR_COLUMNS = ["grade", "processing", "region", "min_price_usd_per_kg", "valid_from", "valid_to", "source"]


class FloorPriceView(APIView):
    permission_classes = [IsAuth]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        rows = FloorPrice.objects.all().order_by("-valid_from", "region", "grade", "processing")
        if request.query_params.get("format") == "csv":
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(FLOOR_COLUMNS)
            for r in rows:
                w.writerow([getattr(r, c) if getattr(r, c) is not None else "" for c in FLOOR_COLUMNS])
            resp = HttpResponse(out.getvalue(), content_type="text/csv")
            resp["Content-Disposition"] = 'attachment; filename="floor-prices.csv"'
            return resp
        return Response([{c: str(getattr(r, c) or "") for c in ["id", *FLOOR_COLUMNS]} for r in rows])

    def post(self, request):
        """CSV import of ECTA minimum-price tables. ?dry_run=1 validates only. Rows with the same scope and
        start date replace the existing row."""
        if not is_admin(request.user):
            return _err("Platform administrators only.", 403)
        upload = request.FILES.get("file")
        if not upload:
            return _err("Attach a CSV with columns: " + ", ".join(FLOOR_COLUMNS))
        dry_run = str(request.data.get("dry_run", "")).lower() in ("1", "true")
        text = upload.read().decode("utf-8-sig", errors="replace")
        rows = list(csv.DictReader(io.StringIO(text)))
        errors, parsed = [], []
        for i, r in enumerate(rows, start=2):
            r = {(k or "").strip().lower(): (v or "").strip() for k, v in r.items()}
            try:
                price = Decimal(r.get("min_price_usd_per_kg", ""))
                start = date.fromisoformat(r.get("valid_from", ""))
                end = date.fromisoformat(r["valid_to"]) if r.get("valid_to") else None
            except (InvalidOperation, ValueError):
                errors.append({"row": i, "error": "min_price_usd_per_kg must be a number and dates YYYY-MM-DD."})
                continue
            if price <= 0 or (end and end < start):
                errors.append({"row": i, "error": "Price must be positive and valid_to after valid_from."})
                continue
            parsed.append({"grade": r.get("grade", ""), "processing": r.get("processing", "").lower(),
                           "region": r.get("region", "").lower(), "min_price_usd_per_kg": price,
                           "valid_from": start, "valid_to": end, "source": r.get("source", "")[:200]})
        result = {"rows": len(rows), "valid": len(parsed), "errors": errors, "dry_run": dry_run, "saved": False}
        if errors or dry_run or not parsed:
            return Response(result, status=400 if errors else 200)
        with transaction.atomic():
            for p in parsed:
                FloorPrice.objects.update_or_create(
                    grade=p["grade"], processing=p["processing"], region=p["region"], valid_from=p["valid_from"],
                    defaults={k: p[k] for k in ("min_price_usd_per_kg", "valid_to", "source")},
                )
        result["saved"] = True
        return Response(result, status=status.HTTP_200_OK)
