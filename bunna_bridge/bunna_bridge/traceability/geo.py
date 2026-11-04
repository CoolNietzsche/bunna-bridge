"""
Plot geometry rules for EUDR (roadmap E-2) and the per-plot deforestation check.

EU Information System (TRACES) geolocation rules we enforce:
- WGS84 (EPSG:4326) coordinates, exported with 6 decimal places.
- A plot of 4 ha or less may be a single point; a larger plot needs a polygon.
- A polygon needs at least 4 distinct, non-aligned vertices and must not
  intersect itself.

On top of that we reject geometry outside Ethiopia's bounding box (the
classic swapped lat/lng mistake) and implausibly large plots.
"""

import json
from decimal import Decimal

from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.geos import MultiPolygon
from django.utils import timezone

# Ethiopia's bounding box with a small margin (lon 33.0–48.0, lat 3.4–14.9).
ETHIOPIA_BBOX = (33.0, 3.3, 48.1, 15.0)
POINT_MAX_HA = Decimal("4")
MAX_PLAUSIBLE_HA = Decimal("5000")
COORD_DECIMALS = 6
FOREST_2020_FLAG_PCT = Decimal("10")


def _utm_srid(lon):
    zone = int((lon + 180) // 6) + 1
    return 32600 + zone


def geodesic_area_ha(polygon):
    """Area in hectares, computed in the UTM zone of the polygon's centroid (<0.1 % error at plot scale)."""
    if polygon is None:
        return None
    projected = polygon.clone()
    if projected.srid is None:
        projected.srid = 4326
    projected.transform(_utm_srid(polygon.centroid.x))
    return Decimal(str(round(projected.area / 10_000, 4)))


def _in_bbox(x, y):
    min_x, min_y, max_x, max_y = ETHIOPIA_BBOX
    return min_x <= x <= max_x and min_y <= y <= max_y


def _distinct_vertices(ring):
    seen = []
    for x, y in ring:
        key = (round(x, 7), round(y, 7))
        if key not in seen:
            seen.append(key)
    return seen


def validate_plot_geometry(location=None, boundary=None, declared_area_ha=None):
    """Return a list of human-readable problems (empty list = valid)."""
    errors = []
    if boundary is not None:
        if boundary.geom_type != "Polygon":
            errors.append("The plot boundary must be a single polygon.")
            return errors
        ring = boundary.coords[0]
        if any(not _in_bbox(x, y) for x, y in ring):
            errors.append(
                "The boundary is outside Ethiopia. Check that longitude and latitude are not swapped.",
            )
        if len(_distinct_vertices(ring)) < 4:
            errors.append("A plot polygon needs at least 4 distinct corner points.")
        elif not boundary.valid:
            errors.append(
                f"The polygon is not valid ({boundary.valid_reason}). Edges must not cross each other.",
            )
        else:
            area = geodesic_area_ha(boundary)
            if area is not None and area <= 0:
                errors.append(
                    "The polygon has no area — its corner points are all on one line.",
                )
            elif area is not None and area > MAX_PLAUSIBLE_HA:
                errors.append(
                    f"The polygon covers {area} ha, which is not plausible for one coffee plot.",
                )
    if location is not None and not _in_bbox(location.x, location.y):
        errors.append(
            "The GPS point is outside Ethiopia. Check that longitude and latitude are not swapped.",
        )
    if declared_area_ha is not None and Decimal(declared_area_ha) <= 0:
        errors.append("Declared area must be greater than zero.")
    return errors


def effective_area_ha(plot):
    return plot.area_ha if plot.area_ha is not None else plot.declared_area_ha


def plot_geolocation_problem(plot):
    """Why this plot's geolocation does not meet EUDR, or None if it does."""
    if plot.boundary is not None:
        return None
    if plot.location is None:
        return "No location captured."
    area = plot.declared_area_ha
    if area is not None and area > POINT_MAX_HA:
        return f"Plot is {area} ha — EUDR needs a polygon for plots over 4 ha."
    return None


def check_geometry_for_plot(plot):
    from bunna_bridge.lots.eudr_spatial import point_buffer

    if plot.boundary is not None:
        return plot.boundary
    if plot.location is not None:
        return point_buffer(plot.location)
    return None


def forest_2020_overlap_pct(geometry):
    """Share of `geometry` inside the 2020 forest baseline, or None when no baseline is loaded."""
    from .models import ForestBaseline2020

    if geometry is None or not ForestBaseline2020.objects.exists():
        return None
    srid = _utm_srid(geometry.centroid.x)
    target = geometry.clone()
    target.transform(srid)
    if target.area <= 0:
        return None
    inside = 0.0
    for forest in ForestBaseline2020.objects.filter(geometry__intersects=geometry).only(
        "geometry",
    ):
        part = forest.geometry.clone()
        part.transform(srid)
        inside += target.intersection(part).area
    pct = min(100.0, 100.0 * inside / target.area)
    return Decimal(str(round(pct, 2)))


def run_plot_checks(plot):
    """Run the post-2020 forest-loss check (and 2020 forest baseline) on the plot, in place."""
    from bunna_bridge.lots.eudr_spatial import check_deforestation_overlap

    geometry = check_geometry_for_plot(plot)
    result = check_deforestation_overlap(geometry)
    plot.deforestation_status = result["status"]
    plot.deforestation_overlap_count = result["overlap_count"]
    plot.deforestation_checked_at = timezone.now() if geometry is not None else None
    plot.deforestation_datasets = (
        "Hansen GFC forest loss 2021+"
        if result["status"] in ("clear", "overlap")
        else ""
    )
    plot.forest_2020_overlap_pct = forest_2020_overlap_pct(geometry)
    if plot.forest_2020_overlap_pct is not None:
        plot.deforestation_datasets = ", ".join(
            p for p in [plot.deforestation_datasets, "JRC GFC2020 baseline"] if p
        )
    return result


def _same(a, b):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a.equals_exact(b, 1e-9)


def refresh_plot_derived_fields(plot, previous=None):
    """Called from Plot.save(): area + deforestation check when geometry changed (or never ran)."""
    if plot.boundary is not None and plot.boundary.srid is None:
        plot.boundary.srid = 4326
    if plot.location is not None and plot.location.srid is None:
        plot.location.srid = 4326
    if plot.boundary is not None:
        plot.area_ha = geodesic_area_ha(plot.boundary)
    else:
        plot.area_ha = plot.declared_area_ha

    geometry_changed = previous is None or not (
        _same(previous.boundary, plot.boundary)
        and _same(previous.location, plot.location)
    )
    needs_check = geometry_changed or plot.deforestation_status in (
        "pending",
        "no_data",
    )
    if needs_check:
        run_plot_checks(plot)


# ── EU Information System (TRACES) GeoJSON ───────────────────────────────────
# Property names as published in the EU Information System GeoJSON guidance.
# NOTE (roadmap E-12): verify against the current TRACES "GeoJSON file
# description" before the first live filing; change them only here.
TRACES_PROPERTIES = {
    "producer_name": "ProducerName",
    "producer_country": "ProducerCountry",
    "production_place": "ProductionPlace",
    "area": "Area",
}
MAX_GEOJSON_BYTES = 20 * 1024 * 1024  # EU IS accepts ~25 MB per DDS; keep headroom.


def _round_coords(value):
    if isinstance(value, (list, tuple)):
        if value and isinstance(value[0], (int, float)):
            return [round(float(v), COORD_DECIMALS) for v in value]
        return [_round_coords(v) for v in value]
    return value


def traces_feature(plot):
    """One GeoJSON Feature for the plot, or None if it has no geometry."""
    geometry = plot.boundary or plot.location
    if geometry is None:
        return None
    geo = json.loads(geometry.geojson)
    geo["coordinates"] = _round_coords(geo["coordinates"])
    producer = plot.producer
    place = ", ".join(
        p
        for p in [producer.kebele, producer.woreda, producer.zone, producer.region]
        if p
    )
    props = {
        TRACES_PROPERTIES["producer_name"]: producer.name,
        TRACES_PROPERTIES["producer_country"]: "ET",
        TRACES_PROPERTIES["production_place"]: place or plot.name or "Ethiopia",
    }
    area = effective_area_ha(plot)
    if area is not None:
        props[TRACES_PROPERTIES["area"]] = float(area)
    return {"type": "Feature", "properties": props, "geometry": geo}


def traces_feature_collections(plots, max_bytes=MAX_GEOJSON_BYTES):
    """Split features into FeatureCollections that each stay under `max_bytes`."""
    collections = []
    current = []
    size = 0
    for plot in plots:
        feature = traces_feature(plot)
        if feature is None:
            continue
        encoded = len(json.dumps(feature, separators=(",", ":")))
        if current and size + encoded > max_bytes:
            collections.append({"type": "FeatureCollection", "features": current})
            current, size = [], 0
        current.append(feature)
        size += encoded + 1
    if current or not collections:
        collections.append({"type": "FeatureCollection", "features": current})
    return collections


def geometry_from_geojson(value):
    """Parse a GeoJSON geometry (dict or str) into a GEOS geometry in EPSG:4326."""
    if value in (None, "", {}):
        return None
    text = value if isinstance(value, str) else json.dumps(value)
    geom = GEOSGeometry(text, srid=4326)
    if isinstance(geom, MultiPolygon) and len(geom) == 1:
        geom = geom[0]
    return geom
