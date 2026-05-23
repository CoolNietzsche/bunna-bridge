"""
Custom Django admin view — Farm Boundary Overview Map
Accessible at /admin/lots/map/
Shows all lots and farm boundaries on a single Leaflet map.
Color coded by deforestation status.
"""
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.views import View
from django.http import HttpResponse
from django.core.serializers import serialize
from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.deforestation import DeforestationZone
import json


@method_decorator(staff_member_required, name="dispatch")
class FarmBoundaryMapView(View):

    def get(self, request):
        # Build lot data for the map
        lots_data = []
        for lot in CoffeeLot.objects.select_related("exporter").all():
            boundary_geojson = None
            if lot.boundary:
                boundary_geojson = json.loads(lot.boundary.geojson)

            # Point fallback
            point_geojson = None
            if lot.farm_location:
                point_geojson = json.loads(lot.farm_location.geojson)

            # Deforestation status color
            if lot.boundary:
                if lot.deforestation_free:
                    color = "#4A7C59"   # sage green — clear
                    status_label = "Clear"
                else:
                    color = "#C1440E"   # terracotta — overlap or fail
                    status_label = "Overlap / Fail"
            else:
                color = "#C9952A"       # gold — pending
                status_label = "Pending"

            lots_data.append({
                "id": str(lot.id),
                "lot_id": lot.lot_id,
                "name": lot.name,
                "region": lot.region,
                "status": lot.status,
                "sca_score": str(lot.sca_score) if lot.sca_score else "—",
                "exporter": lot.exporter.get_full_name() or lot.exporter.email,
                "deforestation_free": lot.deforestation_free,
                "deforestation_status": status_label,
                "color": color,
                "boundary": boundary_geojson,
                "point": point_geojson,
            })

        # Deforestation zones for overlay
        zones_data = []
        for zone in DeforestationZone.objects.all():
            zones_data.append({
                "id": zone.id,
                "year": zone.year,
                "region": zone.region,
                "area_ha": zone.area_ha,
                "geojson": json.loads(zone.geometry.geojson),
            })

        html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Farm Boundary Map — Bunna Bridge Admin</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: 'Instrument Sans', sans-serif; background: #1A0F07; color: #F5EDD8; }}
    #header {{
      padding: 16px 24px;
      background: #2C1810;
      border-bottom: 1px solid rgba(201,149,42,0.2);
      display: flex; align-items: center; justify-content: space-between;
    }}
    #header h1 {{ font-size: 18px; font-weight: 500; letter-spacing: 0.05em; }}
    #header a {{ color: #D4824A; font-size: 13px; text-decoration: none; }}
    #map {{ height: calc(100vh - 120px); width: 100%; }}
    #legend {{
      padding: 12px 24px;
      background: #2C1810;
      border-top: 1px solid rgba(201,149,42,0.15);
      display: flex; gap: 24px; align-items: center; font-size: 12px;
    }}
    .legend-item {{ display: flex; align-items: center; gap: 6px; }}
    .legend-dot {{ width: 12px; height: 12px; border-radius: 50%; }}
    .popup-title {{ font-weight: 600; font-size: 14px; margin-bottom: 6px; }}
    .popup-row {{ font-size: 12px; margin-bottom: 3px; color: #555; }}
    .popup-badge {{
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600; margin-top: 4px;
    }}
    .badge-clear {{ background: #d4edda; color: #1E3A2F; }}
    .badge-overlap {{ background: #f8d7da; color: #C1440E; }}
    .badge-pending {{ background: #fff3cd; color: #856404; }}
  </style>
</head>
<body>
  <div id="header">
    <h1>☕ Bunna Bridge — Farm Boundary Overview</h1>
    <a href="/admin/">← Back to Admin</a>
  </div>
  <div id="map"></div>
  <div id="legend">
    <span style="font-size:12px; color: rgba(245,237,216,0.5);">LEGEND:</span>
    <div class="legend-item">
      <div class="legend-dot" style="background:#4A7C59"></div>
      <span>Deforestation Clear</span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:#C1440E"></div>
      <span>Overlap / Fail</span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:#C9952A"></div>
      <span>Pending (no boundary)</span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background: rgba(193,68,14,0.3); border: 1px solid #C1440E;"></div>
      <span>Deforestation Zone (post-2020)</span>
    </div>
    <span style="margin-left:auto; color: rgba(245,237,216,0.4); font-size:11px;">
      {len(lots_data)} lots · {len(zones_data)} deforestation zones loaded
    </span>
  </div>

  <script>
    const lots = {json.dumps(lots_data)};
    const zones = {json.dumps(zones_data)};

    const map = L.map('map').setView([8.5, 39.0], 7);
    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }}).addTo(map);

    // Draw deforestation zones first (underneath)
    zones.forEach(z => {{
      L.geoJSON(z.geojson, {{
        style: {{
          color: '#C1440E',
          fillColor: '#C1440E',
          fillOpacity: 0.12,
          weight: 1,
          dashArray: '4,4',
        }}
      }}).bindPopup(
        '<div class="popup-title">⚠️ Deforestation Zone</div>' +
        '<div class="popup-row">Year: ' + z.year + '</div>' +
        '<div class="popup-row">Region: ' + z.region + '</div>' +
        '<div class="popup-row">Area: ~' + z.area_ha + ' ha</div>'
      ).addTo(map);
    }});

    // Draw lot boundaries and points
    const bounds = [];
    lots.forEach(lot => {{
      const popupHtml =
        '<div class="popup-title">' + lot.lot_id + ' — ' + lot.name + '</div>' +
        '<div class="popup-row">Region: ' + lot.region + '</div>' +
        '<div class="popup-row">Exporter: ' + lot.exporter + '</div>' +
        '<div class="popup-row">Status: ' + lot.status + '</div>' +
        '<div class="popup-row">SCA Score: ' + lot.sca_score + '</div>' +
        '<span class="popup-badge badge-' + (lot.deforestation_free === true ? 'clear' : lot.deforestation_free === false ? 'overlap' : 'pending') + '">' +
        lot.deforestation_status + '</span>' +
        '<br><a href="/admin/lots/coffeelot/' + lot.id + '/change/" ' +
        'style="font-size:11px;color:#C1440E;margin-top:6px;display:inline-block;">Edit in Admin →</a>';

      if (lot.boundary) {{
        const layer = L.geoJSON(lot.boundary, {{
          style: {{
            color: lot.color,
            fillColor: lot.color,
            fillOpacity: 0.2,
            weight: 2,
          }}
        }}).bindPopup(popupHtml).addTo(map);
        bounds.push(layer.getBounds());
      }} else if (lot.point) {{
        // No boundary yet — show a marker
        const marker = L.circleMarker(
          [lot.point.coordinates[1], lot.point.coordinates[0]],
          {{ radius: 8, color: lot.color, fillColor: lot.color, fillOpacity: 0.7, weight: 2 }}
        ).bindPopup(popupHtml).addTo(map);
        bounds.push(L.latLngBounds(
          [lot.point.coordinates[1] - 0.01, lot.point.coordinates[0] - 0.01],
          [lot.point.coordinates[1] + 0.01, lot.point.coordinates[0] + 0.01]
        ));
      }}
    }});

    // Fit map to all features
    if (bounds.length > 0) {{
      const combined = bounds.reduce((acc, b) => acc.extend(b));
      map.fitBounds(combined, {{ padding: [40, 40] }});
    }}
  </script>
</body>
</html>"""
        return HttpResponse(html)
