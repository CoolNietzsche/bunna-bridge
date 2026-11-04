"""Business rules for contracts, shipments and payments (roadmap Phase 3)."""

from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.db.models import Sum
from django.utils import timezone

from bunna_bridge.lots.models import Notification
from bunna_bridge.lots.views import is_admin
from bunna_bridge.orgs.access import can
from bunna_bridge.orgs.access import same_team
from bunna_bridge.orgs.access import team_ids

from .models import Contract
from .models import Shipment
from .models import ShipmentDocument

NBE_CONVERSION_SHARE = Decimal("0.50")


class TradeError(Exception):
    """A rule was broken; the message is shown to the user."""


# ── Access ───────────────────────────────────────────────────────────────────

def contracts_for(user):
    if is_admin(user):
        return Contract.objects.all()
    ids = team_ids(user)
    return Contract.objects.filter(
        Q(seller_id__in=ids) | Q(buyer_id__in=ids) | Q(shipments__forwarder_id__in=ids),
    ).distinct()


def party(user, contract):
    """'seller', 'buyer', 'forwarder', 'admin' or None."""
    if same_team(user, contract.seller_id):
        return "seller"
    if same_team(user, contract.buyer_id):
        return "buyer"
    if contract.shipments.filter(forwarder_id__in=team_ids(user)).exists():
        return "forwarder"
    if is_admin(user):
        return "admin"
    return None


def notify(users, title, message, link):
    seen = set()
    for u in users:
        if u is None or u.pk in seen:
            continue
        seen.add(u.pk)
        Notification.objects.create(recipient=u, notification_type="offer", title=title[:200], message=message,
                                    link=link)


def other_side(contract, user):
    return contract.buyer if same_team(user, contract.seller_id) else contract.seller


# ── T-1 contracts ────────────────────────────────────────────────────────────

def create_from_offer(offer):
    """Draft contract for an accepted offer (idempotent)."""
    existing = Contract.objects.filter(offer=offer).first()
    if existing:
        return existing
    lot = offer.lot
    spec = f"{lot.get_processing_display()} {lot.grade}, Ethiopia {lot.get_region_display()}"
    if lot.sca_score:
        spec += f", cup score {lot.sca_score} or better"
    spec += ". Moisture max 11.5%. Packed in 60 kg jute bags with GrainPro liners."
    contract = Contract(
        number=Contract.next_number(), offer=offer, lot=lot, seller=lot.exporter, buyer=offer.buyer,
        quantity_kg=offer.quantity_kg, price_usd_per_kg=offer.price_per_kg_usd, quality_spec=spec,
        notes=offer.notes or "", destination=offer.buyer.country or "",
    )
    contract.save()
    notify([lot.exporter], f"Contract {contract.number} drafted",
           f"Review the terms for lot {lot.lot_id} and send them to the buyer for signature.",
           f"/contracts/{contract.pk}")
    return contract


def can_edit_terms(user, contract):
    return (
        party(user, contract) in ("seller", "admin")
        and contract.status in (Contract.Status.DRAFT, Contract.Status.SENT)
        and (is_admin(user) or can(user, "manage_offers"))
    )


def terms_changed(contract):
    """Called after the seller edits terms: any signature is void and it goes back to draft."""
    contract.seller_signed_at = contract.seller_signed_by = None
    contract.buyer_signed_at = contract.buyer_signed_by = None
    contract.status = Contract.Status.DRAFT
    contract.terms_hash = ""
    contract.save()


def validate_terms(contract):
    problems = []
    if contract.quantity_kg <= 0:
        problems.append("Quantity must be greater than zero.")
    if contract.price_usd_per_kg <= 0:
        problems.append("Price must be greater than zero.")
    if not contract.shipment_from or not contract.shipment_to:
        problems.append("Set the shipment period.")
    elif contract.shipment_to < contract.shipment_from:
        problems.append("The shipment period ends before it starts.")
    if contract.payment_terms in ("advance", "advance_cad") and not (0 < contract.advance_percent <= 100):  # noqa: PLR2004
        problems.append("Set the advance percentage.")
    if not contract.quality_spec.strip():
        problems.append("Describe the quality the coffee must meet.")
    return problems


