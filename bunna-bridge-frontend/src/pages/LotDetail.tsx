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
import { useState } from "react";
import {
  ArrowLeft, MapPin, Mountain, Layers, Award, Download,
  ShieldCheck, ShieldAlert, ShieldOff, Clock, CheckCircle,
  XCircle, AlertTriangle, Leaf, FileCheck, Upload, Lock,
  Pencil, FlaskConical, TrendingUp, Package, Users
} from "lucide-react";

// ── Radar/Spider chart (pure SVG, no library needed) ─────────────
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const attrs = [
    "fragrance_aroma","flavor","aftertaste","acidity",
    "body","balance","sweetness","overall"
  ];
  const labels = [
    "Fragrance","Flavor","Aftertaste","Acidity",
    "Body","Balance","Sweetness","Overall"
  ];
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
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <polygon key={pct}
          points={attrs.map((_, i) => gridPoint(i, pct).join(",")).join(" ")}
          fill="none" stroke="rgba(245,237,216,0.07)" strokeWidth="1"
        />
      ))}
      {/* Axis lines */}
      {attrs.map((_, i) => (
        <line key={i}
          x1={cx} y1={cy}
          x2={gridPoint(i, 1)[0]} y2={gridPoint(i, 1)[1]}
          stroke="rgba(245,237,216,0.07)" strokeWidth="1"
        />
      ))}
      {/* Score polygon */}
      <polygon points={polyline}
        fill="rgba(201,149,42,0.15)"
        stroke="#C9952A" strokeWidth="1.5"
      />
      {/* Score dots */}
      {scorePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3"
          fill="#C9952A" stroke="#1A0F07" strokeWidth="1.5"
        />
      ))}
      {/* Labels */}
      {attrs.map((_, i) => {
        const [x, y] = gridPoint(i, 1.22);
        return (
          <text key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="7.5" fill="rgba(245,237,216,0.45)"
            fontFamily="DM Mono, monospace"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
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
        <p style={{ fontFamily: "DM Mono, monospace", color: "#D4824A", letterSpacing: "0.2em", fontSize: "0.75rem" }}>
          LOADING LOT...
        </p>
      </div>
    </PageWrapper>
  );

  if (!lot) return (
    <PageWrapper>
      <p style={{ fontFamily: "DM Mono, monospace", color: "#C1440E" }}>Lot not found.</p>
    </PageWrapper>
  );

  // Build radar scores from real cupping data
  const bestScore = cuppingScores?.find(s => s.status === "confirmed")
    ?? cuppingScores?.[0]
    ?? null;
  const radarScores: Record<string, number> = bestScore ? {
    fragrance_aroma: parseFloat(String(bestScore.fragrance_aroma)) || 8,
    flavor:          parseFloat(String(bestScore.flavor))          || 8,
    aftertaste:      parseFloat(String(bestScore.aftertaste))      || 8,
    acidity:         parseFloat(String(bestScore.acidity))         || 8,
    body:            parseFloat(String(bestScore.body))            || 8,
    balance:         parseFloat(String(bestScore.balance))         || 8,
    sweetness:       parseFloat(String(bestScore.sweetness))       || 8,
    overall:         parseFloat(String(bestScore.overall))         || 8,
  } : {
    fragrance_aroma: 8, flavor: 8, aftertaste: 8, acidity: 8,
    body: 8, balance: 8, sweetness: 8, overall: 8,
  };
  const hasRealScores = !!bestScore;

  const dcStatus = compliance?.deforestation_check?.status;

  return (
    <PageWrapper>
      <div style={{ maxWidth: "1140px" }}>

        {/* Back */}
        <button onClick={() => navigate("/lots")} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
          letterSpacing: "0.1em", color: "rgba(245,237,216,0.35)",
          padding: 0, marginBottom: "20px", textTransform: "uppercase",
        }}>
          <ArrowLeft size={12} /> Back to Lots
        </button>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #2C1810 0%, #1E3A2F 100%)",
          border: "1px solid rgba(74,124,89,0.2)",
          borderRadius: "6px", padding: "28px 32px",
          marginBottom: "20px", position: "relative", overflow: "hidden",
        }}>
          {/* Background texture */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: "radial-gradient(circle at 70% 50%, #C9952A 0%, transparent 60%)",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <h1 style={{
                    fontFamily: "Cormorant Garamond, serif",
                    fontSize: "2rem", fontWeight: 400,
                    color: "#F5EDD8", margin: 0, lineHeight: 1.1,
                  }}>
                    {lot.name}
                  </h1>
                  <StatusPill status={lot.status} />
                  {lot.green_passport_ready && (
                    <span style={{
                      display: "flex", alignItems: "center", gap: "4px",
                      padding: "3px 10px", background: "rgba(74,124,89,0.2)",
                      border: "1px solid rgba(74,124,89,0.4)", borderRadius: "20px",
                      fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
                      color: "#A8C5A0", letterSpacing: "0.08em",
                    }}>
                      <Leaf size={10} /> GREEN PASSPORT
                    </span>
                  )}
                </div>
                <p style={{
                  fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
                  color: "rgba(245,237,216,0.4)", margin: "0 0 16px",
                  letterSpacing: "0.1em",
                }}>
                  {lot.lot_id}
                </p>
                {/* Key metrics row */}
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                  {[
                    { icon: <MapPin size={12} />,    label: "Region",   val: lot.region.toUpperCase() },
                    { icon: <Mountain size={12} />,  label: "Altitude", val: `${lot.altitude_m} masl` },
                    { icon: <Package size={12} />,   label: "Volume",   val: `${lot.volume_kg} kg` },
                    { icon: <Layers size={12} />,    label: "Grade",    val: lot.grade },
                  ].map(m => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "rgba(245,237,216,0.3)" }}>{m.icon}</span>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.35)", marginRight: "4px" }}>
                        {m.label}
                      </span>
                      <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#F5EDD8" }}>
                        {m.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* SCA score badge */}
              {lot.sca_score && (
                <div style={{
                  background: "rgba(201,149,42,0.12)",
                  border: "1px solid rgba(201,149,42,0.25)",
                  borderRadius: "6px", padding: "16px 24px",
                  textAlign: "center", flexShrink: 0,
                }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.15em", color: "rgba(201,149,42,0.6)", margin: "0 0 4px", textTransform: "uppercase" }}>
                    Q-Score
                  </p>
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "3rem", fontWeight: 300, color: "#C9952A", margin: 0, lineHeight: 1 }}>
                    {lot.sca_score}
                  </p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(201,149,42,0.5)", margin: "4px 0 0" }}>
                    {parseFloat(String(lot.sca_score)) >= 90 ? "OUTSTANDING" :
                     parseFloat(String(lot.sca_score)) >= 85 ? "EXCELLENT" :
                     parseFloat(String(lot.sca_score)) >= 80 ? "SPECIALTY" : "STANDARD"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Two column grid ───────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "clamp(1px,100%,1.4fr) clamp(1px,100%,1fr)",
          gap: "20px", alignItems: "start",
        }}>

          {/* ══ LEFT COLUMN ══════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Origin & Processing */}
            <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "24px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 16px" }}>
                Origin & Processing
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  ["Processing",    lot.processing],
                  ["Varietal",      lot.varietal || "Ethiopian Heirloom"],
                  ["Harvest Date",  lot.harvest_date],
                  ["Washing Station", lot.washing_station || "—"],
                  ["Kebele",        lot.kebele || "—"],
                  ["Price / kg",    lot.price_per_kg ? `$${lot.price_per_kg}` : "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 4px" }}>
                      {label}
                    </p>
                    <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: "#F5EDD8", margin: 0 }}>
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality & Sensory */}
            <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "24px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 16px" }}>
                Quality & Sensory
              </p>
              <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Radar chart */}
                <div style={{ flexShrink: 0, width: "180px" }}>
                  <RadarChart scores={radarScores} />
                  <p style={{
                    fontFamily: "DM Mono, monospace", fontSize: "0.55rem",
                    textAlign: "center", margin: "4px 0 0",
                    color: hasRealScores ? "rgba(201,149,42,0.5)" : "rgba(245,237,216,0.2)",
                    letterSpacing: "0.08em",
                  }}>
                    {hasRealScores
                      ? bestScore?.status === "confirmed" ? "CONFIRMED SCORE" : "LATEST SCORE"
                      : "NO SCORE YET"}
                  </p>
                </div>
                {/* Score details */}
                <div style={{ flex: 1, minWidth: "140px" }}>
                  {lot.sca_score && (
                    <div style={{
                      background: "rgba(201,149,42,0.08)",
                      border: "1px solid rgba(201,149,42,0.15)",
                      borderRadius: "4px", padding: "12px 16px",
                      marginBottom: "16px",
                    }}>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(201,149,42,0.5)", margin: "0 0 4px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                        SCA Total Score
                      </p>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.5rem", fontWeight: 300, color: "#C9952A", lineHeight: 1 }}>
                          {lot.sca_score}
                        </span>
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "rgba(201,149,42,0.4)" }}>
                          / 100
                        </span>
                      </div>
                      {/* Score bar */}
                      <div style={{ height: "3px", background: "rgba(245,237,216,0.08)", borderRadius: "2px", margin: "8px 0 4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "2px", background: "linear-gradient(to right, #C1440E, #C9952A)", width: `${((parseFloat(String(lot.sca_score)) - 80) / 20) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {/* Q Grader */}
                  {lot.q_grader_name && (
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 3px" }}>
                        Q-Grader
                      </p>
                      <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#F5EDD8", margin: 0 }}>
                        {lot.q_grader_name}
                        {lot.q_grader_cert_id && (
                          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.3)" }}> · #{lot.q_grader_cert_id}</span>
                        )}
                      </p>
                    </div>
                  )}
                  {/* Flavor notes */}
                  {lot.flavor_notes && (
                    <div>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 6px" }}>
                        Flavor Notes
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {lot.flavor_notes.split(",").map(f => (
                          <span key={f} style={{
                            padding: "3px 8px",
                            background: "rgba(201,149,42,0.08)",
                            border: "1px solid rgba(201,149,42,0.2)",
                            borderRadius: "20px",
                            fontFamily: "DM Mono, monospace",
                            fontSize: "0.58rem", color: "#C9952A",
                          }}>
                            {f.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cupping History + Settlement */}
            <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "24px" }}>
              <CuppingHistory lotId={lot.id} />
              <div style={{ marginTop: "24px" }}>
                <SettlementWidget lotId={lot.id} lotRef={lot.lot_id}
                  defaultUsd={lot.price_per_kg && lot.volume_kg
                    ? parseFloat(String(lot.price_per_kg)) * parseFloat(String(lot.volume_kg))
                    : undefined}
                />
              </div>
            </div>

            {/* Boundary capture — exporter/admin only */}
            {isExporter && (
              <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "24px" }}>
                <PolygonCaptureWidget
                  mode="lot"
                  lotId={lot.id}
                  existingPolygon={lot.boundary ?? null}
                  canInherit={true}
                  onSaved={() => refetch()}
                />
              </div>
            )}
          </div>

          {/* ══ RIGHT COLUMN ═════════════════════════════════════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Boundary map */}
            {lot.boundary && (
              <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", overflow: "hidden" }}>
                <FarmMapDisplay polygon={lot.boundary} label="Lot Boundary" height={200} />
              </div>
            )}

            {/* EUDR Compliance */}
            <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "24px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 16px" }}>
                EUDR Compliance
              </p>

              {/* Deforestation status banner */}
              {compliance?.deforestation_check && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "12px 14px", borderRadius: "4px", marginBottom: "16px",
                  background: dcStatus === "clear"   ? "rgba(30,58,47,0.4)"   :
                              dcStatus === "overlap" ? "rgba(193,68,14,0.15)" :
                              "rgba(201,149,42,0.1)",
                  border: `1px solid ${
                    dcStatus === "clear"   ? "rgba(74,124,89,0.4)"   :
                    dcStatus === "overlap" ? "rgba(193,68,14,0.4)"   :
                    "rgba(201,149,42,0.3)"}`,
                }}>
                  <span style={{ flexShrink: 0, marginTop: "1px",
                    color: dcStatus === "clear"   ? "#A8C5A0" :
                           dcStatus === "overlap" ? "#C1440E" : "#C9952A"
                  }}>
                    {dcStatus === "clear"   && <ShieldCheck size={14} />}
                    {dcStatus === "overlap" && <ShieldAlert size={14} />}
                    {dcStatus === "pending" && <Clock size={14} />}
                    {dcStatus === "no_data" && <ShieldOff size={14} />}
                  </span>
                  <div>
                    <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", margin: "0 0 2px",
                      color: dcStatus === "clear"   ? "#A8C5A0" :
                             dcStatus === "overlap" ? "#C1440E" : "#C9952A"
                    }}>
                      {compliance.deforestation_check.message}
                    </p>
                    {dcStatus === "pending" && (
                      <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.72rem", color: "rgba(245,237,216,0.35)", margin: 0 }}>
                        Capture a farm boundary below to enable spatial verification.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Gate list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
                {compliance ? Object.entries(compliance.gates).map(([key, pass]) => {
                  if (key === "deforestation_free") {
                    const dc = compliance.deforestation_check;
                    const isPending = dc?.status === "pending" || dc?.status === "no_data";
                    const isOverlap = dc?.status === "overlap";
                    const bg = isPending ? "rgba(201,149,42,0.06)" : isOverlap ? "rgba(193,68,14,0.08)" : "rgba(30,58,47,0.12)";
                    const bd = isPending ? "rgba(201,149,42,0.2)"  : isOverlap ? "rgba(193,68,14,0.25)"  : "rgba(74,124,89,0.2)";
                    const ic = isPending ? "#C9952A" : isOverlap ? "#C1440E" : "#A8C5A0";
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "3px", background: bg, border: `1px solid ${bd}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: ic, flexShrink: 0 }}>{gateIcons[key]}</span>
                          <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "rgba(245,237,216,0.7)" }}>
                            {gateLabels[key]}
                          </span>
                        </div>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: ic, fontWeight: 600 }}>
                          {isPending ? <Clock size={10} /> : isOverlap ? <XCircle size={10} /> : <CheckCircle size={10} />}
                          {isPending ? "PENDING" : isOverlap ? "OVERLAP" : "PASS"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={key} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: "3px",
                      background: pass ? "rgba(30,58,47,0.12)" : "rgba(193,68,14,0.08)",
                      border: `1px solid ${pass ? "rgba(74,124,89,0.2)" : "rgba(193,68,14,0.2)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: pass ? "#4A7C59" : "#C1440E", flexShrink: 0 }}>{gateIcons[key]}</span>
                        <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "rgba(245,237,216,0.7)" }}>
                          {gateLabels[key] || key}
                        </span>
                      </div>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: pass ? "#A8C5A0" : "#C1440E", fontWeight: 600 }}>
                        {pass ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {pass ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  );
                }) : (
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(245,237,216,0.2)" }}>Loading...</p>
                )}
              </div>

              {/* Failed gates summary */}
              {compliance && compliance.failed_gates.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "12px 14px", borderRadius: "4px", marginBottom: "16px",
                  background: "rgba(193,68,14,0.08)",
                  border: "1px solid rgba(193,68,14,0.2)",
                }}>
                  <AlertTriangle size={13} style={{ color: "#C1440E", flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#C1440E", letterSpacing: "0.1em", margin: "0 0 4px", textTransform: "uppercase" }}>
                      {compliance.failed_gates.length} gate{compliance.failed_gates.length > 1 ? "s" : ""} failing
                    </p>
                    {compliance.failed_gates.map(g => (
                      <p key={g} style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: "rgba(193,68,14,0.7)", margin: "2px 0" }}>
                        {gateLabels[g] || g}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* EUDR DDS download */}
                <button
                  onClick={async () => {
                    setDdsLoading(true); setDdsError("");
                    try { await downloadEudrDds(lot.id); }
                    catch(e: unknown) { setDdsError((e as Error).message); }
                    finally { setDdsLoading(false); }
                  }}
                  disabled={!lot.eudr_dds_ready || ddsLoading}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "8px",
                    padding: "11px", borderRadius: "3px", border: "none",
                    cursor: lot.eudr_dds_ready ? "pointer" : "not-allowed",
                    background: lot.eudr_dds_ready ? "#1E3A2F" : "rgba(245,237,216,0.04)",
                    color: lot.eudr_dds_ready ? "#A8C5A0" : "rgba(245,237,216,0.2)",
                    fontFamily: "DM Mono, monospace", fontSize: "0.68rem",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    transition: "all 0.15s",
                  }}
                >
                  {ddsLoading ? <Clock size={13} /> : <Download size={13} />}
                  {ddsLoading ? "Generating PDF..." : "Download EUDR DDS PDF"}
                </button>
                {ddsError && (
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#C1440E", margin: 0 }}>{ddsError}</p>
                )}

                {/* Edit lot */}
                {isExporter && (
                  <button
                    onClick={() => navigate(`/lots/${lot.id}/edit`)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: "8px",
                      padding: "10px", borderRadius: "3px",
                      background: "transparent",
                      border: "1px solid rgba(245,237,216,0.1)",
                      color: "rgba(245,237,216,0.5)",
                      fontFamily: "DM Mono, monospace", fontSize: "0.68rem",
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    <Pencil size={12} /> Edit Lot
                  </button>
                )}

                {/* Export CTA */}
                <button
                  disabled={!lot.export_ready}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "8px",
                    padding: "12px", borderRadius: "3px", border: "none",
                    cursor: lot.export_ready ? "pointer" : "not-allowed",
                    background: lot.export_ready ? "#C1440E" : "rgba(245,237,216,0.04)",
                    color: lot.export_ready ? "#fff" : "rgba(245,237,216,0.2)",
                    fontFamily: "DM Mono, monospace", fontSize: "0.68rem",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    transition: "all 0.15s",
                  }}
                >
                  {lot.export_ready
                    ? <><TrendingUp size={13} /> Proceed to Export</>
                    : <><Lock size={13} /> Export Locked</>
                  }
                </button>
              </div>
            </div>

            {/* Green Passport */}
            <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "24px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 14px" }}>
                Green Passport
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                {[
                  { label: "GPS Verified",       pass: lot.gps_verified,       icon: <MapPin size={12} /> },
                  { label: "Deforestation Free",  pass: lot.deforestation_free,  icon: <Leaf size={12} /> },
                  { label: "EUDR DDS Ready",      pass: lot.eudr_dds_ready,      icon: <FileCheck size={12} /> },
                ].map(item => (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: "3px",
                    background: item.pass ? "rgba(30,58,47,0.15)" : "rgba(245,237,216,0.03)",
                    border: `1px solid ${item.pass ? "rgba(74,124,89,0.25)" : "rgba(245,237,216,0.07)"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: item.pass ? "#4A7C59" : "rgba(245,237,216,0.2)" }}>{item.icon}</span>
                      <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: item.pass ? "rgba(245,237,216,0.8)" : "rgba(245,237,216,0.35)" }}>
                        {item.label}
                      </span>
                    </div>
                    {item.pass
                      ? <CheckCircle size={14} color="#4A7C59" />
                      : <XCircle size={14} color="rgba(245,237,216,0.15)" />
                    }
                  </div>
                ))}
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "12px",
                background: lot.green_passport_ready ? "rgba(74,124,89,0.12)" : "rgba(245,237,216,0.03)",
                border: `1px solid ${lot.green_passport_ready ? "rgba(74,124,89,0.3)" : "rgba(245,237,216,0.07)"}`,
                borderRadius: "3px",
              }}>
                <Leaf size={13} color={lot.green_passport_ready ? "#A8C5A0" : "rgba(245,237,216,0.2)"} />
                <p style={{
                  fontFamily: "DM Mono, monospace", fontSize: "0.62rem",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: lot.green_passport_ready ? "#A8C5A0" : "rgba(245,237,216,0.2)",
                  margin: 0,
                }}>
                  {lot.green_passport_ready ? "Green Passport Issued" : "Passport Not Yet Issued"}
                </p>
              </div>
            </div>

            {/* Sample Request */}
            <SampleRequestWidget lotId={lot.id} lotRef={lot.lot_id} />

            {/* Q-Grader actions */}
            {(user?.role === "qgrader" || user?.role === "admin") && (
              <div style={{ background: "#2C1810", border: "1px solid rgba(212,130,74,0.15)", borderRadius: "6px", padding: "24px" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#D4824A", margin: "0 0 14px" }}>
                  Q-Grader Actions
                </p>
                <button
                  onClick={() => navigate(`/lots/${lot.id}/cup`)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "8px",
                    padding: "11px", borderRadius: "3px",
                    background: "rgba(212,130,74,0.08)",
                    border: "1px solid rgba(212,130,74,0.3)",
                    color: "#D4824A", cursor: "pointer",
                    fontFamily: "DM Mono, monospace", fontSize: "0.68rem",
                    letterSpacing: "0.12em", textTransform: "uppercase",
                  }}
                >
                  <FlaskConical size={13} /> Submit Cupping Score
                </button>
              </div>
            )}

            {/* Contributing farmers count */}
            <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "rgba(74,124,89,0.12)", border: "1px solid rgba(74,124,89,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={16} color="#4A7C59" />
                </div>
                <div>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 2px" }}>
                    Traceability
                  </p>
                  <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: "#F5EDD8", margin: 0 }}>
                    {lot.washing_station || "Washing Station"} · {lot.kebele || lot.region}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
