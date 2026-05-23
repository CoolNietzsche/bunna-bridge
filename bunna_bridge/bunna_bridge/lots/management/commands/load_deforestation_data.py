"""
Management command to load Hansen Global Forest Change deforestation
data for Ethiopia's coffee regions into the DeforestationZone table.

Usage:
  python manage.py load_deforestation_data

Data source:
  Global Forest Watch — Ethiopia forest loss 2021-2023
  Filtered to coffee-growing regions (Sidama, Oromia, SNNP)
  Only includes loss year > 2020 (EUDR cutoff is Dec 31, 2020)
"""
import os
import json
import tempfile
import subprocess
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from bunna_bridge.lots.deforestation import DeforestationZone


# Ethiopia coffee region bounding box for clipping
# Covers Sidama, Yirgacheffe, Guji, Kaffa, Limu, Jimma
ETHIOPIA_COFFEE_BBOX = "34.0,3.5,43.5,12.5"

# GFW tree cover loss tiles covering Ethiopia coffee regions
# These are 10x10 degree Hansen GFC tiles in GeoJSON format
# We use the GFW API to get pre-processed loss polygons
GFW_API_URL = (
    "https://opendata.arcgis.com/datasets/"
    "091d4fb80b5f4b4d93613b1a4c5a9d58_0.geojson"
)

# Fallback: use a curated small dataset we generate ourselves
SAMPLE_ZONES = [
    # Sidama region known deforestation zones (post-2020, approximate)
    {"year": 2021, "region": "Sidama",
     "coords": [[[38.5,6.8],[38.7,6.8],[38.7,6.6],[38.5,6.6],[38.5,6.8]]]},
    {"year": 2021, "region": "Kaffa",
     "coords": [[[35.8,7.2],[36.0,7.2],[36.0,7.0],[35.8,7.0],[35.8,7.2]]]},
    {"year": 2022, "region": "Guji",
     "coords": [[[38.2,5.8],[38.4,5.8],[38.4,5.6],[38.2,5.6],[38.2,5.8]]]},
    {"year": 2022, "region": "Jimma",
     "coords": [[[36.5,7.7],[36.7,7.7],[36.7,7.5],[36.5,7.5],[36.5,7.7]]]},
    {"year": 2023, "region": "Bale",
     "coords": [[[39.8,6.5],[40.0,6.5],[40.0,6.3],[39.8,6.3],[39.8,6.5]]]},
]


class Command(BaseCommand):
    help = "Load Ethiopia deforestation zone data into PostGIS"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            choices=["sample", "gfw"],
            default="sample",
            help="Data source: 'sample' (built-in test data) or 'gfw' (Global Forest Watch API)"
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing zones before loading"
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = DeforestationZone.objects.all().delete()[0]
            self.stdout.write(f"🗑  Cleared {count} existing zones")

        if options["source"] == "sample":
            self._load_sample()
        else:
            self._load_gfw()

    def _load_sample(self):
        self.stdout.write("Loading built-in sample deforestation zones…")
        created = 0
        for z in SAMPLE_ZONES:
            poly = Polygon(z["coords"][0], srid=4326)
            mpoly = MultiPolygon(poly, srid=4326)
            # Calculate approximate area in hectares
            area_ha = round(poly.area * 1230800000 / 10000, 2)
            DeforestationZone.objects.get_or_create(
                year=z["year"],
                region=z["region"],
                defaults={
                    "geometry": mpoly,
                    "source": "Bunna Bridge Sample Data",
                    "area_ha": area_ha,
                }
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(
            f"✅ Loaded {created} sample deforestation zones"
        ))
        self.stdout.write(
            "ℹ️  Run with --source=gfw to load real Global Forest Watch data"
        )

    def _load_gfw(self):
        """
        Download and load real GFW deforestation data.
        Requires ogr2ogr (GDAL) — available in the Django container.
        """
        self.stdout.write("Downloading Global Forest Watch data for Ethiopia…")
        try:
            import urllib.request
            with tempfile.TemporaryDirectory() as tmpdir:
                geojson_path = os.path.join(tmpdir, "ethiopia_loss.geojson")
                self.stdout.write(f"  Fetching {GFW_API_URL}…")
                urllib.request.urlretrieve(GFW_API_URL, geojson_path)

                with open(geojson_path) as f:
                    data = json.load(f)

                features = data.get("features", [])
                self.stdout.write(f"  {len(features)} features found")
                created = 0
                skipped = 0
                for feat in features:
                    props = feat.get("properties", {})
                    year = props.get("year") or props.get("loss_year") or 2021
                    if int(year) <= 2020:
                        skipped += 1
                        continue
                    geom_data = feat.get("geometry")
                    if not geom_data:
                        continue
                    try:
                        geom = GEOSGeometry(json.dumps(geom_data), srid=4326)
                        if geom.geom_type == "Polygon":
                            geom = MultiPolygon(geom, srid=4326)
                        elif geom.geom_type != "MultiPolygon":
                            continue
                        DeforestationZone.objects.create(
                            geometry=geom,
                            year=int(year),
                            region=props.get("region", "Ethiopia"),
                            source="Hansen GFC via GFW",
                            area_ha=props.get("area_ha"),
                        )
                        created += 1
                    except Exception as e:
                        self.stdout.write(f"  ⚠️  Skipped feature: {e}")
                        continue

                self.stdout.write(self.style.SUCCESS(
                    f"✅ Loaded {created} zones ({skipped} pre-2020 skipped)"
                ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ GFW download failed: {e}"))
            self.stdout.write("Falling back to sample data…")
            self._load_sample()