@transaction.atomic
def send_for_signature(user, contract):
    if not can_edit_terms(user, contract):
        raise TradeError("Only the exporter's sales team can send this contract.")
    problems = validate_terms(contract)
    if problems:
        raise TradeError(" ".join(problems))
    contract.terms_hash = contract.compute_terms_hash()
    contract.status = Contract.Status.SENT
    contract.seller_signed_at = timezone.now()
    contract.seller_signed_by = user
    contract.save()
    notify([contract.buyer], f"Contract {contract.number} ready to sign",
           f"{contract.seller.company_name or contract.seller.email} signed and sent the contract for lot "
           f"{contract.lot.lot_id}.", f"/contracts/{contract.pk}")


@transaction.atomic
def buyer_sign(user, contract, terms_hash):
    if party(user, contract) != "buyer":
        raise TradeError("Only the buyer can countersign.")
    if contract.status != Contract.Status.SENT:
        raise TradeError("This contract is not waiting for your signature.")
    if terms_hash != contract.terms_hash or contract.compute_terms_hash() != contract.terms_hash:
        raise TradeError("The terms changed since you opened them. Reload and review again.")
    contract.buyer_signed_at = timezone.now()
    contract.buyer_signed_by = user
    contract.status = Contract.Status.SIGNED
    contract.save()
    notify([contract.seller], f"Contract {contract.number} signed",
           f"{user.company_name or user.email} countersigned. Register it with ECTA next.",
           f"/contracts/{contract.pk}")


@transaction.atomic
def cancel(user, contract, reason):
    if party(user, contract) not in ("seller", "buyer", "admin"):
        raise TradeError("Not allowed.")
    if contract.status in (Contract.Status.SHIPPED, Contract.Status.COMPLETED):
        raise TradeError("A shipped contract cannot be cancelled; raise a claim instead.")
    if contract.fully_signed and not is_admin(user):
        raise TradeError("Both parties signed. Agree the cancellation in messages and ask the Beersheba team.")
    if not reason.strip():
        raise TradeError("Give a reason.")
    contract.status = Contract.Status.CANCELLED
    contract.cancelled_reason = reason[:300]
    contract.save()
    lot = contract.lot
    lot.available_qty_kg = (lot.available_qty_kg or 0) + contract.quantity_kg
    if lot.status == "contracted" and not lot.contracts.exclude(status="cancelled").exclude(pk=contract.pk).exists():
        lot.status = "listed"
    lot.save(update_fields=["available_qty_kg", "status"])
    notify([other_side(contract, user)], f"Contract {contract.number} cancelled", reason[:300],
           f"/contracts/{contract.pk}")


# ── T-2 ECTA registration ────────────────────────────────────────────────────

def floor_check(contract):
    """(ok, floor_price or None, message). Uses the contract date and the lot's grade, process and region."""
    from bunna_bridge.lots.compliance import applicable_floor_price

    on = contract.buyer_signed_at.date() if contract.buyer_signed_at else timezone.localdate()
    floor = applicable_floor_price(contract.lot, on_date=on)
    if floor is None:
        return False, None, "No ECTA minimum price is configured for this grade, process and region."
    price = contract.price_usd_per_kg
    if contract.incoterm != Contract.Incoterm.FOB:
        return (True, floor, f"Minimum is ${floor.min_price_usd_per_kg}/kg FOB. This contract is "
                f"{contract.incoterm}; confirm the FOB-equivalent price with ECTA when registering.")
    if price < floor.min_price_usd_per_kg:
        return (False, floor, f"${price}/kg FOB is below the ECTA minimum of ${floor.min_price_usd_per_kg}/kg "
                f"({floor.source or 'floor table'}). ECTA will not register it.")
    return True, floor, f"${price}/kg FOB meets the ECTA minimum of ${floor.min_price_usd_per_kg}/kg."


@transaction.atomic
def register_with_ecta(user, contract, registration_number, registered_on):
    if party(user, contract) not in ("seller", "admin"):
        raise TradeError("The exporter registers the contract with ECTA.")
    if contract.status != Contract.Status.SIGNED:
        raise TradeError("Both parties must sign before registration.")
    ok, floor, message = floor_check(contract)
    if not ok:
        raise TradeError(message)
    if not registration_number.strip():
        raise TradeError("Enter the ECTA registration number.")
    contract.ecta_registration_number = registration_number.strip()[:60]
    contract.ecta_registered_on = registered_on or timezone.localdate()
    contract.ecta_floor_price_usd = floor.min_price_usd_per_kg if floor else None
    contract.ecta_floor_source = (floor.source if floor else "")[:200]
    contract.status = Contract.Status.REGISTERED
    contract.save()
    notify([contract.buyer], f"Contract {contract.number} registered with ECTA",
           f"Registration number {contract.ecta_registration_number}.", f"/contracts/{contract.pk}")


