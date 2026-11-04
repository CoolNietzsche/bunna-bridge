"""
EUDR due diligence for a lot (roadmap E-3, E-5, E-7, E-10).

Who does what under EUDR (as amended by Reg. (EU) 2025/2650):
- The EU importer (first to place the coffee on the EU market) files the
  Due Diligence Statement (DDS) in the EU Information System.
- The Ethiopian exporter is outside the EU, so it does not file. What it
  must hand over is the evidence the importer needs: geolocation of every
  plot, producer and quantity data, legality information and a documented
  risk assessment. That is the "evidence package" built here.

Gate `eudr_dds_ready` on CoffeeLot therefore means: a current evidence
package exists, the risk assessment is signed off and still valid, there
are no open high risks, and every plot is located and clear of forest loss.
"""

import hashlib
import json
from decimal import Decimal

from django.db import transaction

from .geo import FOREST_2020_FLAG_PCT
from .geo import plot_geolocation_problem
from .models import EvidencePackage
from .models import LotRisk
from .models import LotSource
from .models import ProducerConsent
from .models import RiskSignOff

UNTRACED_TOLERANCE = Decimal("0.05")  # sources must cover ≥95 % of the lot's volume


def lot_has_sources(lot):
    return bool(lot.pk) and LotSource.objects.filter(lot_id=lot.pk).exists()


def lot_sources(lot):
    return list(
        LotSource.objects.filter(lot_id=lot.pk)
        .select_related("plot", "plot__producer")
        .order_by("plot_id"),
    )


# ── Gates across all plots ───────────────────────────────────────────────────


def source_gate_values(sources):
    """(gps_verified, deforestation_free) across every plot in the lot."""
    if not sources:
        return False, False
    gps = all(plot_geolocation_problem(s.plot) is None for s in sources)
    clear = gps and all(s.plot.deforestation_status == "clear" for s in sources)
    return gps, clear


# ── Fingerprints ─────────────────────────────────────────────────────────────


def _sha(payload):
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode(),
    ).hexdigest()


def sources_fingerprint(lot, sources=None):
    """Changes whenever a source, its quantity, plot geometry or check result changes."""
    sources = lot_sources(lot) if sources is None else sources
    rows = []
    for s in sources:
        geom = s.plot.boundary or s.plot.location
        rows.append(
            [
                str(s.plot_id),
                str(s.quantity_kg),
                str(s.plot.producer_id),
                geom.wkt if geom is not None else "",
                s.plot.deforestation_status,
            ],
        )
    return _sha({"lot": str(lot.pk), "sources": sorted(rows)})


def register_fingerprint(lot):
    rows = [
        [r.code, r.severity, r.status, sorted(r.affected or [])]
        for r in LotRisk.objects.filter(lot_id=lot.pk).order_by("code")
    ]
    return _sha({"lot": str(lot.pk), "risks": rows})


# ── Risk register ────────────────────────────────────────────────────────────


def _risk(code, severity, title, detail, affected=()):
    return {
        "code": code,
        "severity": severity,
        "title": title,
        "detail": detail,
        "affected": sorted({str(a) for a in affected}),
    }


