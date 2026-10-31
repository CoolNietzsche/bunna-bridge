"""
The compliance gate engine.

All seven export gates on CoffeeLot are derived here from real evidence —
uploaded files, expiry dates, geometry, the satellite deforestation check,
the exporter's verified ECTA license and the admin-managed floor-price
table. CoffeeLot.save() calls apply_gates() on every save, so there is no
API path that can set a gate by hand. Every change is recorded in the
append-only, hash-chained ComplianceEvent log (log_gate_changes()).
"""

from django.db.models import Q
from django.utils import timezone

from .models import GATE_FIELDS
from .models import GATE_LABELS


def _today():
    return timezone.localdate()


def _same_geometry(a, b):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a.equals_exact(b, 1e-9)


def exporter_license_status(user):
    """(is_valid, reason) for the lot owner's ECTA export license."""
    if user is None:
        return False, "Lot has no exporter."
    if not user.ecta_license_file:
        return False, "Upload your ECTA export license in Settings."
    if not user.ecta_license_expiry:
        return False, "Add the ECTA license expiry date in Settings."
    if user.ecta_license_expiry < _today():
        return (
            False,
            f"ECTA license expired on {user.ecta_license_expiry:%d %b %Y}. Upload the renewed license.",
        )
    if not user.ecta_license_verified_at:
        return (
            False,
            "ECTA license uploaded — awaiting verification by the Beersheba team.",
        )
    return True, f"Verified, valid until {user.ecta_license_expiry:%d %b %Y}."


def applicable_floor_price(lot):
    from .models import FloorPrice

    today = _today()
    candidates = (
        FloorPrice.objects.filter(valid_from__lte=today)
        .filter(
            Q(valid_to__isnull=True) | Q(valid_to__gte=today),
        )
        .filter(
            Q(grade="") | Q(grade=lot.grade),
        )
        .filter(
            Q(processing="") | Q(processing=lot.processing),
        )
    )
    # Most specific match wins: grade+processing > grade > processing > generic.
    best = None
    best_rank = -1
    for fp in candidates:
        rank = (2 if fp.grade else 0) + (1 if fp.processing else 0)
        if rank > best_rank or (
            rank == best_rank and best and fp.valid_from > best.valid_from
        ):
            best, best_rank = fp, rank
    return best


def lot_price_usd(lot):
    return lot.fob_price_usd if lot.fob_price_usd is not None else lot.price_per_kg


def floor_price_status(lot):
    floor = applicable_floor_price(lot)
    price = lot_price_usd(lot)
    if floor is None:
        return (
            False,
            "No minimum export price is configured for this grade yet — contact the Beersheba team.",
        )
    if price is None:
        return False, f"Set an FOB price (minimum ${floor.min_price_usd_per_kg}/kg)."
    if price < floor.min_price_usd_per_kg:
        return (
            False,
            f"FOB ${price}/kg is below the ${floor.min_price_usd_per_kg}/kg minimum.",
        )
    return True, f"FOB ${price}/kg meets the ${floor.min_price_usd_per_kg}/kg minimum."


def apply_gates(lot, previous=None):
    """Recompute every gate on `lot` in place. `previous` is the DB copy (or None for new lots)."""
    from .eudr_spatial import deforestation_result_for_lot

    today = _today()

    # Gate: GPS geolocation present.
    lot.gps_verified = bool(lot.boundary or lot.farm_location)

    # Gate: deforestation-free. Re-run the satellite check whenever geometry changes.
    geometry_changed = previous is None or not (
        _same_geometry(previous.boundary, lot.boundary)
        and _same_geometry(previous.farm_location, lot.farm_location)
    )
    if not lot.gps_verified:
        lot.deforestation_free = False
    elif geometry_changed:
        result = deforestation_result_for_lot(lot)
        if result["deforestation_free"] is not None:
            lot.deforestation_free = result["deforestation_free"]
        elif previous is not None:
            lot.deforestation_free = False

    # A DDS attests to specific geometry; if that geometry changed, the DDS is stale.
    if previous is not None and geometry_changed and lot.eudr_dds_file:
        lot.eudr_dds_file = None
        lot.eudr_dds_generated_at = None

    # Gate: DDS — a stored DDS for a lot that is located and deforestation-free.
    lot.eudr_dds_ready = (
        bool(lot.eudr_dds_file) and lot.gps_verified and lot.deforestation_free
    )

    # Gate: phytosanitary certificate present and not expired.
    lot.phyto_cert_uploaded = bool(lot.phyto_cert_file) and not (
        lot.phyto_cert_expiry and lot.phyto_cert_expiry < today
    )

    # Gate: NBE FX declaration filed.
    lot.nbe_fx_declared = bool(lot.nbe_fx_declaration_file)

    # Gate: exporter's ECTA license verified and in date.
    exporter = lot.exporter if lot.exporter_id else None
    lot.ecta_license_active = exporter_license_status(exporter)[0]

    # Gate: price at or above the configured floor.
    lot.cta_floor_met = floor_price_status(lot)[0]
    return lot


