"""
ECTMS integration (roadmap O-8).

ECTA's Ethiopian Coffee Traceability and Management System issues farm IDs
(QR codes) and keeps the national farm registry. ECTA has not published an
API yet, so there are two routes:

1. CSV import of an ECTMS export (works today). Producers are matched on the
   ECTMS farmer ID and plots on the ECTMS farm ID, so re-importing updates
   records instead of duplicating them.
2. A small API client (EctmsClient) that is switched on by setting
   ECTMS_API_URL and ECTMS_API_TOKEN. The endpoint shape is provisional and
   must be confirmed with ECTA's ICT team (decision D3 in the roadmap).
"""

import csv
import io
import json
import urllib.request
from decimal import Decimal
from decimal import InvalidOperation

from django.conf import settings
from django.contrib.gis.geos import GEOSException
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.geos import Point
from django.db import transaction
from rest_framework.parsers import FormParser
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from bunna_bridge.orgs.access import team_ids

from .geo import validate_plot_geometry
from .models import Plot
from .models import Producer

ALIASES = {
    "farmer_id": ["farmer_id", "farmerid", "ectms_farmer_id", "farmer_code"],
    "farm_id": ["farm_id", "farmid", "ectms_farm_id", "farm_code", "qr_code"],
    "name": ["farmer_name", "name", "full_name", "producer_name"],
    "phone": ["phone", "mobile", "phone_number"],
    "region": ["region"],
    "zone": ["zone"],
    "woreda": ["woreda", "district"],
    "kebele": ["kebele"],
    "lat": ["latitude", "lat", "gps_lat", "y"],
    "lon": ["longitude", "lon", "lng", "gps_lon", "gps_lng", "x"],
    "area": ["area_ha", "area", "hectares", "farm_size_ha"],
    "polygon": ["polygon", "boundary", "geometry", "wkt", "geojson"],
}


class _Rollback(Exception):
    pass


def _norm(key):
    return (key or "").strip().lower().replace(" ", "_").replace("-", "_")


def _pick(row, field):
    for alias in ALIASES[field]:
        value = row.get(alias)
        if value not in (None, ""):
            return value.strip()
    return ""


def _geometry(row):
    raw = _pick(row, "polygon")
    if raw:
        geom = GEOSGeometry(raw, srid=4326)
        if geom.geom_type == "MultiPolygon" and len(geom) == 1:
            geom = geom[0]
        return None, geom
    lat, lon = _pick(row, "lat"), _pick(row, "lon")
    if lat and lon:
        return Point(float(lon), float(lat), srid=4326), None
    return None, None


def import_ectms_csv(upload, owner, dry_run=False):
    text = upload.read().decode("utf-8-sig", errors="replace")
    rows = [{_norm(k): (v or "") for k, v in r.items()} for r in csv.DictReader(io.StringIO(text))]
    result = {"dry_run": dry_run, "rows": len(rows), "producers_created": 0, "producers_updated": 0,
              "plots_created": 0, "plots_updated": 0, "errors": []}
    if not rows:
        result["errors"].append({"row": 0, "error": "The file has no data rows."})
        return result
    team = team_ids(owner)
    try:
        with transaction.atomic():
            for i, row in enumerate(rows, start=2):
                farmer_id, farm_id, name = _pick(row, "farmer_id"), _pick(row, "farm_id"), _pick(row, "name")
                if not farmer_id or not name:
                    result["errors"].append({"row": i, "error": "Farmer ID and farmer name are required."})
                    continue
                try:
                    location, boundary = _geometry(row)
                except (GEOSException, ValueError, TypeError):
                    result["errors"].append({"row": i, "error": "Could not read the location or polygon."})
                    continue
                area = None
                if _pick(row, "area"):
                    try:
                        area = Decimal(_pick(row, "area"))
                    except InvalidOperation:
                        result["errors"].append({"row": i, "error": "Area is not a number."})
                        continue
                problems = validate_plot_geometry(location=location, boundary=boundary, declared_area_ha=area)
                if problems:
                    result["errors"].extend({"row": i, "error": p} for p in problems)
                    continue
                details = {k: _pick(row, k) for k in ("phone", "region", "zone", "woreda", "kebele")}
                producer = Producer.objects.filter(owner_id__in=team, ectms_farmer_id=farmer_id).first()
                if producer is None:
                    producer = Producer.objects.create(owner=owner, created_by=owner, name=name,
                                                       ectms_farmer_id=farmer_id, **details)
                    result["producers_created"] += 1
                else:
                    producer.name = name
                    for k, v in details.items():
                        if v:
                            setattr(producer, k, v)
                    producer.archived_at = None
                    producer.save()
                    result["producers_updated"] += 1
                if not (location or boundary):
                    continue
                plot = Plot.objects.filter(producer=producer, ectms_farm_id=farm_id).first() if farm_id else None
                if plot is None:
                    Plot.objects.create(producer=producer, ectms_farm_id=farm_id, name=farm_id, location=location,
                                        boundary=boundary, declared_area_ha=area, created_by=owner)
                    result["plots_created"] += 1
                else:
                    plot.location, plot.boundary = location, boundary
                    if area is not None:
                        plot.declared_area_ha = area
                    plot.archived_at = None
                    plot.save()
                    result["plots_updated"] += 1
            if dry_run or result["errors"]:
                raise _Rollback
    except _Rollback:
        pass
    return result


class EctmsNotConfigured(Exception):
    pass


class EctmsClient:
    """Provisional client — confirm endpoint paths and field names with ECTA before use."""

    def __init__(self):
        self.base = (getattr(settings, "ECTMS_API_URL", "") or "").rstrip("/")
        self.token = getattr(settings, "ECTMS_API_TOKEN", "")
        if not self.base or not self.token:
            raise EctmsNotConfigured
        if not self.base.startswith("https://"):
            msg = "ECTMS_API_URL must use https."
            raise EctmsNotConfigured(msg)

    def lookup_farm(self, farm_id):
        url = f"{self.base}/farms/{urllib.request.quote(farm_id, safe='')}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {self.token}"})  # noqa: S310
        with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310 - https enforced
            data = json.loads(resp.read().decode())
        return {
            "farm_id": data.get("farm_id") or farm_id,
            "farmer_id": data.get("farmer_id", ""),
            "farmer_name": data.get("farmer_name", ""),
            "kebele": data.get("kebele", ""),
            "woreda": data.get("woreda", ""),
            "area_ha": data.get("area_ha"),
            "geometry": data.get("geometry"),
        }


class EctmsImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        from .views import CanManageSupply

        return [CanManageSupply()]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Attach the ECTMS export (CSV) in the 'file' field."}, status=400)
        dry_run = str(request.data.get("dry_run", "")).lower() in ("1", "true", "yes")
        result = import_ectms_csv(upload, request.user, dry_run=dry_run)
        result["saved"] = not dry_run and not result["errors"]
        return Response(result, status=200 if not result["errors"] or dry_run else 400)


class EctmsLookupView(APIView):
    def get_permissions(self):
        from .views import CanManageSupply

        return [CanManageSupply()]

    def get(self, request, farm_id):
        try:
            client = EctmsClient()
        except EctmsNotConfigured:
            return Response({"detail": "ECTMS lookup is not connected yet. Import an ECTMS export file instead."},
                            status=503)
        try:
            return Response(client.lookup_farm(farm_id))
        except Exception:  # noqa: BLE001 - upstream errors are reported, not raised
            return Response({"detail": "ECTMS did not answer. Try again later."}, status=502)