# ── T-3 samples ──────────────────────────────────────────────────────────────

def pss_approved(contract):
    return contract.samples.filter(kind="pss", status="approved").exists()


# ── T-4 / T-5 shipments ──────────────────────────────────────────────────────

@transaction.atomic
def create_shipment(user, contract, data):
    if party(user, contract) not in ("seller", "admin"):
        raise TradeError("The exporter creates the shipment.")
    if contract.status not in (Contract.Status.REGISTERED, Contract.Status.SHIPPED):
        raise TradeError("Register the contract with ECTA before booking a shipment.")
    shipment = Shipment.objects.create(contract=contract, created_by=user, **data)
    for kind, responsible in ShipmentDocument.DEFAULT_CHECKLIST:
        ShipmentDocument.objects.create(shipment=shipment, kind=kind, responsible=responsible)
    if shipment.forwarder_id:
        notify([shipment.forwarder], f"New shipment for {contract.number}",
               f"{contract.seller.company_name or contract.seller.email} assigned you as forwarder.",
               f"/contracts/{contract.pk}")
    return shipment


def can_update_shipment(user, shipment):
    p = party(user, shipment.contract)
    if p in ("seller", "admin"):
        return is_admin(user) or can(user, "manage_documents") or can(user, "manage_lots")
    return p == "forwarder" and shipment.forwarder_id in team_ids(user)


@transaction.atomic
def record_event(user, shipment, kind, happened_at=None, location="", note=""):
    from .models import ShipmentEvent

    if not can_update_shipment(user, shipment):
        raise TradeError("Only the exporter's team or the assigned forwarder can update milestones.")
    contract = shipment.contract
    if kind in ("loaded", "departed") and contract.pss_required and not pss_approved(contract):
        raise TradeError("The buyer has not approved the pre-shipment sample yet.")
    if kind in ("loaded", "departed"):
        missing = [d.get_kind_display() for d in shipment.documents.filter(
            kind__in=["ecta_quality", "phyto", "origin"], status__in=["missing", "rejected"])]
        if missing:
            raise TradeError("Upload these before loading: " + ", ".join(missing) + ".")
    event = ShipmentEvent.objects.create(shipment=shipment, kind=kind, happened_at=happened_at or timezone.now(),
                                         location=location[:100], note=note[:300], recorded_by=user)
    if kind == "departed" and contract.status == Contract.Status.REGISTERED:
        contract.status = Contract.Status.SHIPPED
        contract.save(update_fields=["status", "updated_at"])
        lot = contract.lot
        if lot.status == "contracted" and lot.export_ready:
            lot.status = "exported"
            lot.save(actor=user)
    if kind == "delivered":
        contract.status = Contract.Status.COMPLETED
        contract.save(update_fields=["status", "updated_at"])
    notify([contract.buyer, contract.seller], f"{contract.number}: {event.get_kind_display()}",
           " · ".join(p for p in [location, note] if p) or f"Shipment {shipment.container_number or ''}".strip(),
           f"/contracts/{contract.pk}")
    return event


# ── T-6 payments and FX ──────────────────────────────────────────────────────

def money_summary(contract):
    from .models import Claim

    value = contract.value_usd
    payments = list(contract.payments.all())
    received = sum((p.amount_usd for p in payments), Decimal("0"))
    converted = sum((p.converted_usd or Decimal("0") for p in payments), Decimal("0"))
    etb = sum((p.converted_etb or Decimal("0") for p in payments), Decimal("0"))
    claims = contract.claims.filter(status__in=[Claim.Status.ACCEPTED, Claim.Status.SETTLED]).aggregate(
        s=Sum("amount_usd"),
    )["s"] or Decimal("0")
    due = value - claims
    required = (received * NBE_CONVERSION_SHARE).quantize(Decimal("0.01"))
    avg_rate = (etb / converted).quantize(Decimal("0.0001")) if converted else None
    return {
        "contract_value_usd": str(value),
        "accepted_claims_usd": str(claims),
        "amount_due_usd": str(due),
        "received_usd": str(received),
        "outstanding_usd": str(max(due - received, Decimal("0"))),
        "converted_usd": str(converted),
        "converted_etb": str(etb),
        "average_rate": str(avg_rate) if avg_rate else None,
        "required_conversion_usd": str(required),
        "conversion_shortfall_usd": str(max(required - converted, Decimal("0"))),
        "nbe_conversion_ok": converted >= required,
        "retained_usd": str(received - converted),
    }
