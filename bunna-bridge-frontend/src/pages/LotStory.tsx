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
import { originGradient, titleCase } from "../lib/utils";
import { T } from "../styles/tokens";

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
      radius: 10, color: T.color.clay, fillColor: T.color.clay, fillOpacity: 0.5, weight: 2,
    }).addTo(map);
    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, [lat, lng]);

  return <div ref={mapRef} style={{ height: 220, width: "100%", borderRadius: 6, overflow: "hidden" }} />;
}

function CertBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-forest-light border border-forest/15 rounded-[3px] px-2.5 py-1 text-[0.7rem] font-sans font-medium text-forest">
      {icon} {label}
    </span>
  );
}

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
    QRCode.toDataURL(window.location.href, { margin: 1, width: 240, color: { dark: "#1C1C1A", light: "#00000000" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <p className="font-mono text-[0.7rem] tracking-[0.15em] uppercase text-ink/40">Loading lot story…</p>
      </div>
    );
  }

  if (isError || !lot) {
    return (
      <div className="min-h-screen bg-linen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <img src={logoFull} alt="Beersheba" className="h-10 opacity-60" />
        <p className="font-sans text-sm text-ink/60 max-w-sm">
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
    <div className="min-h-screen bg-linen">
      {/* Top bar */}
      <div className="border-b border-border bg-white">
        <div className="max-w-[720px] mx-auto px-5 py-4 flex items-center justify-between">
          <img src={logoFull} alt="Beersheba" className="h-8" />
          <span className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-ink/35">Lot Story</span>
        </div>
      </div>

      {/* Hero — origin-gradient banner, no photography */}
      <div className="relative overflow-hidden" style={{ background: originGradient(lot.region) }}>
        <svg viewBox="0 0 400 300" aria-hidden className="absolute -right-10 -top-10 w-72 opacity-10">
          <path d="M200 40c80-16 128 32 120 112-72 0-128-40-120-112Z" fill="#FFFFFF" />
        </svg>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,20,15,0.45), transparent 65%)" }} />
        <div className="relative max-w-[720px] mx-auto px-5 pt-10 pb-8">
          <p className="font-mono text-[0.65rem] tracking-[0.15em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.85)" }}>
            {lot.lot_id} · {lot.exporter_company || "Ethiopian Exporter"}
          </p>
          <h1 className="font-display text-[2.6rem] leading-[1.02] font-normal text-white mb-3" style={{ letterSpacing: "-0.01em" }}>
            {lot.name}
          </h1>
          <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.85)" }}>
            <MapPin size={14} />
            <span className="font-sans text-sm">
              {titleCase(lot.region)}{lot.washing_station ? ` · ${lot.washing_station}` : ""} · {lot.altitude_m}m
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-5 py-8">
        {/* Quality + compliance strip */}
        <div className="flex flex-wrap gap-2 mb-6">
          {lot.latest_sca_score != null && (
            <span className="inline-flex items-center gap-1.5 bg-white border border-border-strong rounded-[3px] px-3 py-1.5 font-mono text-[0.75rem] text-ink">
              <Coffee size={13} className="text-coffee" /> {Number(lot.latest_sca_score).toFixed(1)} pts
              {lot.latest_q_grader ? ` · ${lot.latest_q_grader}` : ""}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 font-mono text-[0.75rem] border ${
            lot.export_ready
              ? "bg-forest-light border-forest/20 text-forest"
              : "bg-white border-border-strong text-slate"
          }`}>
            <ShieldCheck size={13} /> {lot.compliance_score}/7 EUDR Gates {lot.export_ready ? "— Export Ready" : "Passed"}
          </span>
          {certs}
        </div>

        {/* Map */}
        {(lot.boundary_geojson || lot.farm_location_geojson) && (
          <div className="mb-6 rounded-md overflow-hidden border border-border">
            {lot.boundary_geojson ? (
              <FarmMapDisplay polygon={lot.boundary_geojson} height={240} />
            ) : lot.farm_location_geojson ? (
              <PointMap
                lng={lot.farm_location_geojson.coordinates[0]}
                lat={lot.farm_location_geojson.coordinates[1]}
              />
            ) : null}
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 bg-white border border-border rounded-md p-5">
          {[
            ["Processing", lot.processing],
            ["Grade", lot.grade],
            ["Varietal", lot.varietal],
            ["Harvest Date", lot.harvest_date],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="font-mono text-[0.58rem] tracking-[0.12em] uppercase text-ink/35 mb-0.5">{label}</p>
              <p className="font-sans text-sm text-ink capitalize">{val || "—"}</p>
            </div>
          ))}
        </div>

        {(lot.tasting_notes || lot.flavor_notes) && (
          <blockquote className="border-l-2 border-coffee pl-4 mb-6 font-display text-lg italic text-ink/80">
            "{lot.tasting_notes || lot.flavor_notes}"
          </blockquote>
        )}

        {lot.farm_story && (
          <div className="mb-6">
            <p className="font-mono text-[0.58rem] tracking-[0.15em] uppercase text-ink/35 mb-2">Farm Story</p>
            <p className="font-sans text-sm leading-relaxed text-slate">{lot.farm_story}</p>
          </div>
        )}

        {lot.farm_photos?.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {lot.farm_photos.map((src, i) => (
              <img key={i} src={src} alt={`${lot.name} farm ${i + 1}`} className="w-full h-24 object-cover rounded-[3px]" />
            ))}
          </div>
        )}

        {/* QR / share */}
        <div className="flex items-center gap-4 bg-white border border-border rounded-md p-5 mb-6">
          {qrDataUrl && <img src={qrDataUrl} alt="QR code linking to this lot's story" width={88} height={88} />}
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[0.65rem] tracking-[0.1em] uppercase text-ink/50 mb-1">
              <QrCode size={13} /> Scan to verify
            </p>
            <p className="font-sans text-[0.8rem] text-slate">
              This page is this lot's permanent, publicly verifiable record on Beersheba.
            </p>
          </div>
        </div>

        <p className="text-center font-mono text-[0.55rem] tracking-[0.12em] uppercase text-ink/25 pb-8">
          Verified by Beersheba — Ethiopian Coffee Export Platform
        </p>
      </div>
    </div>
  );
}
