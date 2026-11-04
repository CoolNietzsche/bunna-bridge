"""
Bulk import (roadmap E-4) — most exporters already hold supplier lists in
Excel and plot maps from field apps, NGO projects or ECTMS.

- Producers: CSV. One row per producer; optional latitude/longitude/area
  columns also create a point plot for that producer.
- Plots: GeoJSON or KML (parsed in pure Python), or a zipped ESRI
  Shapefile (read with GDAL). Each feature is matched to a producer by
  `external_ref` / `producer_ref`, or by producer name; unknown producers
  are created.

Every import supports a dry run that validates without saving.
"""

import csv
import io
import json
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from decimal import Decimal
from decimal import InvalidOperation
from pathlib import Path

from django.contrib.gis.geos import GEOSException
from django.contrib.gis.geos import Point
from django.contrib.gis.geos import Polygon
from django.db import transaction

from .geo import geometry_from_geojson
from .geo import validate_plot_geometry
from .models import Plot
from .models import Producer
from .models import ProducerConsent

MAX_ROWS = 5000
PRODUCER_FIELDS = [
    "external_ref",
    "name",
    "phone",
    "region",
    "zone",
    "woreda",
    "kebele",
    "cooperative",
    "ectms_farmer_id",
]
TENURE = {c.value for c in Plot.Tenure}
CONSENT_METHODS = {c.value for c in ProducerConsent.Method}


class _DryRun(Exception):
    pass


def _norm(key):
    return (key or "").strip().lower().replace(" ", "_").replace("-", "_")


def _dec(value, field, errors, row):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value).strip())
    except InvalidOperation:
        errors.append({"row": row, "error": f"{field} '{value}' is not a number."})
        return None


def _find_producer(owner, ref, name):
    if ref:
        found = Producer.objects.filter(owner=owner, external_ref=ref).first()
        if found:
            return found
    if name:
        return Producer.objects.filter(
            owner=owner, name__iexact=name, archived_at__isnull=True,
        ).first()
    return None


def import_producers_csv(upload, owner, dry_run=False):
    """Columns: name (required), external_ref, phone, region, zone, woreda, kebele, cooperative,
    ectms_farmer_id, plot_name, latitude, longitude, area_ha, land_tenure, ectms_farm_id,
    consent (yes/no), consent_method (in_app/paper/sms/witnessed)."""
    text = upload.read().decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows = [{_norm(k): (v or "").strip() for k, v in r.items()} for r in reader]
    result = {
        "dry_run": dry_run,
        "rows": len(rows),
        "producers_created": 0,
        "producers_updated": 0,
        "plots_created": 0,
        "consents_recorded": 0,
        "errors": [],
    }
    if not rows:
        result["errors"].append({"row": 0, "error": "The file has no data rows."})
        return result
    if len(rows) > MAX_ROWS:
        result["errors"].append(
            {"row": 0, "error": f"At most {MAX_ROWS} rows per import."},
        )
        return result
    if "name" not in rows[0]:
        result["errors"].append({"row": 0, "error": "A 'name' column is required."})
        return result

    try:
        with transaction.atomic():
            for i, r in enumerate(rows, start=2):  # row 1 is the header
                errors = []
                if not r.get("name"):
                    result["errors"].append({"row": i, "error": "Name is empty."})
                    continue
                lat = _dec(r.get("latitude"), "latitude", errors, i)
                lon = _dec(r.get("longitude"), "longitude", errors, i)
                area = _dec(r.get("area_ha"), "area_ha", errors, i)
                tenure = r.get("land_tenure", "").lower() or "other"
                if tenure not in TENURE:
                    errors.append(
                        {
                            "row": i,
                            "error": f"land_tenure must be one of {sorted(TENURE)}.",
                        },
                    )
                location = None
                if (lat is None) != (lon is None):
                    errors.append(
                        {
                            "row": i,
                            "error": "Give both latitude and longitude, or neither.",
                        },
                    )
                elif lat is not None:
                    location = Point(float(lon), float(lat), srid=4326)
                    for msg in validate_plot_geometry(
                        location=location, declared_area_ha=area,
                    ):
                        errors.append({"row": i, "error": msg})
                consent = r.get("consent", "").lower() in ("yes", "y", "true", "1")
                method = r.get("consent_method", "").lower() or "witnessed"
                if consent and method not in CONSENT_METHODS - {"paper"}:
                    errors.append(
                        {
                            "row": i,
                            "error": "consent_method must be in_app, sms or witnessed "
                            "(paper consent needs the signed form uploaded per producer).",
                        },
                    )
                if errors:
                    result["errors"].extend(errors)
                    continue

                values = {f: r.get(f, "") for f in PRODUCER_FIELDS}
                producer = _find_producer(
                    owner,
                    values["external_ref"],
                    "" if values["external_ref"] else values["name"],
                )
                if producer is None:
                    producer = Producer.objects.create(
                        owner=owner, created_by=owner, **values,
                    )
                    result["producers_created"] += 1
                else:
                    for f, v in values.items():
                        if v:
                            setattr(producer, f, v)
                    producer.archived_at = None
                    producer.save()
                    result["producers_updated"] += 1
                if location is not None:
                    Plot.objects.create(
                        producer=producer,
                        name=r.get("plot_name", ""),
                        location=location,
                        declared_area_ha=area,
                        land_tenure=tenure,
                        ectms_farm_id=r.get("ectms_farm_id", ""),
                        created_by=owner,
                    )
                    result["plots_created"] += 1
                if consent and not producer.current_consent(
                    ProducerConsent.Purpose.EUDR_SHARING,
                ):
                    ProducerConsent.objects.create(
                        producer=producer,
                        purpose=ProducerConsent.Purpose.EUDR_SHARING,
                        granted=True,
                        method=method,
                        captured_by=owner,
                    )
                    result["consents_recorded"] += 1
            if dry_run or result["errors"]:
                raise _DryRun
    except _DryRun:
        pass
    return result