def detect_risks(lot):
    """The automatic risks that currently apply to the lot."""
    found = [
        _risk(
            "country_standard_risk",
            "low",
            "Ethiopia is a standard-risk country",
            "The EU benchmarks Ethiopia as standard risk, so full due diligence (information, "
            "risk assessment and mitigation) is required — simplified due diligence does not apply.",
        ),
    ]
    sources = lot_sources(lot) if lot.pk else []

    if lot.channel == "ecx":
        found.append(
            _risk(
                "ecx_channel",
                "high",
                "Coffee bought through ECX",
                "ECX trading pools coffee from many farms, so plot-level origin is usually lost. "
                "Re-source from direct, vertically integrated or union channels, or obtain plot "
                "data from the supplying washing station.",
            ),
        )
    elif lot.channel == "unknown":
        found.append(
            _risk(
                "channel_unknown",
                "medium",
                "Supply channel not stated",
                "State how the coffee reached you (own farm, own washing station, union or ECX).",
            ),
        )

    if not sources:
        found.append(
            _risk(
                "no_supply_sources",
                "high",
                "No registered supply plots",
                "Add the producers and plots this lot came from, with the kg each delivered. "
                "A lot-level point or polygon is not enough for EUDR when the lot blends farms.",
            ),
        )
        return found

    plots = [s.plot for s in sources]
    producers = {p.producer_id: p.producer for p in plots}

    missing = [p for p in plots if p.boundary is None and p.location is None]
    if missing:
        found.append(
            _risk(
                "missing_geolocation",
                "high",
                f"{len(missing)} plot(s) have no location",
                "Capture a GPS point (plots up to 4 ha) or a polygon for: "
                + ", ".join(str(p) for p in missing[:10])
                + ("…" if len(missing) > 10 else ""),
                [p.pk for p in missing],
            ),
        )
    need_polygon = [
        p
        for p in plots
        if p.boundary is None and p.location is not None and plot_geolocation_problem(p)
    ]
    if need_polygon:
        found.append(
            _risk(
                "polygon_required",
                "high",
                f"{len(need_polygon)} plot(s) over 4 ha have only a point",
                "Walk or draw the boundary of: "
                + ", ".join(str(p) for p in need_polygon[:10]),
                [p.pk for p in need_polygon],
            ),
        )
    overlap = [p for p in plots if p.deforestation_status == "overlap"]
    if overlap:
        found.append(
            _risk(
                "deforestation_overlap",
                "high",
                f"{len(overlap)} plot(s) overlap forest loss after 2020",
                "Satellite data shows tree-cover loss after 31 Dec 2020 inside or next to: "
                + ", ".join(str(p) for p in overlap[:10])
                + ". Verify on the ground (field visit with photos) or remove the plot from the lot.",
                [p.pk for p in overlap],
            ),
        )
    unchecked = [
        p
        for p in plots
        if p.deforestation_status in ("pending", "no_data")
        and (p.boundary is not None or p.location is not None)
    ]
    if unchecked:
        found.append(
            _risk(
                "deforestation_unchecked",
                "medium",
                f"{len(unchecked)} plot(s) not checked against forest-loss data",
                "Reference data was not available when these plots were saved. Re-run the check.",
                [p.pk for p in unchecked],
            ),
        )
    forest_2020 = [
        p
        for p in plots
        if p.forest_2020_overlap_pct is not None
        and p.forest_2020_overlap_pct >= FOREST_2020_FLAG_PCT
    ]
    if forest_2020:
        found.append(
            _risk(
                "plot_in_2020_forest",
                "medium",
                f"{len(forest_2020)} plot(s) lie in 2020 forest cover",
                "These plots were forest on 31 Dec 2020 (JRC GFC2020). Coffee grown under forest "
                "canopy can be compliant if the forest was not converted — document it.",
                [p.pk for p in forest_2020],
            ),
        )

    no_consent = [
        pr
        for pr in producers.values()
        if not pr.current_consent(ProducerConsent.Purpose.EUDR_SHARING)
    ]
    if no_consent:
        found.append(
            _risk(
                "no_consent",
                "high",
                f"{len(no_consent)} producer(s) have not consented to data sharing",
                "Ethiopia's Personal Data Protection Proclamation (1321/2024) requires consent before "
                "plot locations and names go to an EU buyer. Record consent for: "
                + ", ".join(pr.name for pr in no_consent[:10]),
                [pr.pk for pr in no_consent],
            ),
        )

    tenure_unknown = [p for p in plots if p.land_tenure == "other"]
    exporter = lot.exporter if lot.exporter_id else None
    legality = []
    if not lot.ecta_license_active:
        legality.append("the exporter's ECTA licence is not verified and in date")
    if tenure_unknown:
        legality.append(
            f"land tenure is not recorded for {len(tenure_unknown)} plot(s)",
        )
    if exporter is not None and not lot.ecex_permit_file:
        legality.append("no ECEX export permit is on file")
    if legality:
        found.append(
            _risk(
                "legality_information",
                "medium",
                "Legality information incomplete",
                "EUDR requires evidence the coffee was produced under Ethiopian law: "
                + "; ".join(legality)
                + ".",
                [p.pk for p in tenure_unknown],
            ),
        )

    total = sum((s.quantity_kg for s in sources), Decimal("0"))
    volume = lot.volume_kg or Decimal("0")
    if volume and total < volume * (1 - UNTRACED_TOLERANCE):
        found.append(
            _risk(
                "untraced_volume",
                "high",
                "Part of the lot has no traced origin",
                f"Supply plots account for {total} kg of the {volume} kg lot. "
                "Every kilogram must trace to a plot.",
            ),
        )
    elif volume and total > volume * (1 + UNTRACED_TOLERANCE):
        found.append(
            _risk(
                "volume_mismatch",
                "medium",
                "Source quantities exceed the lot volume",
                f"Plots delivered {total} kg against a {volume} kg lot. Check delivery records "
                "(cherry vs. green-coffee weights).",
            ),
        )
    return found


