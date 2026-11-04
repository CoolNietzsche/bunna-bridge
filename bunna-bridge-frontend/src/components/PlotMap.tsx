import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DeforestationStatus, GeoPoint, GeoPolygon } from "../api/traceability";
import { AT } from "../styles/adminTokens";

export interface MapPlot {
  id: string;
  label: string;
  geometry: GeoPoint | GeoPolygon | null;
  status: DeforestationStatus;
}

interface Props {
  plots: MapPlot[];
  height?: number;
  /** When set, clicks on the map add a point (point mode) or polygon vertices. */
  drawMode?: "point" | "polygon" | null;
  draft?: [number, number][]; // [lng, lat] vertices or a single point
  onDraftChange?: (draft: [number, number][]) => void;
  onSelect?: (id: string) => void;
}

const STATUS_COLOR: Record<DeforestationStatus, string> = {
  clear: AT.color.green,
  overlap: AT.color.red,
  pending: AT.color.yellow,
  no_data: AT.color.textMuted,
};

/**
 * Leaflet map of plots (points and polygons) coloured by deforestation
 * check result, with a simple click-to-draw mode for new plots. Leaflet
 * renders outside React, so styling uses inline token values.
 */
export default function PlotMap({ plots, height = 320, drawMode = null, draft = [], onDraftChange, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const plotLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  const handlers = useRef({ drawMode, draft, onDraftChange });
  useEffect(() => {
    handlers.current = { drawMode, draft, onDraftChange };
  }, [drawMode, draft, onDraftChange]);

  useEffect(() => {
    if (!ref.current || map.current) return;
    const m = L.map(ref.current, { scrollWheelZoom: false, attributionControl: false }).setView([7.5, 38.7], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
    plotLayer.current = L.layerGroup().addTo(m);
    draftLayer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => {
      const { drawMode: mode, draft: current, onDraftChange: cb } = handlers.current;
      if (!mode || !cb) return;
      const pt: [number, number] = [Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6))];
      cb(mode === "point" ? [pt] : [...current, pt]);
    });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // Existing plots
  useEffect(() => {
    const m = map.current;
    const layer = plotLayer.current;
    if (!m || !layer) return;
    layer.clearLayers();
    const bounds = L.latLngBounds([]);
    plots.forEach((p) => {
      if (!p.geometry) return;
      const color = STATUS_COLOR[p.status] ?? AT.color.textMuted;
      let shape: L.Layer;
      if (p.geometry.type === "Point") {
        const [lng, lat] = p.geometry.coordinates;
        shape = L.circleMarker([lat, lng], { radius: 7, color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.95 });
        bounds.extend([lat, lng]);
      } else {
        const latlngs = p.geometry.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
        shape = L.polygon(latlngs, { color, weight: 2, fillColor: color, fillOpacity: 0.18 });
        latlngs.forEach((ll) => bounds.extend(ll));
      }
      (shape as L.Path).bindTooltip(p.label, { direction: "top" });
      if (onSelect) (shape as L.Path).on("click", () => onSelect(p.id));
      layer.addLayer(shape);
    });
    if (bounds.isValid()) m.fitBounds(bounds.pad(0.4), { maxZoom: 15 });
  }, [plots, onSelect]);

  // Draft geometry being drawn
  useEffect(() => {
    const layer = draftLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const latlngs = draft.map(([lng, lat]) => [lat, lng] as [number, number]);
    latlngs.forEach((ll) =>
      layer.addLayer(L.circleMarker(ll, { radius: 5, color: AT.color.blue, weight: 2, fillColor: "#fff", fillOpacity: 1 })),
    );
    if (drawMode === "polygon" && latlngs.length >= 2) {
      layer.addLayer(L.polygon(latlngs, { color: AT.color.blue, weight: 2, dashArray: "4 4", fillOpacity: 0.1 }));
    }
  }, [draft, drawMode]);

  useEffect(() => {
    if (ref.current) ref.current.style.cursor = drawMode ? "crosshair" : "";
  }, [drawMode]);

  return (
    <div
      ref={ref}
      style={{ height, borderRadius: AT.radius.md, overflow: "hidden", border: `1px solid ${AT.color.border}`, zIndex: 0 }}
    />
  );
}