# ── Plot geometry files ─────────────────────────────────────────────────────


def _features_from_geojson(data):
    doc = json.loads(data.decode("utf-8-sig"))
    if doc.get("type") == "Feature":
        doc = {"features": [doc]}
    for f in doc.get("features", []):
        yield f.get("properties") or {}, f.get("geometry")


def _kml_coords(text):
    pts = []
    for chunk in (text or "").split():
        parts = chunk.split(",")
        if len(parts) >= 2:  # noqa: PLR2004
            pts.append((float(parts[0]), float(parts[1])))
    return pts


def _features_from_kml(data):
    if b"<!DOCTYPE" in data or b"<!ENTITY" in data:
        msg = "KML files with DOCTYPE/ENTITY declarations are not accepted."
        raise ValueError(msg)
    root = ET.fromstring(data)  # noqa: S314
    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"
    for pm in root.iter(f"{ns}Placemark"):
        props = {"name": (pm.findtext(f"{ns}name") or "").strip()}
        for data_el in pm.iter(f"{ns}Data"):
            props[data_el.get("name", "")] = (
                data_el.findtext(f"{ns}value") or ""
            ).strip()
        for sd in pm.iter(f"{ns}SimpleData"):
            props[sd.get("name", "")] = (sd.text or "").strip()
        poly = pm.find(f".//{ns}Polygon")
        point = pm.find(f".//{ns}Point")
        if poly is not None:
            ring = _kml_coords(
                poly.findtext(f".//{ns}outerBoundaryIs/{ns}LinearRing/{ns}coordinates"),
            )
            geometry = {"type": "Polygon", "coordinates": [ring]} if ring else None
        elif point is not None:
            pts = _kml_coords(point.findtext(f"{ns}coordinates"))
            geometry = {"type": "Point", "coordinates": list(pts[0])} if pts else None
        else:
            geometry = None
        yield props, geometry


def _features_from_shapefile_zip(data):
    from django.contrib.gis.gdal import DataSource
    from django.contrib.gis.gdal import SpatialReference

    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            for member in zf.namelist():
                target = (Path(tmp) / member).resolve()
                if not str(target).startswith(str(Path(tmp).resolve())):
                    msg = "Unsafe path in ZIP file."
                    raise ValueError(msg)
            zf.extractall(tmp)
        shp = next(Path(tmp).rglob("*.shp"), None)
        if shp is None:
            msg = "No .shp file found in the ZIP."
            raise ValueError(msg)
        layer = DataSource(str(shp))[0]
        wgs84 = SpatialReference(4326)
        out = []
        for feat in layer:
            props = {name: feat.get(name) for name in layer.fields}
            geom = feat.geom
            if geom.srs is not None and geom.srs.srid != 4326:  # noqa: PLR2004
                geom.transform(wgs84)
            out.append((props, json.loads(geom.json)))
        return out


