"""
Explainable scores (roadmap M-5, M-6). Every score is a list of criteria
with the points earned, the maximum, and a plain-language reason, so a buyer
can see exactly why a lot or exporter scored what it did. Criteria without
data are shown as such and left out of the percentage, not counted as zero.
"""

import statistics
from decimal import Decimal

from django.conf import settings


def _criterion(key, label, points, maximum, detail, has_data=True):
    return {"key": key, "label": label, "points": round(points, 1) if has_data else 0, "max": maximum,
            "detail": detail, "has_data": has_data}


def _total(criteria):
    available = [c for c in criteria if c["has_data"]]
    earned = sum(c["points"] for c in available)
    possible = sum(c["max"] for c in available)
    full = sum(c["max"] for c in criteria)
    return {
        "score": round(100 * earned / possible) if possible else None,
        "coverage": round(100 * possible / full) if full else 0,
        "criteria": criteria,
    }


def _scale(value, low, high, maximum):
    if value <= low:
        return 0.0
    if value >= high:
        return float(maximum)
    return maximum * (value - low) / (high - low)


# ── M-5 impact and transparency ─────────────────────────────────────────────

GREEN_YIELD = {"cherry": Decimal("0.20"), "dry_cherry": Decimal("0.50"), "parchment": Decimal("0.80")}


def farm_price_share(lot, deliveries=None):
    """Farmers' share of the FOB price in %, from recorded cherry prices; None without the data."""
    from bunna_bridge.traceability.models import CherryDelivery

    if deliveries is None:
        deliveries = list(CherryDelivery.objects.filter(lot=lot))
    rate = Decimal(str(getattr(settings, "NBE_DEFAULT_FX_RATE", "0") or "0"))
    priced = [d for d in deliveries if d.price_per_kg_etb]
    if not (priced and lot.fob_price_usd and rate > 0):
        return None
    weight = sum(d.weight_kg for d in priced)
    green_cost = sum(d.weight_kg * d.price_per_kg_etb / GREEN_YIELD.get(d.form, Decimal("0.20")) for d in priced) / weight
    return float(green_cost / (lot.fob_price_usd * rate) * 100)


def impact(lot):
    from bunna_bridge.traceability.due_diligence import lot_sources
    from bunna_bridge.traceability.models import CherryDelivery

    criteria = []
    deliveries = list(CherryDelivery.objects.filter(lot=lot).select_related("producer"))
    rate = Decimal(str(getattr(settings, "NBE_DEFAULT_FX_RATE", "0") or "0"))

    # 1. Share of the FOB price paid to farmers (from recorded cherry prices).
    share = farm_price_share(lot, deliveries)
    if share is not None:
        criteria.append(_criterion(
            "farm_price_share", "Farmers' share of the export price", _scale(share, 40, 70, 30), 30,
            f"Farmers received about {share:.0f}% of the FOB price (green-coffee equivalent of recorded cherry prices, "
            f"at {rate} Birr/USD). 70% or more earns full points.",
        ))
    else:
        criteria.append(_criterion("farm_price_share", "Farmers' share of the export price", 0, 30,
                                   "No cherry prices recorded for this lot.", has_data=False))

    # 2. Farmers paid, on record.
    if deliveries:
        paid = sum(1 for d in deliveries if d.amount_paid_etb and d.amount_paid_etb > 0)
        pct = 100 * paid / len(deliveries)
        criteria.append(_criterion("payments_recorded", "Farmer payments on record", 15 * pct / 100, 15,
                                   f"{paid} of {len(deliveries)} deliveries have a recorded payment."))
    else:
        criteria.append(_criterion("payments_recorded", "Farmer payments on record", 0, 15,
                                   "No cherry deliveries recorded for this lot.", has_data=False))

    # 3. Traceability depth.
    sources = lot_sources(lot) if lot.pk else []
    if sources:
        traced = sum((s.quantity_kg for s in sources), Decimal("0"))
        coverage = float(traced / lot.volume_kg * 100) if lot.volume_kg else 0
        polygons = sum(1 for s in sources if s.plot.boundary is not None)
        consent = all(s.plot.producer.current_consent("eudr_sharing") for s in sources)
        pts = _scale(coverage, 50, 95, 10) + (5 if lot.gps_verified else 0) + (5 if consent else 0)
        criteria.append(_criterion(
            "traceability", "Traced to the farm", pts, 20,
            f"{coverage:.0f}% of the lot traced to {len(sources)} plot(s) ({polygons} mapped as polygons); "
            f"{'every' if consent else 'not every'} producer has given data-sharing consent.",
        ))
    else:
        criteria.append(_criterion("traceability", "Traced to the farm", 0, 20,
                                   "No supply plots registered for this lot.", has_data=False))

    # 4. Forest-safe.
    if sources:
        clear = all(s.plot.deforestation_status == "clear" for s in sources)
        in_forest = [s for s in sources if s.plot.forest_2020_overlap_pct and s.plot.forest_2020_overlap_pct >= 10]
        pts = (10 if clear else 0) + (5 if not in_forest else 0)
        criteria.append(_criterion(
            "forest", "Forest-safe origin", pts, 15,
            ("No forest loss after 2020 on any plot." if clear else "Some plots are not cleared of post-2020 forest loss.")
            + (f" {len(in_forest)} plot(s) lie in 2020 forest cover." if in_forest else ""),
        ))
    else:
        criteria.append(_criterion("forest", "Forest-safe origin", 10 if lot.deforestation_free else 0, 15,
                                   "Checked on the lot's farm location only." if lot.gps_verified else
                                   "No location data.", has_data=lot.gps_verified))

    # 5. Women producers.
    producers = {s.plot.producer_id: s.plot.producer for s in sources}
    disclosed = [p for p in producers.values() if p.gender in ("female", "male")]
    if disclosed:
        women = sum(1 for p in disclosed if p.gender == "female")
        pct = 100 * women / len(disclosed)
        criteria.append(_criterion("women", "Women producers", _scale(pct, 0, 30, 10), 10,
                                   f"{women} of {len(disclosed)} producers (where recorded) are women. 30% or more earns full points."))
    else:
        criteria.append(_criterion("women", "Women producers", 0, 10,
                                   "Producer gender is not recorded.", has_data=False))

    # 6. Certifications.
    certs = [n for n, on in (("Organic", lot.is_organic), ("Fair Trade", lot.is_fair_trade),
                             ("Rainforest Alliance", lot.is_rainforest_alliance)) if on]
    criteria.append(_criterion("certifications", "Certifications", min(10, 5 * len(certs)), 10,
                               ", ".join(certs) if certs else "No current certifications."))
    return _total(criteria)


