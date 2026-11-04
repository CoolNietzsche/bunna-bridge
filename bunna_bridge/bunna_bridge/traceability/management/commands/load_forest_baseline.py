"""
Load a 2020 forest-cover layer (e.g. JRC Global Forest Cover 2020) into
ForestBaseline2020 so every plot also reports how much of it was forest on
the EUDR cut-off date.

The JRC layer is a 10 m raster; vectorise and clip it to the coffee
regions first (see scripts/forest_baseline/README.md), then:

    docker compose -f docker-compose.local.yml run --rm django \\
        python manage.py load_forest_baseline /app/data/gfc2020_sidama.gpkg --tile sidama

Re-running with the same --tile replaces that tile.
"""

from django.contrib.gis.gdal import DataSource
from django.contrib.gis.gdal import OGRGeomType
from django.contrib.gis.geos import MultiPolygon
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction

from bunna_bridge.traceability.models import ForestBaseline2020

BATCH = 1000


class Command(BaseCommand):
    help = "Load 2020 forest-cover polygons (GeoPackage, Shapefile or GeoJSON) into ForestBaseline2020."

    def add_arguments(self, parser):
        parser.add_argument("path")
        parser.add_argument(
            "--tile",
            default="",
            help="Label for this extract; existing rows with it are replaced.",
        )
        parser.add_argument("--source", default="JRC GFC2020 v2")
        parser.add_argument(
            "--recheck",
            action="store_true",
            help="Re-run checks on every plot afterwards.",
        )

    def handle(self, *args, **opts):
        try:
            layer = DataSource(opts["path"])[0]
        except Exception as exc:
            raise CommandError(f"Cannot open {opts['path']}: {exc}") from exc
        polygon_types = {OGRGeomType("Polygon"), OGRGeomType("MultiPolygon")}
        rows = []
        loaded = 0
        with transaction.atomic():
            if opts["tile"]:
                ForestBaseline2020.objects.filter(tile=opts["tile"]).delete()
            for feature in layer:
                geom = feature.geom
                if geom.geom_type not in polygon_types:
                    continue
                geom.transform(4326)
                geos = geom.geos
                if geos.geom_type == "Polygon":
                    geos = MultiPolygon(geos, srid=4326)
                rows.append(
                    ForestBaseline2020(
                        geometry=geos, source=opts["source"], tile=opts["tile"],
                    ),
                )
                if len(rows) >= BATCH:
                    ForestBaseline2020.objects.bulk_create(rows)
                    loaded += len(rows)
                    rows = []
            ForestBaseline2020.objects.bulk_create(rows)
            loaded += len(rows)
        self.stdout.write(
            self.style.SUCCESS(
                f"Loaded {loaded} forest polygons ({opts['source']}, tile '{opts['tile']}').",
            ),
        )
        if opts["recheck"]:
            from django.core.management import call_command

            call_command("recheck_plots", stdout=self.stdout)
