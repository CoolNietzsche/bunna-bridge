import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import QRCode from "qrcode";
import {
  Check, CheckCircle2, Circle, Map as MapIcon, MapPin, Mountain, Quote, ShieldCheck, ShoppingBag, X,
} from "lucide-react";
import { getLotStory, type PublicLotStory, type StoryFeature } from "../api/lots";
import { submitLead } from "../api/leads";
const logoMark = "/beersheba-logo.png";
import { titleCase } from "../lib/utils";
import { AT } from "../styles/adminTokens";

// The public lot story: dark, quiet and premium, with gold and white accents.
const S = {
  bg: "#0C0B09",
  surface: "#15130F",
  raised: "#1D1A15",
  line: "rgba(212, 178, 106, 0.22)",
  lineSoft: "rgba(244, 239, 228, 0.09)",
  gold: "#D4B26A",
  goldStrong: "#E6C987",
  text: "#F4EFE4",
  muted: "#ADA493",
  dim: "#8F8776",
  green: "#82CFA0",
  serif: "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif",
  sans: AT.font.sans,
  mono: AT.font.mono,
};

const SATELLITE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_CREDIT = "Imagery © Esri, Maxar, Earthstar Geographics";
const STREETS = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const STREETS_CREDIT = "© OpenStreetMap contributors";