# ── M-6 exporter reliability ────────────────────────────────────────────────

def reliability(exporter):
    from bunna_bridge.lots.models import Offer
    from bunna_bridge.orgs.access import team_ids
    from bunna_bridge.quality.services import reliability as record

    r = record(exporter)
    criteria = []
    if r["on_time_rate"] is not None:
        criteria.append(_criterion("on_time", "Ships on time", 35 * r["on_time_rate"] / 100, 35,
                                   f"{r['on_time_shipments']} of {r['on_time_shipments'] + r['late_shipments']} shipments left by the end of the shipment period."))
    else:
        criteria.append(_criterion("on_time", "Ships on time", 0, 35, "No shipments yet.", has_data=False))
    if r["shipped"]:
        rate = r["accepted_claims"] / r["shipped"]
        criteria.append(_criterion("claims", "Few quality or weight claims", 25 * max(0.0, 1 - rate), 25,
                                   f"{r['accepted_claims']} accepted claim(s) on {r['shipped']} shipped contract(s)."))
    else:
        criteria.append(_criterion("claims", "Few quality or weight claims", 0, 25, "No shipments yet.", has_data=False))
    if r["pss_first_time_approval"] is not None:
        criteria.append(_criterion("pss", "Pre-shipment samples approved first time", 20 * r["pss_first_time_approval"] / 100, 20,
                                   f"{r['pss_first_time_approval']}% approved at the first attempt."))
    else:
        criteria.append(_criterion("pss", "Pre-shipment samples approved first time", 0, 20,
                                   "No pre-shipment samples evaluated yet.", has_data=False))
    change = r["average_cup_change_pss_to_arrival"]
    if change is not None:
        criteria.append(_criterion("consistency", "Arrives as sampled", _scale(change, -4, 0, 10), 10,
                                   f"Cup score changes by {change:+.2f} on average from pre-shipment sample to arrival."))
    else:
        criteria.append(_criterion("consistency", "Arrives as sampled", 0, 10,
                                   "No arrival samples compared yet.", has_data=False))
    responded = Offer.objects.filter(lot__exporter_id__in=team_ids(exporter),
                                     status__in=["accepted", "rejected", "countered"])
    hours = [(o.updated_at - o.created_at).total_seconds() / 3600 for o in responded[:200]]
    if hours:
        median = statistics.median(hours)
        criteria.append(_criterion("response", "Answers offers quickly", 10 - _scale(median, 24, 168, 10), 10,
                                   f"Typical response to an offer: {median:.0f} hours."))
    else:
        criteria.append(_criterion("response", "Answers offers quickly", 0, 10, "No offers answered yet.", has_data=False))
    out = _total(criteria)
    out["contracts"] = r["contracts"]
    out["provisional"] = r["contracts"] < 3  # noqa: PLR2004
    out["record"] = r
    return out
