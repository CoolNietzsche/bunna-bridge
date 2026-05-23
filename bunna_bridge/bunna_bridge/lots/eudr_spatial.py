"""
Spatial EUDR compliance checks.
Used by the compliance engine to auto-compute deforestation_free.
"""
from django.contrib.gis.geos import GEOSGeometry
from bunna_bridge.lots.deforestation import DeforestationZone


def check_deforestation_overlap(boundary) -> dict:
    """
    Check if a farm/lot boundary polygon overlaps with any known
    deforestation zone (post-2020, EUDR cutoff).

    Args:
        boundary: GEOSGeometry Polygon or None

    Returns:
        {
          "status": "clear" | "overlap" | "pending" | "no_data",
          "deforestation_free": True | False | None,
          "overlap_count": int,
          "message": str,
        }
    """
    if boundary is None:
        return {
            "status": "pending",
            "deforestation_free": None,
            "overlap_count": 0,
            "message": "No boundary captured yet — deforestation check pending.",
        }

    total_zones = DeforestationZone.objects.count()
    if total_zones == 0:
        return {
            "status": "no_data",
            "deforestation_free": None,
            "overlap_count": 0,
            "message": "No deforestation reference data loaded yet.",
        }

    # PostGIS ST_Intersects query — only zones after 2020
    overlapping = DeforestationZone.objects.filter(
        year__gt=2020,
        geometry__intersects=boundary,
    ).count()

    if overlapping > 0:
        return {
            "status": "overlap",
            "deforestation_free": False,
            "overlap_count": overlapping,
            "message": f"⚠️ Boundary overlaps {overlapping} deforestation zone(s) after 2020.",
        }

    return {
        "status": "clear",
        "deforestation_free": True,
        "overlap_count": 0,
        "message": "✅ No deforestation overlap detected. EUDR Gate 1 passed.",
    }


def run_deforestation_check_for_lot(lot) -> bool | None:
    """
    Run deforestation check for a lot and update lot.deforestation_free.
    Uses lot.boundary if available, falls back to a point buffer around
    lot.farm_location.
    Returns True/False/None (None = pending, no geometry available).
    """
    boundary = None

    if lot.boundary:
        boundary = lot.boundary
    elif lot.farm_location:
        # Buffer the GPS point by ~500m as a rough farm area proxy
        # 0.005 degrees ≈ 500m at Ethiopian latitudes
        boundary = lot.farm_location.buffer(0.005)

    result = check_deforestation_overlap(boundary)

    # Auto-update the lot field if we got a definitive answer
    if result["deforestation_free"] is not None:
        lot.deforestation_free = result["deforestation_free"]
        lot.save(update_fields=["deforestation_free"])

    return result["deforestation_free"]