/** Leaflet map of the farm shape and the consented plots, on satellite imagery. */
function StoryMap({ features, interactive, height }: { features: StoryFeature[]; interactive: boolean; height: number | string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [satellite, setSatellite] = useState(true);
  const tiles = useRef<L.TileLayer | null>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || map.current) return;
    const m = L.map(ref.current, {
      zoomControl: interactive, dragging: interactive, scrollWheelZoom: interactive, doubleClickZoom: interactive,
      touchZoom: interactive, boxZoom: interactive, keyboard: interactive, attributionControl: interactive,
    });
    if (interactive) m.attributionControl.setPrefix(false);
    const layer = L.geoJSON({ type: "FeatureCollection", features } as GeoJSON.FeatureCollection, {
      style: (f) => ({
        color: S.goldStrong, weight: f?.properties?.kind === "farm" ? 2.5 : 1.5,
        fillColor: S.gold, fillOpacity: f?.properties?.kind === "farm" ? 0.14 : 0.08, dashArray: f?.properties?.kind === "plot" ? "4 4" : undefined,
      }),
      pointToLayer: (_f, latlng) => L.circleMarker(latlng, { radius: 8, color: S.goldStrong, weight: 2, fillColor: S.gold, fillOpacity: 0.45 }),
    }).addTo(m);
    const bounds = layer.getBounds();
    const size = m.getSize();
    if (bounds.isValid()) {
      const single = bounds.getNorthEast().equals(bounds.getSouthWest());
      if (interactive) {
        if (single) m.setView(bounds.getCenter(), 16);
        else m.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      } else if (single) {
        // Hero: keep the farm in the open upper part, clear of the title.
        m.setView(bounds.getCenter(), 15).panBy([0, Math.round(size.y * 0.22)], { animate: false });
      } else {
        m.fitBounds(bounds, { paddingTopLeft: [32, 90], paddingBottomRight: [32, Math.round(size.y * 0.6)], maxZoom: 16 });
      }
    } else {
      m.setView([7.0, 38.6], 7);
    }
    map.current = m;
    return () => { m.remove(); map.current = null; tiles.current = null; };
  }, [features, interactive]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    tiles.current?.remove();
    tiles.current = L.tileLayer(satellite ? SATELLITE : STREETS, {
      maxZoom: 19, attribution: satellite ? SATELLITE_CREDIT : STREETS_CREDIT,
    }).addTo(m);
    tiles.current.bringToBack();
  }, [satellite]);

  return (
    <div style={{ position: "relative", height, width: "100%", zIndex: 0 }}>
      <div ref={ref} style={{ position: "absolute", inset: 0, background: S.surface }} aria-label="Satellite map of the farm boundary" role="img" />
      {interactive && (
        <div style={{ position: "absolute", top: 12, left: 56, zIndex: 1000, display: "flex", borderRadius: 999, overflow: "hidden", border: `1px solid ${S.line}` }}>
          {[["Satellite", true], ["Map", false]].map(([label, value]) => (
            <button key={String(label)} type="button" onClick={() => setSatellite(value as boolean)}
              aria-pressed={satellite === value}
              style={{ border: 0, padding: "8px 14px", fontFamily: S.sans, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: satellite === value ? S.gold : "rgba(12, 11, 9, 0.82)", color: satellite === value ? S.bg : S.text }}>
              {label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MapOverlay({ lot, onClose }: { lot: PublicLotStory; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const plots = lot.story.map.features.filter((f) => f.properties.kind === "plot").length;
  return (
    <div role="dialog" aria-modal="true" aria-label="Farm boundary map"
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: S.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "calc(12px + env(safe-area-inset-top, 0px)) 16px 12px", borderBottom: `1px solid ${S.lineSoft}` }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontFamily: S.serif, fontSize: 22, color: S.text, lineHeight: 1.1 }}>{lot.name}</p>
          <p style={{ margin: "2px 0 0", fontFamily: S.sans, fontSize: 13, color: S.muted }}>
            {plots > 0 ? `Farm boundary and ${plots} mapped plot${plots === 1 ? "" : "s"} shared with the growers’ consent` : "Farm boundary from GPS"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close map"
          style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 999, border: `1px solid ${S.line}`, background: S.surface, color: S.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={20} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <StoryMap features={lot.story.map.features} interactive height="100%" />
      </div>
    </div>
  );
}

function OrderSheet({ lot, onClose }: { lot: PublicLotStory; onClose: () => void }) {
  const order = lot.story.order!;
  const [f, setF] = useState({ name: "", email: "", phone: "", country: "", quantity: "1", note: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const field: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: `1px solid ${S.lineSoft}`,
    background: S.raised, color: S.text, fontFamily: S.sans, fontSize: 16,
  };
  const label: React.CSSProperties = { display: "grid", gap: 6, fontFamily: S.sans, fontSize: 13, color: S.muted };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      await submitLead({
        role: "other", name: f.name, email: f.email, phone: f.phone, country: f.country,
        company: lot.story.partner_line || "Souvenir order",
        source: `story:${lot.lot_id}`,
        message: `Souvenir order: ${f.quantity} × ${order.detail || order.label}${order.price ? ` (${order.price} each)` : ""} for lot ${lot.story.reference} (${lot.name}).${f.note ? `\n\n${f.note}` : ""}`,
        website: f.website,
      });
      setState("sent");
    } catch {
      setState("idle");
      setError("The request could not be sent. Check your connection and try again.");
    }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label={order.label}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(5, 4, 3, 0.72)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", boxSizing: "border-box", background: S.surface,
        borderTop: `1px solid ${S.line}`, borderRadius: "20px 20px 0 0", padding: "24px 20px calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div>
            <p style={{ margin: 0, fontFamily: S.serif, fontSize: 28, color: S.text, lineHeight: 1.1 }}>{order.label}</p>
            <p style={{ margin: "4px 0 0", fontFamily: S.sans, fontSize: 14, color: S.muted }}>
              {[order.detail, order.price].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 999, border: `1px solid ${S.lineSoft}`, background: "transparent", color: S.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>
        {state === "sent" ? (
          <div style={{ display: "grid", gap: 10, padding: "8px 0 4px" }}>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: S.sans, fontSize: 17, color: S.text }}>
              <CheckCircle2 size={20} color={S.green} /> Request sent
            </p>
            <p style={{ margin: 0, fontFamily: S.sans, fontSize: 15, lineHeight: 1.5, color: S.muted }}>
              We’ll confirm your order and payment by email at {f.email}.
            </p>
          </div>
        ) : (
          <form onSubmit={send} style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, fontFamily: S.sans, fontSize: 14, lineHeight: 1.5, color: S.muted }}>
              Send a request and we’ll confirm availability and payment by email. Nothing is charged now.
            </p>
            <label style={label}>Your name<input required style={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
            <label style={label}>Email<input required type="email" style={field} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
              <label style={label}>Country<input required style={field} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} autoComplete="country-name" /></label>
              <label style={label}>Boxes
                <select style={field} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })}>
                  {["1", "2", "3", "4", "5", "6", "8", "10"].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <label style={label}>Phone or WhatsApp (optional)<input style={field} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></label>
            <label style={label}>Note (optional)<textarea style={{ ...field, minHeight: 72, resize: "vertical" }} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Room number, delivery address or a gift message" /></label>
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })}
              style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
            {error && <p role="alert" style={{ margin: 0, fontFamily: S.sans, fontSize: 14, color: "#F2A7A0" }}>{error}</p>}
            <button type="submit" disabled={state === "sending"}
              style={{ minHeight: 52, borderRadius: 12, border: 0, background: S.gold, color: S.bg, fontFamily: S.sans, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              {state === "sending" ? "Sending…" : "Send order request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 4, padding: "14px 0", borderTop: `1px solid ${S.lineSoft}`, minWidth: 0 }}>
      <span style={{ fontFamily: S.sans, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: S.dim }}>{label}</span>
      <span style={{ fontFamily: S.sans, fontSize: 16, color: S.text, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}

const sectionTitle: React.CSSProperties = { fontFamily: S.serif, fontSize: 30, fontWeight: 500, lineHeight: 1.1, color: S.text, margin: 0 };
const eyebrow: React.CSSProperties = { fontFamily: S.sans, fontSize: 12, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: S.gold, margin: 0 };

export default function LotStory() {
  const { id } = useParams<{ id: string }>();
  const [qr, setQr] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showOrder, setShowOrder] = useState(false);

  const { data: lot, isLoading, isError } = useQuery({
    queryKey: ["lot-story", id],
    queryFn: () => getLotStory(id as string),
    enabled: !!id,
    retry: false,
  });

  useEffect(() => {
    if (!document.getElementById("bb-story-fonts")) {
      const link = document.createElement("link");
      link.id = "bb-story-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&display=swap";
      document.head.appendChild(link);
    }
    const previous = document.body.style.background;
    document.body.style.background = S.bg;
    return () => { document.body.style.background = previous; };
  }, []);

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { margin: 1, width: 240, color: { dark: "#0C0B09", light: "#F4EFE4" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: S.sans, fontSize: 14, color: S.muted }}>Loading the lot story…</p>
      </div>
    );
  }
  if (isError || !lot) {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "0 20px", textAlign: "center" }}>
        <img src={logoMark} alt="Beersheba" width={48} height={48} style={{ borderRadius: 10, background: S.text }} />
        <p style={{ fontFamily: S.sans, fontSize: 15, color: S.muted, maxWidth: 360, lineHeight: 1.5 }}>
          This lot’s story isn’t available. It may not be listed yet, or the link may be wrong.
        </p>
      </div>
    );
  }

  const story = lot.story;
  const features = story.map.features;
  const place = story.place_label || [lot.washing_station, titleCase(lot.region)].filter(Boolean).join(", ");
  const elevation = lot.altitude_m ? `${Number(lot.altitude_m).toLocaleString()} MASL` : null;
  const score = lot.latest_sca_score != null ? `${Number(lot.latest_sca_score).toFixed(2).replace(/\.?0+$/, "")} points` : null;
  const metCount = story.covenant.filter((c) => c.met).length;
  const notes = lot.tasting_notes || lot.flavor_notes;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.sans }}>
      {/* Hero: the partner's picture, or the farm itself from orbit */}
      <header style={{ position: "relative", minHeight: "min(78vh, 620px)", display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {story.hero_image ? (
            <img src={story.hero_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : features.length > 0 ? (
            <StoryMap features={features} interactive={false} height="100%" />
          ) : (
            <div style={{ width: "100%", height: "100%", background: S.surface }} />
          )}
        </div>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(12,11,9,0.78) 0%, rgba(12,11,9,0.05) 26%, rgba(12,11,9,0.25) 55%, rgba(12,11,9,0.96) 92%, #0C0B09 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, padding: "calc(16px + env(safe-area-inset-top, 0px)) max(20px, env(safe-area-inset-right, 0px)) 0 max(20px, env(safe-area-inset-left, 0px))" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <img src={logoMark} alt="" width={30} height={30} style={{ borderRadius: 7, background: S.text }} />
              <span style={{ fontFamily: S.sans, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: S.text }}>Beersheba</span>
            </span>
            <span style={{ fontFamily: S.sans, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: S.text, opacity: 0.85 }}>Lot story</span>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 2, padding: "120px max(20px, env(safe-area-inset-right, 0px)) 36px max(20px, env(safe-area-inset-left, 0px))", pointerEvents: "none" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 14 }}>
            {story.partner_line && <p style={{ ...eyebrow, fontSize: 13 }}>{story.partner_line}</p>}
            <h1 style={{ margin: 0, fontFamily: S.serif, fontWeight: 600, fontSize: "clamp(2.6rem, 9vw, 4.2rem)", lineHeight: 0.98, letterSpacing: "-0.01em", color: S.text, textWrap: "balance" }}>
              {lot.name}
            </h1>
            <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: S.sans, fontSize: 15, fontWeight: 600, color: S.goldStrong }}>
              <ShieldCheck size={18} /> Verified by Beersheba
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: S.sans, fontSize: 16, color: S.text }}>
                <MapPin size={16} color={S.gold} aria-hidden="true" /> {place}
              </p>
              {elevation && (
                <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: S.sans, fontSize: 16, color: S.text }}>
                  <Mountain size={16} color={S.gold} aria-hidden="true" /> Elevation {elevation}
                </p>
              )}
            </div>
          </div>
        </div>
        {!story.hero_image && features.length > 0 && (
          <p style={{ position: "absolute", right: 12, bottom: 8, zIndex: 2, margin: 0, fontFamily: S.sans, fontSize: 11, color: S.dim }}>{SATELLITE_CREDIT}</p>
        )}
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "8px max(20px, env(safe-area-inset-right, 0px)) 48px max(20px, env(safe-area-inset-left, 0px))", display: "grid", gap: 28 }}>
        {/* Coffee specs */}
        <section style={{ background: S.surface, border: `1px solid ${S.line}`, borderRadius: 20, padding: "24px 22px 10px" }} aria-labelledby="specs-title">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
            <h2 id="specs-title" style={sectionTitle}>Coffee specs</h2>
            {score && <span style={{ fontFamily: S.mono, fontSize: 14, color: S.goldStrong }}>{score}{lot.latest_q_grader ? ` · ${lot.latest_q_grader}` : ""}</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", columnGap: 28 }}>
            <SpecRow label="Lot reference" value={<span style={{ fontFamily: S.mono }}>{story.reference}</span>} />
            <SpecRow label="Variety" value={lot.varietal || "—"} />
            <SpecRow label="Process" value={titleCase(lot.processing) || "—"} />
            <SpecRow label="Grade" value={lot.grade || "—"} />
            <SpecRow label="Elevation" value={elevation || "—"} />
            <SpecRow label="Harvest" value={lot.harvest_date ? new Date(lot.harvest_date).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—"} />
            {story.growers && <SpecRow label="Grown by" value={story.growers} />}
            <SpecRow label="Exported by" value={lot.exporter_company || "—"} />
          </div>
          {notes && (
            <p style={{ margin: "8px 0 16px", padding: "18px 0 0", borderTop: `1px solid ${S.lineSoft}`, fontFamily: S.serif, fontStyle: "italic", fontSize: 22, lineHeight: 1.4, color: S.text }}>
              “{notes}”
            </p>
          )}
        </section>

        {/* The covenant: only what the records show is ticked */}
        <section style={{ display: "grid", gap: 16 }} aria-labelledby="covenant-title">
          <div style={{ display: "grid", gap: 6 }}>
            <p style={eyebrow}>{metCount} of {story.covenant.length} confirmed</p>
            <h2 id="covenant-title" style={sectionTitle}>Beersheba Climate Covenant</h2>
            <p style={{ margin: 0, fontFamily: S.sans, fontSize: 14, lineHeight: 1.5, color: S.muted }}>
              Each line is checked by Beersheba against this lot’s own records: satellite forest checks, mapped plots, payments and licences.
            </p>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2, background: S.surface, border: `1px solid ${S.lineSoft}`, borderRadius: 20, overflow: "hidden" }}>
            {story.covenant.map((c) => (
              <li key={c.key} style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: 14, padding: "16px 20px", borderTop: `1px solid ${S.lineSoft}` }}>
                {c.met ? <CheckCircle2 size={24} color={S.green} aria-label="Confirmed" /> : <Circle size={24} color={S.dim} aria-label="Not confirmed yet" />}
                <div style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontFamily: S.sans, fontSize: 16, fontWeight: 600, color: c.met ? S.text : S.muted }}>
                    {c.text}{!c.met && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: S.dim }}>Not yet</span>}
                  </span>
                  <span style={{ fontFamily: S.sans, fontSize: 14, lineHeight: 1.45, color: S.muted }}>{c.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Partner statements: theirs, clearly not Beersheba's */}
        {story.statements && story.statements.items.length > 0 && (
          <section style={{ display: "grid", gap: 14 }} aria-labelledby="statements-title">
            <h2 id="statements-title" style={{ ...sectionTitle, fontSize: 26 }}>In the words of {story.statements.by || "our partner"}</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {story.statements.items.map((s) => (
                <li key={s} style={{ display: "grid", gridTemplateColumns: "24px minmax(0, 1fr)", gap: 12, fontFamily: S.sans, fontSize: 16, lineHeight: 1.45, color: S.text }}>
                  <Quote size={18} color={S.gold} style={{ marginTop: 3 }} aria-hidden="true" /> {s}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, fontFamily: S.sans, fontSize: 13, color: S.dim }}>
              Statements made by {story.statements.by || "our partner"}. Beersheba has not verified them.
            </p>
          </section>
        )}

        {lot.farm_story && (
          <section style={{ display: "grid", gap: 10 }} aria-labelledby="farm-title">
            <h2 id="farm-title" style={{ ...sectionTitle, fontSize: 26 }}>The farm</h2>
            <p style={{ margin: 0, fontFamily: S.sans, fontSize: 16, lineHeight: 1.65, color: S.muted }}>{lot.farm_story}</p>
          </section>
        )}
        {lot.farm_photos?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 10 }}>
            {lot.farm_photos.slice(0, 6).map((src, i) => (
              <img key={src} src={src} alt={`${lot.name}, farm photo ${i + 1}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 12, display: "block" }} />
            ))}
          </div>
        )}

        {/* Actions */}
        {(story.order || features.length > 0) && (
          <section style={{ display: "grid", gap: 12 }} aria-label="Actions">
            {story.order && (story.order.url ? (
              <a href={story.order.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "14px 20px", borderRadius: 16, background: S.gold, color: S.bg, textDecoration: "none" }}>
                <ShoppingBag size={22} aria-hidden="true" />
                <span style={{ display: "grid", gap: 2, textAlign: "left" }}>
                  <span style={{ fontFamily: S.sans, fontSize: 17, fontWeight: 700 }}>{story.order.label}</span>
                  <span style={{ fontFamily: S.sans, fontSize: 14, opacity: 0.85 }}>{[story.order.detail, story.order.price].filter(Boolean).join(" · ")}</span>
                </span>
              </a>
            ) : (
              <button type="button" onClick={() => setShowOrder(true)}
                style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "14px 20px", borderRadius: 16, border: 0, background: S.gold, color: S.bg, cursor: "pointer" }}>
                <ShoppingBag size={22} aria-hidden="true" />
                <span style={{ display: "grid", gap: 2, textAlign: "left" }}>
                  <span style={{ fontFamily: S.sans, fontSize: 17, fontWeight: 700 }}>{story.order.label}</span>
                  <span style={{ fontFamily: S.sans, fontSize: 14, opacity: 0.85 }}>{[story.order.detail, story.order.price].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            ))}
            {features.length > 0 && (
              <button type="button" onClick={() => setShowMap(true)}
                style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 60, padding: "14px 20px", borderRadius: 16, border: `1px solid ${S.gold}`, background: "transparent", color: S.text, cursor: "pointer" }}>
                <MapIcon size={22} color={S.gold} aria-hidden="true" />
                <span style={{ fontFamily: S.sans, fontSize: 16, fontWeight: 600 }}>Explore the GPS farm boundary map</span>
              </button>
            )}
          </section>
        )}

        {/* Verify */}
        <section style={{ display: "flex", alignItems: "center", gap: 18, padding: 18, borderRadius: 16, border: `1px solid ${S.lineSoft}` }}>
          {qr && <img src={qr} alt="QR code for this page" width={84} height={84} style={{ borderRadius: 8, flexShrink: 0 }} />}
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontFamily: S.sans, fontSize: 14, fontWeight: 600, color: S.text }}>
              <Check size={16} color={S.gold} /> This page is the lot’s permanent public record
            </p>
            <p style={{ margin: 0, fontFamily: S.sans, fontSize: 13, lineHeight: 1.5, color: S.muted }}>
              {lot.lot_id} on Beersheba. Grower names and plot maps appear only with each grower’s consent.
            </p>
          </div>
        </section>

        <footer style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 4, fontFamily: S.sans, fontSize: 13, letterSpacing: "0.08em", color: S.dim }}>
          <ShieldCheck size={14} color={S.gold} /> Verified by Beersheba · Ethiopian coffee, traceable to the tree
        </footer>
      </main>

      {showMap && <MapOverlay lot={lot} onClose={() => setShowMap(false)} />}
      {showOrder && story.order && <OrderSheet lot={lot} onClose={() => setShowOrder(false)} />}
    </div>
  );
}
