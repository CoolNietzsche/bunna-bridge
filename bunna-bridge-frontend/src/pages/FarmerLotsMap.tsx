import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getLots } from "../api/lots";
import AdminShell from "../components/admin/AdminShell";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function FarmerLotsMap() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lots-map"],
    queryFn: () => getLots({}),
  });

  useEffect(() => {
    if (!mapRef.current || leafletMap.current || isLoading) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    }).setView([8.5, 39.5], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    leafletMap.current = map;
    setTimeout(() => map.invalidateSize(), 150);

    const bounds: L.LatLngBounds[] = [];

    data?.results.forEach((lot) => {
      const color = lot.export_ready ? AT.color.primary :
        lot.eudr_dds_ready ? AT.color.blue : AT.color.yellow;

      if (lot.boundary) {
        const coords = lot.boundary.coordinates[0];
        const latlngs = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
        const poly = L.polygon(latlngs, {
          color,
          fillColor: color,
          fillOpacity: 0.2,
          weight: 2,
        }).addTo(map);

        poly.bindPopup(`
          <div style="font-family: ${AT.font.mono}; font-size: 12px; min-width: 180px;">
            <strong style="color: ${AT.color.primaryDark}">${lot.lot_id}</strong><br/>
            ${lot.name}<br/>
            <span style="color: #888">${lot.region} · ${lot.grade}</span><br/>
            ${lot.sca_score ? `SCA: ${lot.sca_score} pts<br/>` : ""}
            <span style="color: ${color}">${lot.export_ready ? "✅ Export Ready" : lot.eudr_dds_ready ? "⏳ EUDR Ready" : "⚠️ Gates Pending"}</span>
          </div>
        `);

        poly.on("click", () => navigate(`/lots/${lot.id}`));
        bounds.push(poly.getBounds());

      } else if (lot.gps_lat && lot.gps_lng) {
        const marker = L.circleMarker([lot.gps_lat, lot.gps_lng], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 2,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: ${AT.font.mono}; font-size: 12px; min-width: 180px;">
            <strong style="color: ${AT.color.primaryDark}">${lot.lot_id}</strong><br/>
            ${lot.name}<br/>
            <span style="color: #888">${lot.region} · ${lot.grade}</span><br/>
            <span style="color: #888; font-size: 11px">GPS point only — no boundary</span>
          </div>
        `);

        marker.on("click", () => navigate(`/lots/${lot.id}`));
      }
    });

    if (bounds.length > 0) {
      const combined = bounds.reduce((acc, b) => acc.extend(b), bounds[0]);
      map.fitBounds(combined, { padding: [40, 40] });
    }

    return () => { map.remove(); leafletMap.current = null; };
  }, [data, isLoading]);

  const total = data?.results.length ?? 0;
  const withBound = data?.results.filter((l) => l.boundary).length ?? 0;
  const withGps = data?.results.filter((l) => !l.boundary && l.gps_lat).length ?? 0;
  const noBound = total - withBound - withGps;

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>GPS & boundary overview · All lots</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Lot Boundary Map</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "Total Lots", val: total, color: AT.color.text },
          { label: "With Boundary", val: withBound, color: AT.color.primaryDark },
          { label: "GPS Point Only", val: withGps, color: AT.color.blue },
          { label: "No Location", val: noBound, color: AT.color.yellow },
        ].map((s) => (
          <div key={s.label} style={{ ...AC.card, ...AC.cardPad }}>
            <div style={{ fontFamily: AT.font.sans, fontSize: "1.3rem", color: s.color, fontWeight: 700 }}>{s.val}</div>
            <div style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
        {[
          { color: AT.color.primary, label: "Export Ready" },
          { color: AT.color.blue, label: "EUDR Ready" },
          { color: AT.color.yellow, label: "Gates Pending" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: AT.radius.sm, background: l.color }} />
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textMuted }}>{l.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: AT.color.blue, opacity: 0.7 }} />
          <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textMuted }}>GPS Point Only</span>
        </div>
      </div>

      {isLoading && (
        <div style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, padding: "48px", textAlign: "center" }}>
          Loading lot data…
        </div>
      )}

      <div ref={mapRef} style={{
        height: "calc(100vh - 400px)", minHeight: "360px",
        borderRadius: AT.radius.lg, border: `1px solid ${AT.color.border}`,
        background: AT.color.surfaceSecondary,
      }} />

      <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textDisabled, marginTop: "8px" }}>
        Click any lot to view details · Polygons shown where boundary captured · Circles where GPS point only
      </p>
    </AdminShell>
  );
}
