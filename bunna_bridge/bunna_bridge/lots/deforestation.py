from django.contrib.gis.db import models as gis_models
from django.db import models


class DeforestationZone(models.Model):
    """
    Stores polygons of deforested areas in Ethiopia (post-2020).
    Sourced from Hansen Global Forest Change / Global Forest Watch.
    Used for EUDR Gate 1 — deforestation_free compliance check.
    """
    geometry    = gis_models.MultiPolygonField(srid=4326, geography=True)
    year        = models.IntegerField(help_text="Year deforestation was detected")
    source      = models.CharField(max_length=100, default="Hansen GFC")
    region      = models.CharField(max_length=100, blank=True)
    area_ha     = models.FloatField(null=True, blank=True)

    class Meta:
        app_label = 'lots'
        indexes = [
            models.Index(fields=["year"]),
        ]

    def __str__(self):
        return f"DeforestationZone {self.id} ({self.year}, {self.region})"