def _read_features(upload):
    name = (upload.name or "").lower()
    data = upload.read()
    if name.endswith((".geojson", ".json")):
        return list(_features_from_geojson(data))
    if name.endswith(".kml"):
        return list(_features_from_kml(data))
    if name.endswith(".kmz"):
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            kml = next((n for n in zf.namelist() if n.lower().endswith(".kml")), None)
            if kml is None:
                msg = "No .kml file inside the KMZ."
                raise ValueError(msg)
            return list(_features_from_kml(zf.read(kml)))
    if name.endswith(".zip"):
        return _features_from_shapefile_zip(data)
    msg = "Upload a .geojson, .kml, .kmz or a .zip containing a Shapefile."
    raise ValueError(msg)


def _prop(props, *names):
    lowered = {_norm(k): v for k, v in props.items()}
    for n in names:
        v = lowered.get(_norm(n))
        if v not in (None, ""):
            return str(v).strip()
    return ""


def import_plots_file(upload, owner, dry_run=False, producer_id=None):
    result = {
        "dry_run": dry_run,
        "features": 0,
        "plots_created": 0,
        "producers_created": 0,
        "errors": [],
    }
    try:
        features = _read_features(upload)
    except (ValueError, json.JSONDecodeError, ET.ParseError, zipfile.BadZipFile) as exc:
        result["errors"].append(
            {"row": 0, "error": str(exc) or "Could not read the file."},
        )
        return result
    except Exception:  # noqa: BLE001 - GDAL raises assorted errors on broken shapefiles
        result["errors"].append({"row": 0, "error": "Could not read the Shapefile."})
        return result
    result["features"] = len(features)
    if len(features) > MAX_ROWS:
        result["errors"].append(
            {"row": 0, "error": f"At most {MAX_ROWS} plots per import."},
        )
        return result

    fixed = None
    if producer_id:
        fixed = Producer.objects.filter(owner=owner, pk=producer_id).first()
        if fixed is None:
            result["errors"].append({"row": 0, "error": "Producer not found."})
            return result

    try:
        with transaction.atomic():
            for i, (props, geometry) in enumerate(features, start=1):
                try:
                    geom = geometry_from_geojson(geometry)
                except GEOSException, ValueError, TypeError:
                    geom = None
                if geom is None or not isinstance(geom, (Point, Polygon)):
                    result["errors"].append(
                        {
                            "row": i,
                            "error": "Feature needs a Point or single Polygon geometry.",
                        },
                    )
                    continue
                if isinstance(geom, Point) and geom.hasz:
                    geom = Point(geom.x, geom.y, srid=4326)
                if isinstance(geom, Polygon) and geom.hasz:
                    geom = Polygon([(x, y) for x, y, *_ in geom.coords[0]], srid=4326)
                area = None
                raw_area = _prop(props, "area_ha", "area", "Area", "hectares")
                if raw_area:
                    try:
                        area = Decimal(raw_area)
                    except InvalidOperation:
                        area = None
                location = geom if isinstance(geom, Point) else None
                boundary = geom if isinstance(geom, Polygon) else None
                problems = validate_plot_geometry(
                    location=location, boundary=boundary, declared_area_ha=area,
                )
                if problems:
                    result["errors"].extend({"row": i, "error": p} for p in problems)
                    continue
                producer = fixed
                if producer is None:
                    ref = _prop(
                        props,
                        "external_ref",
                        "producer_ref",
                        "farmer_id",
                        "supplier_code",
                    )
                    pname = _prop(
                        props,
                        "producer",
                        "producer_name",
                        "ProducerName",
                        "farmer",
                        "farmer_name",
                        "name",
                    )
                    if not (ref or pname):
                        result["errors"].append(
                            {
                                "row": i,
                                "error": "No producer reference or name in the feature.",
                            },
                        )
                        continue
                    producer = _find_producer(owner, ref, pname)
                    if producer is None:
                        producer = Producer.objects.create(
                            owner=owner,
                            created_by=owner,
                            external_ref=ref,
                            name=pname or ref,
                            kebele=_prop(props, "kebele"),
                            woreda=_prop(props, "woreda"),
                            zone=_prop(props, "zone"),
                            region=_prop(props, "region"),
                        )
                        result["producers_created"] += 1
                tenure = _prop(props, "land_tenure", "tenure").lower()
                Plot.objects.create(
                    producer=producer,
                    name=_prop(props, "plot_name", "plot", "farm_name"),
                    ectms_farm_id=_prop(props, "ectms_farm_id", "farm_id"),
                    location=location,
                    boundary=boundary,
                    declared_area_ha=area,
                    land_tenure=tenure if tenure in TENURE else "other",
                    created_by=owner,
                )
                result["plots_created"] += 1
            if dry_run or result["errors"]:
                raise _DryRun
    except _DryRun:
        pass
    return result
