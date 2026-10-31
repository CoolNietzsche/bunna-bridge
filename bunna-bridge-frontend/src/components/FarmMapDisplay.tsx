import { useEffect, useRef } from "react";
import { ringAreaHa } from "../api/boundary";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPolygon } from "../api/boundary";
import { AT } from "../styles/adminTokens";

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
      color: AT.color.primary,
      fillColor: AT.color.primary,
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map);

    map.fitBounds(poly.getBounds(), { padding: [24, 24] });
    leafletMap.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    return () => { map.remove(); leafletMap.current = null; };
  }, [polygon]);

  const coords = polygon.coordinates[0];
  const areaHa = ringAreaHa(coords as number[][]);

  return (
    <div style={{ borderRadius: AT.radius.lg, overflow: "hidden", border: `1px solid ${AT.color.border}` }}>
      {label && (
        <div style={{
          background: AT.color.surface, padding: "8px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px",
        }}>
          <span style={{ fontFamily: AT.font.sans, fontSize: 14, fontWeight: 600, color: AT.color.text }}>
            {label}
          </span>
          <span style={{ fontFamily: AT.font.mono, fontSize: 11, color: AT.color.primaryDark }}>
            ~{areaHa} ha · {coords.length - 1} pts
          </span>
        </div>
      )}
      <div ref={mapRef} style={{ height, width: "100%" }} />
    </div>
  );
}