@transaction.atomic
def sync_risks(lot):
    """Bring the stored register in line with detect_risks(). Returns the lot's risks."""
    if not lot.pk:
        return []
    detected = {r["code"]: r for r in detect_risks(lot)}
    existing = {
        r.code: r for r in LotRisk.objects.select_for_update().filter(lot_id=lot.pk)
    }
    for code, data in detected.items():
        risk = existing.get(code)
        if risk is None:
            LotRisk.objects.create(lot_id=lot.pk, automatic=True, **data)
            continue
        changed = False
        new_items = set(data["affected"]) - set(risk.affected or [])
        if risk.status == LotRisk.Status.RESOLVED or (
            new_items and risk.status != LotRisk.Status.OPEN
        ):
            risk.status = LotRisk.Status.OPEN
            changed = True
        for field in ("severity", "title", "detail", "affected"):
            if getattr(risk, field) != data[field]:
                setattr(risk, field, data[field])
                changed = True
        if changed:
            risk.save()
    for code, risk in existing.items():
        if (
            risk.automatic
            and code not in detected
            and risk.status != LotRisk.Status.RESOLVED
        ):
            risk.status = LotRisk.Status.RESOLVED
            risk.save(update_fields=["status", "updated_at"])
    return list(LotRisk.objects.filter(lot_id=lot.pk))


def open_high_risks(lot):
    return LotRisk.objects.filter(
        lot_id=lot.pk, severity="high", status=LotRisk.Status.OPEN,
    )


def current_signoff(lot):
    """The latest sign-off, if the register has not changed since and has no open high risk."""
    signoff = RiskSignOff.objects.filter(lot_id=lot.pk).first()
    if signoff is None:
        return None
    if signoff.register_fingerprint != register_fingerprint(lot):
        return None
    if open_high_risks(lot).exists():
        return None
    return signoff


def current_package(lot, sources=None):
    package = EvidencePackage.objects.filter(lot_id=lot.pk).first()
    if package is None or package.fingerprint != sources_fingerprint(lot, sources):
        return None
    return package


def package_blockers(lot):
    """Reasons an evidence package cannot be generated yet (empty = OK)."""
    sources = lot_sources(lot)
    if not sources:
        return ["Add the supply plots this lot came from first."]
    blockers = []
    gps, clear = source_gate_values(sources)
    if not gps:
        blockers.append(
            "Every plot needs valid geolocation (a polygon for plots over 4 ha).",
        )
    elif not clear:
        blockers.append("Every plot must pass the forest-loss check.")
    sync_risks(lot)
    high = open_high_risks(lot).count()
    if high:
        blockers.append(f"{high} high risk(s) are still open in the risk register.")
    elif current_signoff(lot) is None:
        blockers.append("Sign off the risk assessment.")
    return blockers


def dds_gate(lot, gps, clear):
    """Value of the eudr_dds_ready gate for a lot that has sources."""
    if not (gps and clear) or not lot.pk:
        return False
    if current_package(lot) is None:
        return False
    return current_signoff(lot) is not None


def due_diligence_summary(lot):
    """Compact, personal-data-free summary for lot pages and the public trust profile."""
    sources = lot_sources(lot) if lot.pk else []
    plots = [s.plot for s in sources]
    signoff = current_signoff(lot) if sources else None
    package = current_package(lot, sources) if sources else None
    risks = list(LotRisk.objects.filter(lot_id=lot.pk)) if lot.pk else []
    return {
        "has_sources": bool(sources),
        "producers": len({p.producer_id for p in plots}),
        "plots": len(plots),
        "polygons": sum(1 for p in plots if p.boundary is not None),
        "points": sum(
            1 for p in plots if p.boundary is None and p.location is not None
        ),
        "plots_clear": sum(1 for p in plots if p.deforestation_status == "clear"),
        "traced_kg": str(sum((s.quantity_kg for s in sources), Decimal("0"))),
        "open_high_risks": sum(
            1 for r in risks if r.severity == "high" and r.status == "open"
        ),
        "open_risks": sum(1 for r in risks if r.status == "open"),
        "signed_off_at": signoff.signed_at if signoff else None,
        "package_generated_at": package.generated_at if package else None,
        "dds_recorded": lot.dds_references.exists() if lot.pk else False,
        "channel": lot.channel,
    }


def refresh_lots_for_plot(plot, actor=None):
    """A plot changed: re-derive gates and risks on every lot it supplies."""
    from bunna_bridge.lots.models import CoffeeLot

    for lot in CoffeeLot.objects.filter(sources__plot=plot).distinct():
        lot.save(actor=actor)
