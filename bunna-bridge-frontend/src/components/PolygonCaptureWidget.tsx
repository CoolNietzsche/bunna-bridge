import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPolygon } from "../api/boundary";
import { setLotBoundary, setFarmBoundary, inheritLotBoundary, calcAreaHa, queueBoundarySync } from "../api/boundary";

// Fix Leaflet default marker icons (broken in Vite)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Mode = "walk" | "pin" | "import";

interface Props {
  mode: "lot" | "farm";
  lotId?: string;
  existingPolygon?: GeoPolygon | null;
  onSaved?: (polygon: GeoPolygon) => void;
  canInherit?: boolean; // show "inherit from farm" button
}

export default function PolygonCaptureWidget({
  mode, lotId, existingPolygon, onSaved, canInherit,
}: Props) {
  const [tab, setTab] = useState<Mode>("pin");
  const [points, setPoints] = useState<[number, number][]>([]);
  const [polygon, setPolygon] = useState<GeoPolygon | null>(existingPolygon || null);
  const [walking, setWalking] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const polyLayer = useRef<L.Polygon | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const watchId = useRef<number | null>(null);

  // Online/offline detection
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([8.5, 39.5], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    leafletMap.current = map;

    // Fix tile misalignment on first render
    setTimeout(() => map.invalidateSize(), 150);

    // If existing polygon, draw it
    if (existingPolygon) drawPolygon(existingPolygon.coordinates[0] as [number,number][], map);

    return () => { map.remove(); leafletMap.current = null; };
  }, []);

  // Pin mode — click map to add points
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    if (tab !== "pin") { map.off("click"); return; }

    const handler = (e: L.LeafletMouseEvent) => {
      const pt: [number, number] = [e.latlng.lng, e.latlng.lat];
      setPoints(prev => {
        const next = [...prev, pt];
        updateMap(next);
        return next;
      });
    };
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [tab]);

  const updateMap = useCallback((pts: [number, number][]) => {
    const map = leafletMap.current;
    if (!map) return;
    markersLayer.current?.clearLayers();
    pts.forEach(([lng, lat], i) => {
      L.circleMarker([lat, lng], { radius: 6, color: "#C1440E", fillColor: "#D4824A", fillOpacity: 1 })
        .bindTooltip(`${i + 1}`, { permanent: true, className: "point-label" })
        .addTo(markersLayer.current!);
    });
    if (pts.length >= 3) {
      const closed = [...pts, pts[0]];
      const poly: GeoPolygon = { type: "Polygon", coordinates: [closed] };
      drawPolygon(closed, map);
      setPolygon(poly);
    }
  }, []);

  const drawPolygon = (coords: [number, number][], map: L.Map) => {
    polyLayer.current?.remove();
    const latlngs = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
    polyLayer.current = L.polygon(latlngs, {
      color: "#C9952A", fillColor: "#C9952A", fillOpacity: 0.2, weight: 2,
    }).addTo(map);
    map.fitBounds(polyLayer.current.getBounds(), { padding: [20, 20] });
  };

  // Walk mode
  const startWalk = () => {
    if (!navigator.geolocation) { setStatus("GPS not available on this device."); return; }
    setPoints([]);
    setPolygon(null);
    polyLayer.current?.remove();
    markersLayer.current?.clearLayers();
    setWalking(true);
    setStatus("Walking… GPS points recording every 4 seconds. Walk the farm boundary.");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setPoints(prev => {
          const last = prev[prev.length - 1];
          // Skip if moved less than 3 meters (avoid duplicates when standing still)
          if (last) {
            const dlat = Math.abs(last[1] - pt[1]);
            const dlng = Math.abs(last[0] - pt[0]);
            if (dlat < 0.00003 && dlng < 0.00003) return prev;
          }
          const next = [...prev, pt];
          updateMap(next);
          // Center map on current position
          leafletMap.current?.setView([pt[1], pt[0]], 17);
          return next;
        });
      },
      (err) => setStatus(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const stopWalk = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    setWalking(false);
    if (points.length >= 3) {
      const closed = [...points, points[0]];
      const poly: GeoPolygon = { type: "Polygon", coordinates: [closed] };
      setPolygon(poly);
      setStatus(`Boundary captured — ${points.length} points, ~${calcAreaHa(poly)} ha`);
    } else {
      setStatus("Need at least 3 points to form a boundary. Try again.");
    }
  };

  // Import file
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        let geo: any;

        if (file.name.endsWith(".kml")) {
          // Parse KML — extract first polygon coordinates
          const parser = new DOMParser();
          const kml = parser.parseFromString(text, "text/xml");
          const coordText = kml.querySelector("coordinates")?.textContent?.trim() || "";
          const coords = coordText.split(/\s+/).map(c => {
            const [lng, lat] = c.split(",").map(Number);
            return [lng, lat] as [number, number];
          }).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
          if (coords.length < 3) throw new Error("No valid coordinates found in KML");
          const closed = [...coords, coords[0]];
          geo = { type: "Polygon", coordinates: [closed] };
        } else {
          // GeoJSON
          const parsed = JSON.parse(text);
          if (parsed.type === "FeatureCollection") geo = parsed.features[0]?.geometry;
          else if (parsed.type === "Feature") geo = parsed.geometry;
          else geo = parsed;
          if (geo?.type !== "Polygon") throw new Error("File must contain a Polygon geometry");
        }

        setPolygon(geo);
        updateMap(geo.coordinates[0]);
        setPoints(geo.coordinates[0]);
        setStatus(`File imported — ~${calcAreaHa(geo)} ha`);
      } catch (err: any) {
        setStatus(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Save
  const handleSave = async () => {
    if (!polygon) return;
    setSaving(true);
    setStatus("Saving…");
    try {
      if (!online) {
        queueBoundarySync(mode, lotId || null, polygon);
        setStatus("📶 No connection — saved locally. Will sync when online.");
        onSaved?.(polygon);
      } else {
        if (mode === "farm") await setFarmBoundary(polygon);
        else if (mode === "lot" && lotId) await setLotBoundary(lotId, polygon);
        setStatus(`✅ Boundary saved — ~${calcAreaHa(polygon)} ha`);
        onSaved?.(polygon);
      }
    } catch (err: any) {
      queueBoundarySync(mode, lotId || null, polygon);
      setStatus("⚠️ Save failed — stored locally for retry.");
    } finally {
      setSaving(false);
    }
  };

  const handleInherit = async () => {
    if (!lotId) return;
    setSaving(true);
    try {
      await inheritLotBoundary(lotId);
      setStatus("✅ Farm boundary inherited.");
      onSaved?.(polygon!);
    } catch {
      setStatus("No farm boundary found to inherit.");
    } finally {
      setSaving(false);
    }
  };

  const clearPoints = () => {
    setPoints([]);
    setPolygon(null);
    polyLayer.current?.remove();
    markersLayer.current?.clearLayers();
    setStatus("");
  };

  const areaHa = polygon ? calcAreaHa(polygon) : null;

  return (
    <div style={{ background: "#2C1810", borderRadius: 12, padding: 20, color: "#F5EDD8" }}>
      {/* Online indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, fontWeight: 500 }}>
          Farm Boundary
        </span>
        <span style={{
          fontSize: 11, fontFamily: "DM Mono, monospace",
          background: online ? "#1E3A2F" : "#4A2515",
          color: online ? "#A8C5A0" : "#D4824A",
          padding: "3px 10px", borderRadius: 20,
        }}>
          {online ? "● ONLINE" : "● OFFLINE — local save"}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["pin", "walk", "import"] as Mode[]).map(m => (
          <button key={m} onClick={() => { setTab(m); clearPoints(); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
              fontFamily: "Instrument Sans, sans-serif", fontSize: 13, cursor: "pointer",
              background: tab === m ? "#C1440E" : "#4A2515",
              color: tab === m ? "#fff" : "#EDE0C4",
              fontWeight: tab === m ? 600 : 400,
            }}>
            {m === "pin" ? "📍 Pin Corners" : m === "walk" ? "🚶 Walk Boundary" : "📂 Import File"}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div style={{ fontSize: 12, color: "#EDE0C4", marginBottom: 12, fontFamily: "Instrument Sans, sans-serif", lineHeight: 1.5 }}>
        {tab === "pin" && "Tap the map at each corner of the farm. Minimum 3 points. Tap 'Clear' to start over."}
        {tab === "walk" && "Press Start, then walk along the farm boundary. Press Stop when you return to the start."}
        {tab === "import" && "Upload a GeoJSON or KML file exported from another GPS app or government records."}
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: 300, borderRadius: 8, marginBottom: 12, border: "1px solid #4A2515" }} />

      {/* Walk controls */}
      {tab === "walk" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={startWalk} disabled={walking}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: walking ? "#4A2515" : "#1E3A2F", color: "#A8C5A0",
              fontFamily: "Instrument Sans, sans-serif", fontSize: 14, cursor: walking ? "not-allowed" : "pointer",
            }}>
            {walking ? `Recording… (${points.length} pts)` : "▶ Start Walking"}
          </button>
          <button onClick={stopWalk} disabled={!walking}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
              background: !walking ? "#4A2515" : "#C1440E", color: "#fff",
              fontFamily: "Instrument Sans, sans-serif", fontSize: 14, cursor: !walking ? "not-allowed" : "pointer",
            }}>
            ■ Stop & Close
          </button>
        </div>
      )}

      {/* Import file input */}
      {tab === "import" && (
        <div style={{ marginBottom: 12 }}>
          <input type="file" accept=".geojson,.json,.kml"
            onChange={handleFileImport}
            style={{ color: "#F5EDD8", fontFamily: "Instrument Sans, sans-serif", fontSize: 13 }} />
        </div>
      )}

      {/* Stats */}
      {areaHa !== null && (
        <div style={{
          background: "#1E3A2F", borderRadius: 8, padding: "8px 14px",
          marginBottom: 12, fontFamily: "DM Mono, monospace", fontSize: 13, color: "#A8C5A0",
        }}>
          Area: ~{areaHa} ha · {points.length} boundary points
        </div>
      )}

      {/* Status message */}
      {status && (
        <div style={{ fontSize: 12, color: "#D4824A", marginBottom: 12, fontFamily: "Instrument Sans, sans-serif" }}>
          {status}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        {polygon && (
          <button onClick={handleSave} disabled={saving}
            style={{
              flex: 2, padding: "12px 0", borderRadius: 8, border: "none",
              background: "#C1440E", color: "#fff", fontWeight: 600,
              fontFamily: "Instrument Sans, sans-serif", fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
            }}>
            {saving ? "Saving…" : online ? "💾 Save Boundary" : "📥 Save Locally"}
          </button>
        )}
        {canInherit && mode === "lot" && (
          <button onClick={handleInherit} disabled={saving}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #4A7C59",
              background: "transparent", color: "#4A7C59",
              fontFamily: "Instrument Sans, sans-serif", fontSize: 13, cursor: "pointer",
            }}>
            ↙ From Farm
          </button>
        )}
        {points.length > 0 && (
          <button onClick={clearPoints}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #4A2515",
              background: "transparent", color: "#EDE0C4",
              fontFamily: "Instrument Sans, sans-serif", fontSize: 13, cursor: "pointer",
            }}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
