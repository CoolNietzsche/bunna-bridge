"""
Spatial EUDR compliance checks (gate: deforestation_free).

A lot's plot geometry is intersected (PostGIS ST_Intersects) with known
forest-loss polygons detected after the EUDR cutoff (31 Dec 2020).
"""

from bunna_bridge.lots.deforestation import DeforestationZone

# Ethiopia spans UTM zones 36N-38N; zone 37N (EPSG:32637) keeps distortion
# small enough for a buffer around a single farm point.
METRIC_SRID = 32637
POINT_BUFFER_METRES = 500
EUDR_CUTOFF_YEAR = 2020


def point_buffer(point, metres=POINT_BUFFER_METRES):
    """Buffer a WGS84 point by a distance in metres, returning a WGS84 polygon."""
    projected = point.clone()
    if projected.srid is None:
        projected.srid = 4326
    projected.transform(METRIC_SRID)
    area = projected.buffer(metres)
    area.transform(4326)
    return area


def check_geometry_for_lot(lot):
    if lot.boundary:
        return lot.boundary
    if lot.farm_location:
        return point_buffer(lot.farm_location)
    return None


def check_deforestation_overlap(boundary) -> dict:
    """
    Returns {"status": clear|overlap|pending|no_data, "deforestation_free": bool|None,
             "overlap_count": int, "message": str}.
    """
    if boundary is None:
        return {
            "status": "pending",
            "deforestation_free": None,
            "overlap_count": 0,
            "message": "No farm location captured yet — deforestation check pending.",
        }

    if not DeforestationZone.objects.exists():
        return {
            "status": "no_data",
            "deforestation_free": None,
            "overlap_count": 0,
            "message": "No deforestation reference data loaded yet.",
        }

    overlapping = DeforestationZone.objects.filter(
        year__gt=EUDR_CUTOFF_YEAR,
        geometry__intersects=boundary,
    ).count()

    if overlapping > 0:
        return {
            "status": "overlap",
            "deforestation_free": False,
            "overlap_count": overlapping,
            "message": f"Plot overlaps {overlapping} area(s) of forest loss detected after 2020.",
        }

    return {
        "status": "clear",
        "deforestation_free": True,
        "overlap_count": 0,
        "message": "No forest loss after 2020 detected inside the plot.",
    }


def deforestation_result_for_lot(lot) -> dict:
    return check_deforestation_overlap(check_geometry_for_lot(lot))


def run_deforestation_check_for_lot(lot, actor=None) -> dict:
    """Run the check, persist the result on the lot (logged), and return the result dict."""
    result = deforestation_result_for_lot(lot)
    if (
        result["deforestation_free"] is not None
        and result["deforestation_free"] != lot.deforestation_free
    ):
        lot.deforestation_free = result["deforestation_free"]
        lot.save(actor=actor)
    return result
