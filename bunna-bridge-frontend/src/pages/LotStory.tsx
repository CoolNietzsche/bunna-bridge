import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import QRCode from "qrcode";
import {
  MapPin, Award, Leaf, TreePine, ShieldCheck, QrCode, Coffee,
} from "lucide-react";
import { getLotStory } from "../api/lots";
import FarmMapDisplay from "../components/FarmMapDisplay";
import logoFull from "../assets/logo-full.png";
import { titleCase } from "../lib/utils";
import { AT } from "../styles/adminTokens";

function PointMap({ lng, lat }: { lng: number; lat: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, {
      zoomControl: true, dragging: true, scrollWheelZoom: false, attributionControl: false,
    }).setView([lat, lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.circleMarker([lat, lng], {
      radius: 10, color: AT.color.primary, fillColor: AT.color.primary, fillOpacity: 0.5, weight: 2,
    }).addTo(map);
    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, [lat, lng]);

  return <div ref={mapRef} style={{ height: 220, width: "100%", borderRadius: AT.radius.md, overflow: "hidden" }} />;
}

function CertBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, borderRadius: AT.radius.sm, padding: "4px 10px", fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500, color: AT.color.primaryDark }}>
      {icon} {label}
    </span>
  );
}

const label: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, margin: "0 0 2px" };
const card: React.CSSProperties = { background: AT.color.surface, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.lg, padding: "20px" };

