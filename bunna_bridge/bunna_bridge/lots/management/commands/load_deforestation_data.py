"""
Management command to load Hansen Global Forest Change deforestation
data for Ethiopia into the DeforestationZone table.

Usage:
  python manage.py load_deforestation_data --source=gfw --clear
  python manage.py load_deforestation_data --source=sample
"""
import json
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from bunna_bridge.lots.deforestation import DeforestationZone

ETHIOPIA_BBOX = (33.0, 3.4, 47.9, 14.9)
EUDR_CUTOFF_YEAR = 2020
GFW_FILE = "/tmp/hansen/ethiopia_deforestation.geojson"

SAMPLE_ZONES = [
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

def decode_loss_year(raw):
    """Hansen encodes year as 1=2001 ... 24=2024. 0 = no loss."""
    try:
        v = int(raw)
        return (2000 + v) if v > 0 else None
    except (TypeError, ValueError):
        return None

class Command(BaseCommand):
    help = "Load Ethiopia Hansen GFC deforestation zone data into PostGIS"

    def add_arguments(self, parser):
        parser.add_argument(
            "--source", choices=["sample", "gfw"], default="sample",
        )
        parser.add_argument(
            "--file", type=str, default=GFW_FILE,
            help="Path to GeoJSON produced by gdal_polygonize",
        )
        parser.add_argument(
            "--clear", action="store_true",
            help="Clear existing zones before loading",
        )
        parser.add_argument(
            "--batch-size", type=int, default=500,
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = DeforestationZone.objects.all().delete()[0]
            self.stdout.write(f"Cleared {count} existing zones")

        if options["source"] == "sample":
            self._load_sample()
        else:
            self._load_gfw(options["file"], options["batch_size"])

    def _load_sample(self):
        self.stdout.write("Loading built-in sample deforestation zones...")
        created = 0
        for z in SAMPLE_ZONES:
            poly = Polygon(z["coords"][0], srid=4326)
            mpoly = MultiPolygon(poly, srid=4326)
            area_ha = round(poly.area * 1230800000 / 10000, 2)
            DeforestationZone.objects.get_or_create(
                year=z["year"], region=z["region"],
                defaults={"geometry": mpoly, "source": "Bunna Bridge Sample Data", "area_ha": area_ha},
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Loaded {created} sample zones"))

    def _load_gfw(self, file_path, batch_size):
        self.stdout.write(f"Loading Hansen GFC data from {file_path}...")

        self.stdout.write("  Reading file (this may take a minute)...")
        with open(file_path, 'r') as f:
            raw = f.read()

        self.stdout.write("  Parsing features...")
        lines = raw.splitlines()
        del raw

        feature_lines = [l.strip().rstrip(',') for l in lines
                         if l.strip().startswith('{ "type": "Feature"')]
        del lines
        self.stdout.write(f"  {len(feature_lines):,} features found")

        min_lon, min_lat, max_lon, max_lat = ETHIOPIA_BBOX
        batch = []
        created = 0
        skipped_year = skipped_bbox = skipped_geom = 0

        for i, line in enumerate(feature_lines):
            if i % 20000 == 0 and i > 0:
                self.stdout.write(
                    f"  ... {i:,} / {len(feature_lines):,} processed, {created:,} loaded so far"
                )

            try:
                feat = json.loads(line)
            except json.JSONDecodeError:
                skipped_geom += 1
                continue

            props = feat.get("properties", {})
            raw_val = props.get("loss_year") or props.get("DN") or props.get("lossyear") or 0
            year = decode_loss_year(raw_val)

            if year is None or year <= EUDR_CUTOFF_YEAR:
                skipped_year += 1
                continue

            geom_data = feat.get("geometry")
            if not geom_data:
                skipped_geom += 1
                continue

            try:
                geom = GEOSGeometry(json.dumps(geom_data), srid=4326)

                cx = geom.centroid.x
                cy = geom.centroid.y
                if not (min_lon <= cx <= max_lon and min_lat <= cy <= max_lat):
                    skipped_bbox += 1
                    continue

                if geom.geom_type == "Polygon":
                    geom = MultiPolygon(geom, srid=4326)
                elif geom.geom_type != "MultiPolygon":
                    skipped_geom += 1
                    continue

                batch.append(DeforestationZone(
                    geometry=geom,
                    year=year,
                    region="Ethiopia",
                    source="Hansen GFC v1.12 (2024)",
                    area_ha=round(geom.area * 1230800000 / 10000, 4),
                ))

                if len(batch) >= batch_size:
                    DeforestationZone.objects.bulk_create(batch, ignore_conflicts=True)
                    created += len(batch)
                    batch = []

            except Exception:
                skipped_geom += 1
                continue

        if batch:
            DeforestationZone.objects.bulk_create(batch, ignore_conflicts=True)
            created += len(batch)

        self.stdout.write(self.style.SUCCESS(
            f"Loaded {created:,} deforestation zones into PostGIS"
        ))
        self.stdout.write(
            f"   Skipped: {skipped_year:,} pre-2021 | "
            f"{skipped_bbox:,} outside Ethiopia bbox | "
            f"{skipped_geom:,} bad geometry"
        )