def gate_report(lot):
    """Per-gate pass/fail with a plain-language reason and the next action."""
    today = _today()
    report = []

    def add(gate, passed, reason, action=""):
        report.append(
            {
                "gate": gate,
                "label": GATE_LABELS[gate],
                "passed": bool(passed),
                "reason": reason,
                "action": "" if passed else action,
            },
        )

    if lot.boundary:
        add("gps_verified", True, "Farm boundary polygon captured.")
    elif lot.farm_location:
        add(
            "gps_verified",
            True,
            "GPS point captured. Plots over 4 ha need a full polygon under EUDR.",
        )
    else:
        add(
            "gps_verified",
            False,
            "No farm location yet.",
            "Draw the farm boundary or inherit it from the farmer.",
        )

    if not lot.gps_verified:
        add(
            "deforestation_free",
            False,
            "Needs a farm location before the satellite check can run.",
            "Add a farm location.",
        )
    elif lot.deforestation_free:
        add(
            "deforestation_free",
            True,
            "No forest loss after 31 Dec 2020 detected inside the plot (Hansen GFC).",
        )
    else:
        add(
            "deforestation_free",
            False,
            "The plot overlaps forest loss detected after 31 Dec 2020, or the check could not complete.",
            "Re-run the compliance check; if the overlap is real this lot cannot enter the EU.",
        )

    if lot.eudr_dds_ready:
        when = (
            f" on {timezone.localtime(lot.eudr_dds_generated_at):%d %b %Y}"
            if lot.eudr_dds_generated_at
            else ""
        )
        add("eudr_dds_ready", True, f"Due Diligence Statement stored{when}.")
    elif not (lot.gps_verified and lot.deforestation_free):
        add(
            "eudr_dds_ready",
            False,
            "The DDS can only be generated once location and deforestation gates pass.",
            "Fix the two gates above first.",
        )
    else:
        add(
            "eudr_dds_ready",
            False,
            "No Due Diligence Statement generated yet.",
            "Generate the EUDR DDS.",
        )

    if lot.phyto_cert_uploaded:
        until = (
            f", valid until {lot.phyto_cert_expiry:%d %b %Y}"
            if lot.phyto_cert_expiry
            else ""
        )
        add("phyto_cert_uploaded", True, f"Certificate on file{until}.")
    elif (
        lot.phyto_cert_file and lot.phyto_cert_expiry and lot.phyto_cert_expiry < today
    ):
        add(
            "phyto_cert_uploaded",
            False,
            f"Certificate expired on {lot.phyto_cert_expiry:%d %b %Y}.",
            "Upload a current certificate.",
        )
    else:
        add(
            "phyto_cert_uploaded",
            False,
            "No phytosanitary certificate uploaded.",
            "Upload it under Documents.",
        )

    ok, reason = exporter_license_status(lot.exporter if lot.exporter_id else None)
    add("ecta_license_active", ok, reason, "Update your license in Settings.")

    if lot.nbe_fx_declared:
        add("nbe_fx_declared", True, "NBE foreign-exchange declaration on file.")
    else:
        add(
            "nbe_fx_declared",
            False,
            "No NBE FX declaration uploaded.",
            "Upload it under Documents.",
        )

    ok, reason = floor_price_status(lot)
    add("cta_floor_met", ok, reason, "Edit the lot's FOB price.")

    order = {g: i for i, g in enumerate(GATE_FIELDS)}
    report.sort(key=lambda r: order[r["gate"]])
    return report


def readiness_percent(lot):
    return round(100 * lot.compliance_score() / len(GATE_FIELDS))


def log_gate_changes(lot, previous, actor=None, reason=""):
    from .models import ComplianceEvent

    changes = []
    for gate in GATE_FIELDS:
        new = getattr(lot, gate)
        old = getattr(previous, gate) if previous is not None else None
        if previous is None and not new:
            continue
        if old != new:
            changes.append((gate, old, new))
    if not changes:
        return []

    last = (
        ComplianceEvent.objects.filter(lot=lot).order_by("-created_at", "-id").first()
    )
    prev_hash = last.hash if last else ""
    events = []
    for gate, old, new in changes:
        event = ComplianceEvent(
            lot=lot,
            gate=gate,
            old_value=old,
            new_value=new,
            actor=actor if getattr(actor, "pk", None) else None,
            reason=reason[:300],
            created_at=timezone.now(),
            prev_hash=prev_hash,
        )
        event.hash = event.compute_hash()
        event.save()
        prev_hash = event.hash
        events.append(event)
    return events


def refresh_lot(lot, actor=None):
    """Re-derive gates from current data (used after exporter/floor/expiry changes)."""
    lot.save(actor=actor)
    return lot