export default function LotStory() {
  const { id } = useParams<{ id: string }>();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: lot, isLoading, isError } = useQuery({
    queryKey: ["lot-story", id],
    queryFn: () => getLotStory(id as string),
    enabled: !!id,
    retry: false,
  });

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { margin: 1, width: 240, color: { dark: AT.color.text, light: "#00000000" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: AT.color.bodyBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textMuted }}>Loading lot story…</p>
      </div>
    );
  }

  if (isError || !lot) {
    return (
      <div style={{ minHeight: "100vh", background: AT.color.bodyBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", padding: "0 16px", textAlign: "center" }}>
        <img src={logoFull} alt="Beersheba" style={{ height: "40px", opacity: 0.6 }} />
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.9rem", color: AT.color.textMuted, maxWidth: "360px" }}>
          This lot's story isn't available — it may not be listed yet, or the link may be incorrect.
        </p>
      </div>
    );
  }

  const certs = [
    lot.is_organic && <CertBadge key="organic" icon={<Leaf size={12} />} label="Organic" />,
    lot.is_fair_trade && <CertBadge key="fairtrade" icon={<Award size={12} />} label="Fair Trade" />,
    lot.is_rainforest_alliance && <CertBadge key="ra" icon={<TreePine size={12} />} label="Rainforest Alliance" />,
  ].filter(Boolean);

  return (
    <div style={{ minHeight: "100vh", background: AT.color.bodyBg, fontFamily: AT.font.sans }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${AT.color.border}`, background: AT.color.surface }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src={logoFull} alt="Beersheba" style={{ height: "32px" }} />
          <span style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", letterSpacing: "0.06em", textTransform: "uppercase", color: AT.color.textDisabled, fontWeight: 500 }}>Lot Story</span>
        </div>
      </div>

      {/* Header band — flat, teal-accented (Gentelella has no photographic gradients) */}
      <div style={{ background: AT.color.sidebarBg, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "220px", height: "220px", borderRadius: "999px", background: `${AT.color.primary}14` }} />
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "36px 20px 32px", position: "relative" }}>
          <p style={{ fontFamily: AT.font.mono, fontSize: "0.7rem", letterSpacing: "0.06em", color: AT.color.sidebarText, margin: "0 0 8px" }}>
            {lot.lot_id} · {lot.exporter_company || "Ethiopian Exporter"}
          </p>
          <h1 style={{ fontFamily: AT.font.sans, fontSize: "2rem", fontWeight: 700, lineHeight: 1.15, color: "#ffffff", margin: "0 0 10px" }}>
            {lot.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: AT.color.sidebarTextHover }}>
            <MapPin size={14} />
            <span style={{ fontSize: "0.85rem" }}>
              {titleCase(lot.region)}{lot.washing_station ? ` · ${lot.washing_station}` : ""} · {lot.altitude_m}m
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "28px 20px" }}>
        {/* Quality + compliance strip */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
          {lot.latest_sca_score != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: AT.color.surface, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.sm, padding: "6px 12px", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.text }}>
              <Coffee size={13} color={AT.color.primaryDark} /> {Number(lot.latest_sca_score).toFixed(1)} pts
              {lot.latest_q_grader ? ` · ${lot.latest_q_grader}` : ""}
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: AT.radius.sm, padding: "6px 12px", fontFamily: AT.font.sans, fontSize: "0.78rem", border: `1px solid ${lot.export_ready ? AT.color.primary + "33" : AT.color.border}`, background: lot.export_ready ? AT.color.primaryLight : AT.color.surface, color: lot.export_ready ? AT.color.primaryDark : AT.color.textSecondary }}>
            <ShieldCheck size={13} /> {lot.compliance_score}/7 EUDR Gates {lot.export_ready ? "— Export Ready" : "Passed"}
          </span>
          {certs}
        </div>

        {(lot.boundary_geojson || lot.farm_location_geojson) && (
          <div style={{ marginBottom: "20px", borderRadius: AT.radius.lg, overflow: "hidden", border: `1px solid ${AT.color.border}` }}>
            {lot.boundary_geojson ? (
              <FarmMapDisplay polygon={lot.boundary_geojson} height={240} />
            ) : lot.farm_location_geojson ? (
              <PointMap lng={lot.farm_location_geojson.coordinates[0]} lat={lot.farm_location_geojson.coordinates[1]} />
            ) : null}
          </div>
        )}

        <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px", marginBottom: "20px" }}>
          {[
            ["Processing", lot.processing],
            ["Grade", lot.grade],
            ["Varietal", lot.varietal],
            ["Harvest Date", lot.harvest_date],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <p style={label}>{lbl}</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.text, textTransform: "capitalize", margin: 0 }}>{val || "—"}</p>
            </div>
          ))}
        </div>

        {(lot.tasting_notes || lot.flavor_notes) && (
          <blockquote style={{ borderLeft: `3px solid ${AT.color.primary}`, paddingLeft: "16px", marginBottom: "20px", marginLeft: 0, fontFamily: AT.font.sans, fontSize: "1.05rem", fontStyle: "italic", color: AT.color.text, opacity: 0.85 }}>
            "{lot.tasting_notes || lot.flavor_notes}"
          </blockquote>
        )}

        {lot.farm_story && (
          <div style={{ marginBottom: "20px" }}>
            <p style={label}>Farm Story</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", lineHeight: 1.65, color: AT.color.textSecondary, margin: 0 }}>{lot.farm_story}</p>
          </div>
        )}

        {lot.farm_photos?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
            {lot.farm_photos.map((src, i) => (
              <img key={i} src={src} alt={`${lot.name} farm ${i + 1}`} style={{ width: "100%", height: "96px", objectFit: "cover", borderRadius: AT.radius.sm }} />
            ))}
          </div>
        )}

        <div style={{ ...card, display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          {qrDataUrl && <img src={qrDataUrl} alt="QR code linking to this lot's story" width={88} height={88} />}
          <div>
            <p style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: AT.font.sans, fontSize: "0.72rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textMuted, margin: "0 0 4px", fontWeight: 500 }}>
              <QrCode size={13} /> Scan to verify
            </p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textSecondary, margin: 0 }}>
              This page is this lot's permanent, publicly verifiable record on Beersheba.
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", fontFamily: AT.font.sans, fontSize: "0.68rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, paddingBottom: "32px" }}>
          Verified by Beersheba — Ethiopian Coffee Export Platform
        </p>
      </div>
    </div>
  );
}
