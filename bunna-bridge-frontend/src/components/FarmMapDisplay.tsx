import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPolygon } from "../api/boundary";

interface Props {
  polygon: GeoPolygon;
  height?: number;
  label?: string;
}

export default function FarmMapDisplay({ polygon, height = 220, label }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const coords = polygon.coordinates[0];
    const latlngs = coords.map(([lng, lat]) => [lat, lng] as [number, number]);

    const map = L.map(mapRef.current, {
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const poly = L.polygon(latlngs, {
      color: "#C9952A",
      fillColor: "#C9952A",
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map);

    map.fitBounds(poly.getBounds(), { padding: [24, 24] });
    leafletMap.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => { map.remove(); leafletMap.current = null; };
  }, [polygon]);

  // Calculate area for display
  const coords = polygon.coordinates[0];
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1];
    area -= coords[i + 1][0] * coords[i][1];
  }
  const areaHa = Math.round(Math.abs(area / 2) * 1230800000) / 100;

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(201,149,42,0.25)" }}>
      {label && (
        <div style={{
          background: "#2C1810", padding: "8px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 15, color: "#F5EDD8" }}>
            {label}
          </span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#C9952A" }}>
            ~{areaHa} ha · {coords.length - 1} pts
          </span>
        </div>
      )}
      <div ref={mapRef} style={{ height, width: "100%" }} />
    </div>
  );
}
