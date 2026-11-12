"""
The public lot story (/story/<id>): presentation settings plus a checklist
that is always computed from the lot's records.

Two kinds of claims appear on the page and are kept apart on purpose:
- the covenant: checks Beersheba can show from data (forest checks, traced
  plots, recorded payments, licence, DDS). Each says whether it is met.
- partner statements: what a roaster or hotel says about the coffee. Shown as
  theirs, never with a verified mark.

Personal data stays out unless the producer agreed: grower names and plot
shapes appear only for producers with a current "story" consent.
"""

import json
from decimal import Decimal

from bunna_bridge.traceability.due_diligence import lot_sources
from bunna_bridge.traceability.models import CherryDelivery
from bunna_bridge.traceability.models import ProducerConsent

STORY_CONSENT = ProducerConsent.Purpose.STORY


def _join_names(names):
    names = sorted(set(names))
    if len(names) <= 2:  # noqa: PLR2004
        return " and ".join(names)
    if len(names) == 3:  # noqa: PLR2004
        return f"{names[0]}, {names[1]} and {names[2]}"
    return f"{names[0]}, {names[1]} and {len(names) - 2} other growers"


def _item(key, text, met, detail):
    return {"key": key, "text": text, "met": bool(met), "detail": detail}


def covenant(lot, plots, deliveries, grower_names):
    """The verified checklist. `met` is only ever True when the records show it."""
    from bunna_bridge.market.scores import farm_price_share

    items = []
    n = len(plots)

    # 1. Zero deforestation since the EU cut-off date.
    if n:
        clear = sum(1 for p in plots if p.deforestation_status == "clear")
        items.append(_item(
            "forest", "Zero deforestation since 31 December 2020", clear == n,
            f"{clear} of {n} farm plots checked clear against satellite forest-loss data.",
        ))
    elif lot.gps_verified:
        items.append(_item(
            "forest", "Zero deforestation since 31 December 2020", lot.deforestation_free,
            "Checked on the farm's mapped location." if lot.deforestation_free
            else "The farm's location has not passed the forest-loss check.",
        ))
    else:
        items.append(_item("forest", "Zero deforestation since 31 December 2020", False,
                           "Waiting for the farm to be mapped."))

    # 2. Checked against the EU's 2020 forest map.
    checked = [p for p in plots if p.forest_2020_overlap_pct is not None]
    items.append(_item(
        "baseline", "Checked against the EU 2020 satellite forest map", bool(n) and len(checked) == n,
        f"All {n} plots compared with the EU’s map of forest cover on 31 December 2020."
        if n and len(checked) == n else "Waiting for the EU 2020 forest map check.",
    ))

    # 3. Traced to the farm.
    if n:
        producers = len({p.producer_id for p in plots})
        items.append(_item(
            "traced", f"Traced to {n} mapped farm plot{'s' if n != 1 else ''}", True,
            f"From {producers} grower{'s' if producers != 1 else ''}, each plot mapped with GPS.",
        ))
    else:
        items.append(_item("traced", "Traced to the farm", False, "Farm plots not linked to this lot yet."))

    # 4. Payments to growers on record.
    who = grower_names or "the growers"
    if deliveries:
        paid = sum(1 for d in deliveries if d.amount_paid_etb and d.amount_paid_etb > 0)
        share = farm_price_share(lot, deliveries)
        detail = f"{paid} of {len(deliveries)} cherry deliveries have a recorded payment."
        if share is not None and 0 < share <= 100:  # noqa: PLR2004 (over 100% means a stale exchange rate)
            detail += f" Growers received about {share:.0f}% of the export price."
        items.append(_item("paid", f"Payment to {who} on record", paid == len(deliveries), detail))
    else:
        items.append(_item("paid", f"Payment to {who} on record", False, "No cherry deliveries recorded for this lot."))

    # 5. Licensed exporter.
    items.append(_item(
        "licence", "Exported under a verified ECTA licence", bool(lot.exporter.ecta_license_verified_at),
        "The exporter’s Ethiopian Coffee and Tea Authority licence was checked by Beersheba."
        if lot.exporter.ecta_license_verified_at else "Licence not verified yet.",
    ))
    return items


def map_features(lot, plots):
    """GeoJSON features for the public map: the lot's own shape, plus plots whose grower consented."""
    features = []
    if lot.boundary:
        features.append({"type": "Feature", "properties": {"kind": "farm"}, "geometry": json.loads(lot.boundary.geojson)})
    elif lot.farm_location:
        features.append({"type": "Feature", "properties": {"kind": "farm"}, "geometry": json.loads(lot.farm_location.geojson)})
    for p in plots:
        geom = p.boundary or p.location
        if geom is None or not p.producer.current_consent(STORY_CONSENT):
            continue
        features.append({"type": "Feature", "properties": {"kind": "plot"}, "geometry": json.loads(geom.geojson)})
    return features


def public_story(lot):
    from .models import LotStory

    settings = LotStory.objects.filter(lot=lot).first() or LotStory(lot=lot)
    sources = list(lot_sources(lot)) if lot.pk else []
    plots = [s.plot for s in sources]
    deliveries = list(CherryDelivery.objects.filter(lot=lot).select_related("producer"))

    growers = ""
    if settings.show_grower_names:
        producers = {p.producer_id: p.producer for p in plots}
        producers.update({d.producer_id: d.producer for d in deliveries})
        growers = _join_names([p.name for p in producers.values() if p.current_consent(STORY_CONSENT)])

    order = None
    if settings.order_label:
        order = {
            "label": settings.order_label, "detail": settings.order_detail, "price": settings.order_price,
            "url": settings.order_url or None,
        }
    traced = sum((s.quantity_kg for s in sources), Decimal("0"))
    return {
        "partner_line": settings.partner_line,
        "place_label": settings.place_label,
        "reference": settings.reference or lot.lot_id,
        "hero_image": settings.hero_image.url if settings.hero_image else None,
        "growers": growers,
        "covenant": covenant(lot, plots, deliveries, growers),
        "statements": {"by": settings.statements_by, "items": list(settings.statements or [])}
        if settings.statements else None,
        "order": order,
        "map": {"type": "FeatureCollection", "features": map_features(lot, plots)},
        "traced_kg": str(traced),
    }
