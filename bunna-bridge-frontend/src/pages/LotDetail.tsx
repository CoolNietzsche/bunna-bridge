import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLot, getComplianceCheck, downloadEudrDds } from "../api/lots";
import { getCuppingScores } from "../api/cupping";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import StatusPill from "../components/StatusPill";
import PolygonCaptureWidget from '../components/PolygonCaptureWidget';
import FarmMapDisplay from '../components/FarmMapDisplay';
import CuppingHistory from '../components/CuppingHistory';
import SampleRequestWidget from '../components/SampleRequestWidget';
import SettlementWidget from '../components/SettlementWidget';
import LotDocuments from '../components/LotDocuments';
import { useState } from "react";
import {
  ArrowLeft, MapPin, Mountain, Layers, Award, Download,
  ShieldCheck, ShieldAlert, ShieldOff, Clock, CheckCircle,
  XCircle, AlertTriangle, Leaf, FileCheck, Upload, Lock,
  Pencil, FlaskConical, TrendingUp, Package, Users,
  Globe, BadgeCheck
} from "lucide-react";

function RadarChart({ scores }: { scores: Record<string, number> }) {
  const attrs  = ["fragrance_aroma","flavor","aftertaste","acidity","body","balance","sweetness","overall"];
  const labels = ["Fragrance","Flavor","Aftertaste","Acidity","Body","Balance","Sweetness","Overall"];
  const cx = 110; const cy = 110; const r = 80;
  const min = 6; const max = 10;
  const angle = (i: number) => (i * 2 * Math.PI) / attrs.length - Math.PI / 2;
  const point = (i: number, val: number) => {
    const pct = (val - min) / (max - min);
    const a = angle(i);
    return [cx + r * pct * Math.cos(a), cy + r * pct * Math.sin(a)];
  };
  const gridPoint = (i: number, pct: number) => {
    const a = angle(i);
    return [cx + r * pct * Math.cos(a), cy + r * pct * Math.sin(a)];
  };
  const scorePoints = attrs.map((k, i) => point(i, scores[k] ?? 8));
  const polyline = scorePoints.map(p => p.join(",")).join(" ");
  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 220 }}>
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <polygon key={pct} points={attrs.map((_, i) => gridPoint(i, pct).join(",")).join(" ")} fill="none" stroke="rgba(28,28,26,0.08)" strokeWidth="1" />
      ))}
      {attrs.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={gridPoint(i, 1)[0]} y2={gridPoint(i, 1)[1]} stroke="rgba(28,28,26,0.08)" strokeWidth="1" />
      ))}
      <polygon points={polyline} fill="rgba(123,75,42,0.1)" stroke="#7B4B2A" strokeWidth="1.5" />
      {scorePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#7B4B2A" stroke="#FFFFFF" strokeWidth="1.5" />
      ))}
      {attrs.map((_, i) => {
        const [x, y] = gridPoint(i, 1.22);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="rgba(28,28,26,0.4)" fontFamily="DM Mono, monospace">
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

const REGION_IMAGES: Record<string, string> = {
  yirgacheffe: "https://images.unsplash.com/photo-1611280564029-cf77b5b5caf4?w=900&q=80",
  guji:        "https://images.unsplash.com/photo-1599639668273-bfa2b9a56b50?w=900&q=80",
  sidama:      "https://images.unsplash.com/photo-1501621965065-7b2153cbf0c3?w=900&q=80",
  harrar:      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=900&q=80",
  jimma:       "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80",
  gedeo:       "https://images.unsplash.com/photo-1611280564029-cf77b5b5caf4?w=900&q=80",
  default:     "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80",
};

function getRegionImage(region: string): string {
  const key = region?.toLowerCase() ?? "";
  for (const k of Object.keys(REGION_IMAGES)) {
    if (key.includes(k)) return REGION_IMAGES[k];
  }
  return REGION_IMAGES.default;
}

export default function LotDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const isExporter = user?.role === "exporter" || user?.role === "admin";
  const [ddsLoading, setDdsLoading] = useState(false);
  const [ddsError,   setDdsError]   = useState("");

  const { data: lot, isLoading, refetch } = useQuery({
    queryKey: ["lot", id],
    queryFn:  () => getLot(id!),
    enabled:  !!id,
  });
  const { data: compliance } = useQuery({
    queryKey: ["compliance", id],
    queryFn:  () => getComplianceCheck(id!),
    enabled:  !!id,
  });
  const { data: cuppingScores } = useQuery({
    queryKey: ["cupping-scores", id],
    queryFn:  () => getCuppingScores(id!),
    enabled:  !!id,
  });

  const gateLabels: Record<string, string> = {
    gps_verified:        "GPS Verified",
    deforestation_free:  "Deforestation Free",
    eudr_dds_ready:      "EUDR DDS Ready",
    phyto_cert_uploaded: "Phytosanitary Cert",
    ecta_license_active: "ECTA License",
    nbe_fx_declared:     "NBE FX Declaration",
    cta_floor_met:       "CTA Floor Price Met",
  };
  const gateIcons: Record<string, React.ReactNode> = {
    gps_verified:        <MapPin size={12} />,
    deforestation_free:  <Leaf size={12} />,
    eudr_dds_ready:      <FileCheck size={12} />,
    phyto_cert_uploaded: <Upload size={12} />,
    ecta_license_active: <ShieldCheck size={12} />,
    nbe_fx_declared:     <TrendingUp size={12} />,
    cta_floor_met:       <Award size={12} />,
  };

  if (isLoading) return (
    <PageWrapper>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ fontFamily: "DM Mono, monospace", color: "#1B4D35", letterSpacing: "0.2em", fontSize: "0.75rem" }}>LOADING LOT...</p>
      </div>
    </PageWrapper>
  );
  if (!lot) return (
    <PageWrapper>
      <p style={{ fontFamily: "DM Mono, monospace", color: "#C0392B" }}>Lot not found.</p>
    </PageWrapper>
  );

  const bestScore = cuppingScores?.find(s => s.status === "confirmed") ?? cuppingScores?.[0] ?? null;
  const radarScores: Record<string, number> = bestScore ? {
    fragrance_aroma: parseFloat(String(bestScore.fragrance_aroma)) || 8,
    flavor:          parseFloat(String(bestScore.flavor))          || 8,
    aftertaste:      parseFloat(String(bestScore.aftertaste))      || 8,
    acidity:         parseFloat(String(bestScore.acidity))         || 8,
    body:            parseFloat(String(bestScore.body))            || 8,
    balance:         parseFloat(String(bestScore.balance))         || 8,
    sweetness:       parseFloat(String(bestScore.sweetness))       || 8,
    overall:         parseFloat(String(bestScore.overall))         || 8,
  } : { fragrance_aroma: 8, flavor: 8, aftertaste: 8, acidity: 8, body: 8, balance: 8, sweetness: 8, overall: 8 };

  const hasRealScores = !!bestScore;
  const dcStatus = compliance?.deforestation_check?.status;
  const allGatesPass = compliance && compliance.failed_gates.length === 0;
  const heroImg = getRegionImage(lot.region);
  const scaNum = lot.sca_score ? parseFloat(String(lot.sca_score)) : null;

  const trustBadges = [
    { icon: <Globe size={14} />,      label: "100% Traceable",     active: lot.gps_verified },
    { icon: <Leaf size={14} />,       label: "Zero Deforestation", active: lot.deforestation_free },
    { icon: <Users size={14} />,      label: "Farmer Positive",    active: true },
    { icon: <BadgeCheck size={14} />, label: "EU Compliant",       active: lot.eudr_dds_ready },
  ];

  // card base styles
  const card = { background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.08)", borderRadius: "6px", boxShadow: "0 1px 3px rgba(28,28,26,0.06)", padding: "24px" };
  const cardTitle = { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(28,28,26,0.4)", margin: "0 0 16px" };

  return (
    <PageWrapper>
      <div style={{ maxWidth: "1140px" }}>

        {/* Back */}
        <button onClick={() => navigate("/lots")} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
          letterSpacing: "0.1em", color: "rgba(28,28,26,0.4)",
          padding: 0, marginBottom: "20px", textTransform: "uppercase",
        }}>
          <ArrowLeft size={12} /> Back to Lots
        </button>

        {/* ── HERO ─────────────────────────────────────────── */}
        <div style={{
          borderRadius: "8px", overflow: "hidden",
          marginBottom: "20px", position: "relative",
          border: "1px solid rgba(27,77,53,0.15)",
          boxShadow: "0 2px 8px rgba(28,28,26,0.08)",
        }}>
          {/* Landscape image */}
          <div style={{ height: "200px", position: "relative", overflow: "hidden" }}>
            <img
              src={heroImg} alt={lot.region}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(28,28,26,0.1) 0%, rgba(28,28,26,0.6) 100%)" }} />
            <div style={{
              position: "absolute", top: "14px", left: "18px",
              background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(28,28,26,0.1)", borderRadius: "4px",
              padding: "4px 10px",
              fontFamily: "DM Mono, monospace", fontSize: "0.6rem",
              letterSpacing: "0.12em", color: "#4A4A45",
            }}>
              {lot.lot_id}
            </div>
            <div style={{ position: "absolute", top: "12px", right: "16px" }}>
              <StatusPill status={lot.status} />
            </div>
          </div>

          {/* Info bar */}
          <div style={{ background: "#1B4D35", padding: "20px 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.85rem", fontWeight: 400, color: "#FFFFFF", margin: "0 0 4px", lineHeight: 1.1 }}>
                  {lot.name}
                </h1>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(255,255,255,0.55)", margin: "0 0 14px", letterSpacing: "0.1em" }}>
                  {lot.region.toUpperCase()} · {lot.processing.toUpperCase()} · {lot.grade}
                </p>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {[
                    { icon: <Mountain size={11} />, label: "Altitude", val: `${lot.altitude_m} masl` },
                    { icon: <Package size={11} />,  label: "Volume",   val: `${lot.volume_kg} kg` },
                    { icon: <MapPin size={11} />,   label: "Kebele",   val: lot.kebele || lot.region },
                  ].map(m => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>{m.icon}</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(255,255,255,0.45)", marginRight: "3px" }}>{m.label}</span>
                      <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.78rem", color: "#FFFFFF" }}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Q-Score badge */}
              {lot.sca_score && (
                <div style={{
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "6px", padding: "14px 22px", textAlign: "center", flexShrink: 0,
                }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)", margin: "0 0 2px", textTransform: "uppercase" }}>Q-Score</p>
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.8rem", fontWeight: 300, color: "#A8D5BC", margin: 0, lineHeight: 1 }}>{lot.sca_score}</p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(168,213,188,0.7)", margin: "3px 0 0" }}>
                    {scaNum && scaNum >= 90 ? "OUTSTANDING" : scaNum && scaNum >= 85 ? "EXCELLENT" : scaNum && scaNum >= 80 ? "SPECIALTY" : "STANDARD"}
                  </p>
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              {trustBadges.map(b => (
                <div key={b.label} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "5px 12px", borderRadius: "20px",
                  background: b.active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${b.active ? "rgba(168,213,188,0.4)" : "rgba(255,255,255,0.1)"}`,
                  fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
                  color: b.active ? "#A8D5BC" : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.06em",
                }}>
                  {b.icon} {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Two column grid ──────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "clamp(1px,100%,1.4fr) clamp(1px,100%,1fr)", gap: "20px", alignItems: "start" }}>

          {/* ══ LEFT COLUMN ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Quality & Sensory */}
            <div style={card}>
              <p style={cardTitle}>Quality & Sensory</p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {lot.sca_score && (
                  <div style={{ flex: 1, minWidth: "90px", background: "#F5EDE4", border: "1px solid rgba(123,75,42,0.15)", borderRadius: "6px", padding: "14px 16px", textAlign: "center" }}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(123,75,42,0.6)", margin: "0 0 4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Q-Score</p>
                    <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.4rem", fontWeight: 300, color: "#7B4B2A", margin: 0, lineHeight: 1 }}>{lot.sca_score}</p>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: "90px", background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.12)", borderRadius: "6px", padding: "14px 16px", textAlign: "center" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(27,77,53,0.5)", margin: "0 0 4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Altitude</p>
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.4rem", fontWeight: 300, color: "#1B4D35", margin: 0, lineHeight: 1 }}>{lot.altitude_m}</p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(27,77,53,0.45)", margin: "2px 0 0" }}>MASL</p>
                </div>
                <div style={{ flex: 1, minWidth: "90px", background: "#F0EDE6", border: "1px solid rgba(28,28,26,0.08)", borderRadius: "6px", padding: "14px 16px", textAlign: "center" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.4)", margin: "0 0 4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Volume</p>
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.4rem", fontWeight: 300, color: "#4A4A45", margin: 0, lineHeight: 1 }}>{lot.volume_kg}</p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(28,28,26,0.35)", margin: "2px 0 0" }}>KG</p>
                </div>
              </div>

              {/* Radar + score details */}
              <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flexShrink: 0, width: "180px" }}>
                  <RadarChart scores={radarScores} />
                  <p style={{
                    fontFamily: "DM Mono, monospace", fontSize: "0.55rem",
                    textAlign: "center", margin: "4px 0 0",
                    color: hasRealScores ? "rgba(123,75,42,0.5)" : "rgba(28,28,26,0.25)",
                    letterSpacing: "0.08em",
                  }}>
                    {hasRealScores ? (bestScore?.status === "confirmed" ? "CONFIRMED SCORE" : "LATEST SCORE") : "NO SCORE YET"}
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: "140px" }}>
                  {lot.q_grader_name && (
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(28,28,26,0.35)", margin: "0 0 3px" }}>Q-Grader</p>
                      <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#1C1C1A", margin: 0 }}>
                        {lot.q_grader_name}
                        {lot.q_grader_cert_id && <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "rgba(28,28,26,0.35)" }}> · #{lot.q_grader_cert_id}</span>}
                      </p>
                    </div>
                  )}
                  {lot.flavor_notes && (
                    <div>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(28,28,26,0.35)", margin: "0 0 6px" }}>Flavor Notes</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {lot.flavor_notes.split(",").map((f: string) => (
                          <span key={f} style={{ padding: "3px 8px", background: "#F5EDE4", border: "1px solid rgba(123,75,42,0.15)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#7B4B2A" }}>
                            {f.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {lot.sca_score && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.35)", letterSpacing: "0.1em" }}>80</span>
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.35)", letterSpacing: "0.1em" }}>100</span>
                      </div>
                      <div style={{ height: "4px", background: "rgba(28,28,26,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "2px", background: "linear-gradient(to right, #1B4D35, #7B4B2A)", width: `${((parseFloat(String(lot.sca_score)) - 80) / 20) * 100}%`, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Origin & Processing */}
            <div style={card}>
              <p style={cardTitle}>Origin & Processing</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  ["Processing",      lot.processing],
                  ["Varietal",        lot.varietal || "Ethiopian Heirloom"],
                  ["Harvest Date",    lot.harvest_date],
                  ["Washing Station", lot.washing_station || "—"],
                  ["Kebele",          lot.kebele || "—"],
                  ["Price / kg",      lot.price_per_kg ? `$${lot.price_per_kg}` : "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(28,28,26,0.35)", margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: "#1C1C1A", margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cupping + Settlement */}
            <div style={card}>
              <CuppingHistory lotId={lot.id} />
              <div style={{ marginTop: "24px" }}>
                <SettlementWidget lotId={lot.id} lotRef={lot.lot_id}
                  defaultUsd={lot.price_per_kg && lot.volume_kg
                    ? parseFloat(String(lot.price_per_kg)) * parseFloat(String(lot.volume_kg))
                    : undefined}
                />
              </div>
            </div>

            <div style={card}>
              <LotDocuments lot={lot} lotId={lot.id} />
            </div>

            {isExporter && (
              <div style={card}>
                <PolygonCaptureWidget
                  mode="lot" lotId={lot.id}
                  existingPolygon={lot.boundary ?? null}
                  canInherit={true} onSaved={() => refetch()}
                />
              </div>
            )}
          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Boundary map — Leaflet: keep inline styles */}
            {lot.boundary && (
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.08)", borderRadius: "6px", overflow: "hidden", boxShadow: "0 1px 3px rgba(28,28,26,0.06)" }}>
                <FarmMapDisplay polygon={lot.boundary} label="Lot Boundary" height={200} />
              </div>
            )}

            {/* EUDR Compliance */}
            <div style={card}>
              <p style={cardTitle}>EUDR Compliance</p>

              {compliance && (
                <div style={{
                  padding: "16px", borderRadius: "6px", marginBottom: "16px",
                  background: allGatesPass ? "#E8F2EC" : "#FDECEA",
                  border: `1px solid ${allGatesPass ? "rgba(27,77,53,0.25)" : "rgba(192,57,43,0.25)"}`,
                  textAlign: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
                    {allGatesPass
                      ? <ShieldCheck size={18} color="#1B4D35" />
                      : <ShieldAlert size={18} color="#C0392B" />
                    }
                    <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.95rem", fontWeight: 600, color: allGatesPass ? "#1B4D35" : "#C0392B", margin: 0 }}>
                      {allGatesPass ? "STATUS: VERIFIED" : `${compliance.failed_gates.length} GATE${compliance.failed_gates.length > 1 ? "S" : ""} FAILING`}
                    </p>
                  </div>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.08em", color: allGatesPass ? "rgba(27,77,53,0.6)" : "rgba(192,57,43,0.7)", margin: 0 }}>
                    {allGatesPass ? "Negligible Risk · Export Cleared" : "Export button blocked until all gates pass"}
                  </p>
                </div>
              )}

              {compliance?.deforestation_check && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "10px 12px", borderRadius: "4px", marginBottom: "14px",
                  background: dcStatus === "clear"   ? "#E8F2EC" :
                              dcStatus === "overlap" ? "#FDECEA" : "#F5EDE4",
                  border: `1px solid ${
                    dcStatus === "clear"   ? "rgba(27,77,53,0.2)"   :
                    dcStatus === "overlap" ? "rgba(192,57,43,0.25)" : "rgba(123,75,42,0.2)"}`,
                }}>
                  <span style={{ flexShrink: 0, marginTop: "1px", color: dcStatus === "clear" ? "#1B4D35" : dcStatus === "overlap" ? "#C0392B" : "#7B4B2A" }}>
                    {dcStatus === "clear"   && <ShieldCheck size={13} />}
                    {dcStatus === "overlap" && <ShieldAlert size={13} />}
                    {dcStatus === "pending" && <Clock size={13} />}
                    {dcStatus === "no_data" && <ShieldOff size={13} />}
                  </span>
                  <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.77rem", margin: 0, color: dcStatus === "clear" ? "#1B4D35" : dcStatus === "overlap" ? "#C0392B" : "#7B4B2A" }}>
                    {compliance.deforestation_check.message}
                  </p>
                </div>
              )}

              {/* Gate list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "18px" }}>
                {compliance ? Object.entries(compliance.gates).map(([key, pass]) => {
                  if (key === "deforestation_free") {
                    const dc = compliance.deforestation_check;
                    const isPending = dc?.status === "pending" || dc?.status === "no_data";
                    const isOverlap = dc?.status === "overlap";
                    const bg = isPending ? "#F5EDE4" : isOverlap ? "#FDECEA" : "#E8F2EC";
                    const bd = isPending ? "rgba(123,75,42,0.15)" : isOverlap ? "rgba(192,57,43,0.2)" : "rgba(27,77,53,0.15)";
                    const ic = isPending ? "#7B4B2A" : isOverlap ? "#C0392B" : "#1B4D35";
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: "3px", background: bg, border: `1px solid ${bd}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <span style={{ color: ic, flexShrink: 0 }}>{gateIcons[key]}</span>
                          <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.78rem", color: "#4A4A45" }}>{gateLabels[key]}</span>
                        </div>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Mono, monospace", fontSize: "0.56rem", color: ic, fontWeight: 600 }}>
                          {isPending ? <Clock size={9} /> : isOverlap ? <XCircle size={9} /> : <CheckCircle size={9} />}
                          {isPending ? "PENDING" : isOverlap ? "OVERLAP" : "PASS"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={key} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "7px 10px", borderRadius: "3px",
                      background: pass ? "#E8F2EC" : "#FDECEA",
                      border: `1px solid ${pass ? "rgba(27,77,53,0.15)" : "rgba(192,57,43,0.2)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ color: pass ? "#1B4D35" : "#C0392B", flexShrink: 0 }}>{gateIcons[key]}</span>
                        <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.78rem", color: "#4A4A45" }}>{gateLabels[key] || key}</span>
                      </div>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Mono, monospace", fontSize: "0.56rem", color: pass ? "#1B4D35" : "#C0392B", fontWeight: 600 }}>
                        {pass ? <CheckCircle size={9} /> : <XCircle size={9} />}
                        {pass ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  );
                }) : (
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(28,28,26,0.3)" }}>Loading...</p>
                )}
              </div>

              {compliance && compliance.failed_gates.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: "4px", marginBottom: "14px", background: "#FDECEA", border: "1px solid rgba(192,57,43,0.2)" }}>
                  <AlertTriangle size={12} style={{ color: "#C0392B", flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.56rem", color: "#C0392B", letterSpacing: "0.1em", margin: "0 0 3px", textTransform: "uppercase" }}>
                      {compliance.failed_gates.length} gate{compliance.failed_gates.length > 1 ? "s" : ""} failing
                    </p>
                    {compliance.failed_gates.map((g: string) => (
                      <p key={g} style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.72rem", color: "rgba(192,57,43,0.8)", margin: "2px 0" }}>{gateLabels[g] || g}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  onClick={async () => {
                    setDdsLoading(true); setDdsError("");
                    try { await downloadEudrDds(lot.id); }
                    catch(e: unknown) { setDdsError((e as Error).message); }
                    finally { setDdsLoading(false); }
                  }}
                  disabled={!lot.eudr_dds_ready || ddsLoading}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "13px", borderRadius: "4px", border: "none",
                    cursor: lot.eudr_dds_ready ? "pointer" : "not-allowed",
                    background: lot.eudr_dds_ready ? "#1B4D35" : "rgba(28,28,26,0.06)",
                    color: lot.eudr_dds_ready ? "#FFFFFF" : "rgba(28,28,26,0.25)",
                    fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    boxShadow: lot.eudr_dds_ready ? "0 2px 8px rgba(27,77,53,0.25)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {ddsLoading ? <Clock size={13} /> : <Download size={13} />}
                  {ddsLoading ? "Generating PDF..." : "Generate EUDR DDS Certificate"}
                </button>
                {ddsError && <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#C0392B", margin: 0 }}>{ddsError}</p>}

                {isExporter && (
                  <button
                    onClick={() => navigate(`/lots/${lot.id}/edit`)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      padding: "10px", borderRadius: "4px",
                      background: "transparent", border: "1px solid rgba(28,28,26,0.12)",
                      color: "rgba(28,28,26,0.55)",
                      fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <Pencil size={12} /> Edit Lot
                  </button>
                )}

                <button
                  disabled={!lot.export_ready}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "13px", borderRadius: "4px", border: "none",
                    cursor: lot.export_ready ? "pointer" : "not-allowed",
                    background: lot.export_ready ? "#1B4D35" : "rgba(28,28,26,0.06)",
                    color: lot.export_ready ? "#FFFFFF" : "rgba(28,28,26,0.25)",
                    fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    boxShadow: lot.export_ready ? "0 2px 8px rgba(27,77,53,0.25)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  {lot.export_ready ? <><TrendingUp size={13} /> Proceed to Export</> : <><Lock size={13} /> Export Locked</>}
                </button>
              </div>
            </div>

            {/* Traceability */}
            <div style={card}>
              <p style={cardTitle}>Traceability</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { icon: <MapPin size={12} />,   label: "Washing Station", val: lot.washing_station || "—" },
                  { icon: <Layers size={12} />,   label: "Kebele",          val: lot.kebele || lot.region },
                  { icon: <Mountain size={12} />, label: "Region",          val: lot.region },
                  { icon: <Globe size={12} />,    label: "Country",         val: "Ethiopia" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(28,28,26,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ color: "rgba(28,28,26,0.3)" }}>{row.icon}</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{row.label}</span>
                    </div>
                    <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#1C1C1A" }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Green Passport */}
            <div style={card}>
              <p style={cardTitle}>Green Passport</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                {[
                  { label: "GPS Verified",      pass: lot.gps_verified,      icon: <MapPin size={11} /> },
                  { label: "Deforestation Free", pass: lot.deforestation_free, icon: <Leaf size={11} /> },
                  { label: "EUDR DDS Ready",     pass: lot.eudr_dds_ready,    icon: <FileCheck size={11} /> },
                ].map(item => (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 10px", borderRadius: "3px",
                    background: item.pass ? "#E8F2EC" : "#F7F5F0",
                    border: `1px solid ${item.pass ? "rgba(27,77,53,0.15)" : "rgba(28,28,26,0.07)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ color: item.pass ? "#1B4D35" : "rgba(28,28,26,0.2)" }}>{item.icon}</span>
                      <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.78rem", color: item.pass ? "#1C1C1A" : "rgba(28,28,26,0.35)" }}>{item.label}</span>
                    </div>
                    {item.pass ? <CheckCircle size={13} color="#1B4D35" /> : <XCircle size={13} color="rgba(28,28,26,0.15)" />}
                  </div>
                ))}
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px",
                background: lot.green_passport_ready ? "#E8F2EC" : "#F7F5F0",
                border: `1px solid ${lot.green_passport_ready ? "rgba(27,77,53,0.2)" : "rgba(28,28,26,0.07)"}`,
                borderRadius: "4px",
              }}>
                <Leaf size={12} color={lot.green_passport_ready ? "#1B4D35" : "rgba(28,28,26,0.2)"} />
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0, color: lot.green_passport_ready ? "#1B4D35" : "rgba(28,28,26,0.25)" }}>
                  {lot.green_passport_ready ? "Green Passport Issued" : "Passport Not Yet Issued"}
                </p>
              </div>
            </div>

            <SampleRequestWidget lotId={lot.id} lotRef={lot.lot_id} />

            {(user?.role === "qgrader" || user?.role === "admin") && (
              <div style={{ ...card, border: "1px solid rgba(27,77,53,0.2)" }}>
                <p style={{ ...cardTitle, color: "#1B4D35" }}>Q-Grader Actions</p>
                <button
                  onClick={() => navigate(`/lots/${lot.id}/cup`)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "11px", borderRadius: "4px",
                    background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.25)",
                    color: "#1B4D35", cursor: "pointer",
                    fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                  }}
                >
                  <FlaskConical size={13} /> Submit Cupping Score
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
