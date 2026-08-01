import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLot, getComplianceCheck, downloadEudrDds } from "../api/lots";
import { getCuppingScores } from "../api/cupping";
import { useAuth } from "../context/AuthContext";
import AdminShell from "../components/admin/AdminShell";
import { LotStatusBadge } from "../components/admin/AdminStatusBadge";
import PolygonCaptureWidget from "../components/PolygonCaptureWidget";
import FarmMapDisplay from "../components/FarmMapDisplay";
import CuppingHistory from "../components/CuppingHistory";
import SampleRequestWidget from "../components/SampleRequestWidget";
import SettlementWidget from "../components/SettlementWidget";
import LotDocuments from "../components/LotDocuments";
import LotPhotos from "../components/LotPhotos";
import { useState } from "react";
import {
  ArrowLeft, MapPin, Mountain, Layers, Award, Download,
  ShieldCheck, ShieldAlert, ShieldOff, Clock, CheckCircle,
  XCircle, AlertTriangle, Leaf, FileCheck, Upload, Lock,
  Pencil, FlaskConical, TrendingUp, Package, Users,
  Globe, BadgeCheck, Share2
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

function RadarChart({ scores }: { scores: Record<string, number> }) {
  const attrs = ["fragrance_aroma", "flavor", "aftertaste", "acidity", "body", "balance", "sweetness", "overall"];
  const labels = ["Fragrance", "Flavor", "Aftertaste", "Acidity", "Body", "Balance", "Sweetness", "Overall"];
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
  const polyline = scorePoints.map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 220 }}>
      {[0.25, 0.5, 0.75, 1].map((pct) => (
        <polygon key={pct} points={attrs.map((_, i) => gridPoint(i, pct).join(",")).join(" ")} fill="none" stroke={AT.color.border} strokeWidth="1" />
      ))}
      {attrs.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={gridPoint(i, 1)[0]} y2={gridPoint(i, 1)[1]} stroke={AT.color.border} strokeWidth="1" />
      ))}
      <polygon points={polyline} fill={`${AT.color.primary}1a`} stroke={AT.color.primary} strokeWidth="1.5" />
      {scorePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={AT.color.primary} stroke={AT.color.surface} strokeWidth="1.5" />
      ))}
      {attrs.map((_, i) => {
        const [x, y] = gridPoint(i, 1.22);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill={AT.color.textMuted} fontFamily={AT.font.mono}>
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

export default function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isExporter = user?.role === "exporter" || user?.role === "admin";
  const [ddsLoading, setDdsLoading] = useState(false);
  const [ddsError, setDdsError] = useState("");

  const { data: lot, isLoading, refetch } = useQuery({
    queryKey: ["lot", id],
    queryFn: () => getLot(id!),
    enabled: !!id,
  });
  const { data: compliance } = useQuery({
    queryKey: ["compliance", id],
    queryFn: () => getComplianceCheck(id!),
    enabled: !!id,
  });
  const { data: cuppingScores } = useQuery({
    queryKey: ["cupping-scores", id],
    queryFn: () => getCuppingScores(id!),
    enabled: !!id,
  });

  const gateLabels: Record<string, string> = {
    gps_verified: "GPS Verified",
    deforestation_free: "Deforestation Free",
    eudr_dds_ready: "EUDR DDS Ready",
    phyto_cert_uploaded: "Phytosanitary Cert",
    ecta_license_active: "ECTA License",
    nbe_fx_declared: "NBE FX Declaration",
    cta_floor_met: "CTA Floor Price Met",
  };
  const gateIcons: Record<string, React.ReactNode> = {
    gps_verified: <MapPin size={12} />,
    deforestation_free: <Leaf size={12} />,
    eudr_dds_ready: <FileCheck size={12} />,
    phyto_cert_uploaded: <Upload size={12} />,
    ecta_license_active: <ShieldCheck size={12} />,
    nbe_fx_declared: <TrendingUp size={12} />,
    cta_floor_met: <Award size={12} />,
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading lot…</p>
        </div>
      </AdminShell>
    );
  }
  if (!lot) {
    return (
      <AdminShell>
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.9rem", color: AT.color.red }}>Lot not found.</p>
      </AdminShell>
    );
  }

  const bestScore = cuppingScores?.find((s) => s.status === "confirmed") ?? cuppingScores?.[0] ?? null;
  const radarScores: Record<string, number> = bestScore ? {
    fragrance_aroma: parseFloat(String(bestScore.fragrance_aroma)) || 8,
    flavor: parseFloat(String(bestScore.flavor)) || 8,
    aftertaste: parseFloat(String(bestScore.aftertaste)) || 8,
    acidity: parseFloat(String(bestScore.acidity)) || 8,
    body: parseFloat(String(bestScore.body)) || 8,
    balance: parseFloat(String(bestScore.balance)) || 8,
    sweetness: parseFloat(String(bestScore.sweetness)) || 8,
    overall: parseFloat(String(bestScore.overall)) || 8,
  } : { fragrance_aroma: 8, flavor: 8, aftertaste: 8, acidity: 8, body: 8, balance: 8, sweetness: 8, overall: 8 };

  const hasRealScores = !!bestScore;
  const dcStatus = compliance?.deforestation_check?.status;
  const allGatesPass = compliance && compliance.failed_gates.length === 0;
  const scaNum = lot.sca_score ? parseFloat(String(lot.sca_score)) : null;

  const trustBadges = [
    { icon: <Globe size={13} />, label: "100% Traceable", active: lot.gps_verified },
    { icon: <Leaf size={13} />, label: "Zero Deforestation", active: lot.deforestation_free },
    { icon: <Users size={13} />, label: "Farmer Positive", active: true },
    { icon: <BadgeCheck size={13} />, label: "EU Compliant", active: lot.eudr_dds_ready },
  ];

  const card: React.CSSProperties = { ...AC.card, ...AC.cardPad };
  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };
  const gateRow = (pass: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", borderRadius: AT.radius.sm,
    background: pass ? AT.color.primaryLight : AT.color.redLight,
    border: `1px solid ${pass ? AT.color.primary + "33" : AT.color.red + "22"}`,
  });

  return (
    <AdminShell>
      <div style={{ maxWidth: "1140px" }}>
        <button
          onClick={() => navigate("/lots")}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, padding: 0, marginBottom: "16px" }}
        >
          <ArrowLeft size={14} /> Back to Lots
        </button>

        <div style={{ ...AC.card, marginBottom: "20px", overflow: "hidden" }}>
          <div style={{ background: AT.color.sidebarBg, padding: "24px 28px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "999px", background: `${AT.color.primary}14` }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", position: "relative" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <p style={{ fontFamily: AT.font.mono, fontSize: "0.7rem", color: AT.color.sidebarText, margin: 0, letterSpacing: "0.04em" }}>{lot.lot_id}</p>
                  <LotStatusBadge status={lot.status} />
                </div>
                <h1 style={{ fontFamily: AT.font.sans, fontSize: "1.7rem", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", lineHeight: 1.15 }}>
                  {lot.name}
                </h1>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.sidebarTextHover, margin: "0 0 14px", textTransform: "capitalize" }}>
                  {lot.region} · {lot.processing} · {lot.grade}
                </p>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {[
                    { icon: <Mountain size={12} />, label: "Altitude", val: `${Number(lot.altitude_m).toLocaleString()} masl` },
                    { icon: <Package size={12} />, label: "Volume", val: `${Number(lot.volume_kg).toLocaleString()} kg` },
                    { icon: <MapPin size={12} />, label: "Kebele", val: lot.kebele || lot.region },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ color: AT.color.sidebarText, opacity: 0.6 }}>{m.icon}</span>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.sidebarText, opacity: 0.7 }}>{m.label}</span>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: "#ffffff" }}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {lot.sca_score && (
                <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: AT.radius.md, padding: "14px 22px", textAlign: "center", flexShrink: 0 }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.6)", margin: "0 0 2px", textTransform: "uppercase" }}>Q-Score</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "2.2rem", fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1 }}>{lot.sca_score}</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", color: "rgba(255,255,255,0.5)", margin: "3px 0 0" }}>
                    {scaNum && scaNum >= 90 ? "Outstanding" : scaNum && scaNum >= 85 ? "Excellent" : scaNum && scaNum >= 80 ? "Specialty" : "Standard"}
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "18px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.12)", position: "relative" }}>
              {trustBadges.map((b) => (
                <div
                  key={b.label}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "5px 12px", borderRadius: AT.radius.pill,
                    background: b.active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${b.active ? AT.color.primary + "77" : "rgba(255,255,255,0.1)"}`,
                    fontFamily: AT.font.sans, fontSize: "0.72rem",
                    color: b.active ? "#ffffff" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {b.icon} {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ld-grid" style={{ display: "grid", gridTemplateColumns: "clamp(1px,100%,1.4fr) clamp(1px,100%,1fr)", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={card}>
              <p style={cardTitle}>Quality & Sensory</p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {lot.sca_score && (
                  <div style={{ flex: 1, minWidth: "90px", background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, borderRadius: AT.radius.md, padding: "14px 16px", textAlign: "center", overflow: "hidden" }}>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.6rem", color: AT.color.primaryDark, opacity: 0.75, margin: "0 0 4px", textTransform: "uppercase" }}>Q-Score</p>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "clamp(1.3rem, 6vw, 2rem)", fontWeight: 700, color: AT.color.primaryDark, margin: 0, lineHeight: 1 }}>{Number(lot.sca_score).toFixed(1)}</p>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: "90px", background: AT.color.blueLight, border: `1px solid ${AT.color.blue}33`, borderRadius: AT.radius.md, padding: "14px 16px", textAlign: "center", overflow: "hidden" }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.6rem", color: AT.color.blue, margin: "0 0 4px", textTransform: "uppercase" }}>Altitude</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "clamp(1.3rem, 6vw, 2rem)", fontWeight: 700, color: AT.color.blue, margin: 0, lineHeight: 1 }}>{Number(lot.altitude_m).toLocaleString()}</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.58rem", color: AT.color.blue, opacity: 0.75, margin: "2px 0 0" }}>MASL</p>
                </div>
                <div style={{ flex: 1, minWidth: "90px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: "14px 16px", textAlign: "center", overflow: "hidden" }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.6rem", color: AT.color.textMuted, margin: "0 0 4px", textTransform: "uppercase" }}>Volume</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "clamp(1.3rem, 6vw, 2rem)", fontWeight: 700, color: AT.color.text, margin: 0, lineHeight: 1 }}>{Number(lot.volume_kg).toLocaleString()}</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.58rem", color: AT.color.textDisabled, margin: "2px 0 0" }}>KG</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flexShrink: 0, width: "180px" }}>
                  <RadarChart scores={radarScores} />
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", textAlign: "center", margin: "4px 0 0", color: hasRealScores ? AT.color.primaryDark : AT.color.textDisabled }}>
                    {hasRealScores ? (bestScore?.status === "confirmed" ? "Confirmed score" : "Latest score") : "No score yet"}
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: "140px" }}>
                  {lot.q_grader_name && (
                    <div style={{ marginBottom: "12px" }}>
                      <p style={{ fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, margin: "0 0 3px" }}>Q-Grader</p>
                      <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, margin: 0 }}>
                        {lot.q_grader_name}
                        {lot.q_grader_cert_id && <span style={{ fontFamily: AT.font.mono, fontSize: "0.72rem", color: AT.color.textMuted }}> · #{lot.q_grader_cert_id}</span>}
                      </p>
                    </div>
                  )}
                  {lot.flavor_notes && (
                    <div>
                      <p style={{ fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, margin: "0 0 6px" }}>Flavor Notes</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {lot.flavor_notes.split(",").map((f: string) => (
                          <span key={f} style={{ padding: "3px 9px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.pill, fontFamily: AT.font.sans, fontSize: "0.7rem", color: AT.color.textSecondary }}>
                            {f.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {lot.sca_score && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontFamily: AT.font.mono, fontSize: "0.62rem", color: AT.color.textDisabled }}>80</span>
                        <span style={{ fontFamily: AT.font.mono, fontSize: "0.62rem", color: AT.color.textDisabled }}>100</span>
                      </div>
                      <div style={{ height: "4px", background: AT.color.surfaceSecondary, borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "2px", background: AT.color.primary, width: `${((parseFloat(String(lot.sca_score)) - 80) / 20) * 100}%`, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={card}>
              <p style={cardTitle}>Origin & Processing</p>
              <div className="ab-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {[
                  ["Processing", lot.processing],
                  ["Varietal", lot.varietal || "Ethiopian Heirloom"],
                  ["Harvest Date", lot.harvest_date],
                  ["Washing Station", lot.washing_station || "—"],
                  ["Kebele", lot.kebele || "—"],
                  ["Price / kg", lot.price_per_kg ? `$${lot.price_per_kg}` : "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.text, margin: 0, textTransform: "capitalize" }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <CuppingHistory lotId={lot.id} />
              <div style={{ marginTop: "24px" }}>
                <SettlementWidget
                  lotId={lot.id} lotRef={lot.lot_id}
                  defaultUsd={lot.price_per_kg && lot.volume_kg
                    ? parseFloat(String(lot.price_per_kg)) * parseFloat(String(lot.volume_kg))
                    : undefined}
                />
              </div>
            </div>

            <div style={card}>
              <LotDocuments lot={lot} lotId={lot.id} />
            </div>

            <div style={card}>
              <LotPhotos lotId={lot.id} photos={lot.farm_photos ?? []} />
            </div>

            {isExporter && (
              <PolygonCaptureWidget
                mode="lot" lotId={lot.id}
                existingPolygon={lot.boundary ?? null}
                canInherit={true} onSaved={() => refetch()}
              />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {lot.boundary && (
              <div style={{ ...AC.card, overflow: "hidden" }}>
                <FarmMapDisplay polygon={lot.boundary} label="Lot Boundary" height={200} />
              </div>
            )}

            <div style={card}>
              <p style={cardTitle}>EUDR Compliance</p>

              {compliance && (
                <div style={{
                  padding: "16px", borderRadius: AT.radius.md, marginBottom: "16px",
                  background: allGatesPass ? AT.color.primaryLight : AT.color.redLight,
                  border: `1px solid ${allGatesPass ? AT.color.primary + "44" : AT.color.red + "33"}`,
                  textAlign: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
                    {allGatesPass ? <ShieldCheck size={18} color={AT.color.primaryDark} /> : <ShieldAlert size={18} color={AT.color.red} />}
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.95rem", fontWeight: 600, color: allGatesPass ? AT.color.primaryDark : AT.color.red, margin: 0 }}>
                      {allGatesPass ? "Status: Verified" : `${compliance.failed_gates.length} gate${compliance.failed_gates.length > 1 ? "s" : ""} failing`}
                    </p>
                  </div>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: allGatesPass ? AT.color.primaryDark : AT.color.red, opacity: 0.8, margin: 0 }}>
                    {allGatesPass ? "Negligible Risk · Export Cleared" : "Export button blocked until all gates pass"}
                  </p>
                </div>
              )}

              {compliance?.deforestation_check && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "10px 12px", borderRadius: AT.radius.sm, marginBottom: "14px",
                  background: dcStatus === "clear" ? AT.color.primaryLight : dcStatus === "overlap" ? AT.color.redLight : AT.color.yellowLight,
                  border: `1px solid ${dcStatus === "clear" ? AT.color.primary + "33" : dcStatus === "overlap" ? AT.color.red + "33" : AT.color.yellow + "33"}`,
                }}>
                  <span style={{ flexShrink: 0, marginTop: "1px", color: dcStatus === "clear" ? AT.color.primaryDark : dcStatus === "overlap" ? AT.color.red : "#b45309" }}>
                    {dcStatus === "clear" && <ShieldCheck size={13} />}
                    {dcStatus === "overlap" && <ShieldAlert size={13} />}
                    {dcStatus === "pending" && <Clock size={13} />}
                    {dcStatus === "no_data" && <ShieldOff size={13} />}
                  </span>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", margin: 0, color: dcStatus === "clear" ? AT.color.primaryDark : dcStatus === "overlap" ? AT.color.red : "#b45309" }}>
                    {compliance.deforestation_check.message}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "18px" }}>
                {compliance ? Object.entries(compliance.gates).map(([key, pass]) => {
                  if (key === "deforestation_free") {
                    const dc = compliance.deforestation_check;
                    const isPending = dc?.status === "pending" || dc?.status === "no_data";
                    const isOverlap = dc?.status === "overlap";
                    const ic = isPending ? "#b45309" : isOverlap ? AT.color.red : AT.color.primaryDark;
                    return (
                      <div key={key} style={gateRow(!isPending && !isOverlap)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                          <span style={{ color: ic, flexShrink: 0 }}>{gateIcons[key]}</span>
                          <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text }}>{gateLabels[key]}</span>
                        </div>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: AT.font.sans, fontSize: "0.68rem", color: ic, fontWeight: 600 }}>
                          {isPending ? <Clock size={10} /> : isOverlap ? <XCircle size={10} /> : <CheckCircle size={10} />}
                          {isPending ? "Pending" : isOverlap ? "Overlap" : "Pass"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={key} style={gateRow(!!pass)}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ color: pass ? AT.color.primaryDark : AT.color.red, flexShrink: 0 }}>{gateIcons[key]}</span>
                        <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text }}>{gateLabels[key] || key}</span>
                      </div>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: AT.font.sans, fontSize: "0.68rem", color: pass ? AT.color.primaryDark : AT.color.red, fontWeight: 600 }}>
                        {pass ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {pass ? "Pass" : "Fail"}
                      </span>
                    </div>
                  );
                }) : (
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted }}>Loading…</p>
                )}
              </div>

              {compliance && compliance.failed_gates.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", borderRadius: AT.radius.sm, marginBottom: "14px", background: AT.color.redLight, border: `1px solid ${AT.color.red}33` }}>
                  <AlertTriangle size={13} style={{ color: AT.color.red, flexShrink: 0, marginTop: "1px" }} />
                  <div>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.red, letterSpacing: "0.04em", margin: "0 0 3px", textTransform: "uppercase" }}>
                      {compliance.failed_gates.length} gate{compliance.failed_gates.length > 1 ? "s" : ""} failing
                    </p>
                    {compliance.failed_gates.map((g: string) => (
                      <p key={g} style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.red, opacity: 0.85, margin: "2px 0" }}>{gateLabels[g] || g}</p>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  onClick={async () => {
                    setDdsLoading(true); setDdsError("");
                    try { await downloadEudrDds(lot.id); }
                    catch (e: unknown) { setDdsError((e as Error).message); }
                    finally { setDdsLoading(false); }
                  }}
                  disabled={!lot.eudr_dds_ready || ddsLoading}
                  style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center", opacity: lot.eudr_dds_ready ? 1 : 0.45, cursor: lot.eudr_dds_ready ? "pointer" : "not-allowed" }}
                >
                  {ddsLoading ? <Clock size={14} /> : <Download size={14} />}
                  {ddsLoading ? "Generating PDF…" : "Generate EUDR DDS Certificate"}
                </button>
                {ddsError && <p style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.red, margin: 0 }}>{ddsError}</p>}

                {isExporter && (
                  <button onClick={() => navigate(`/lots/${lot.id}/edit`)} style={{ ...AC.btnGhost, width: "100%", justifyContent: "center" }}>
                    <Pencil size={13} /> Edit Lot
                  </button>
                )}

                {(lot.status === "listed" || lot.status === "contracted" || lot.status === "exported") && (
                  <button
                    onClick={() => window.open(`/story/${lot.id}`, "_blank", "noopener,noreferrer")}
                    style={{ ...AC.btnGhost, width: "100%", justifyContent: "center" }}
                  >
                    <Share2 size={13} /> Public Lot Story
                  </button>
                )}

                <button
                  disabled={!lot.export_ready}
                  style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center", opacity: lot.export_ready ? 1 : 0.45, cursor: lot.export_ready ? "pointer" : "not-allowed" }}
                >
                  {lot.export_ready ? <><TrendingUp size={14} /> Proceed to Export</> : <><Lock size={14} /> Export Locked</>}
                </button>
              </div>
            </div>

            <div style={card}>
              <p style={cardTitle}>Traceability</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  ...(lot.farmer_name ? [{
                    icon: <Users size={12} />, label: "Farmer",
                    val: lot.farmer_farm_id ? `${lot.farmer_name} (${lot.farmer_farm_id})` : lot.farmer_name,
                  }] : []),
                  { icon: <MapPin size={12} />, label: "Washing Station", val: lot.washing_station || "—" },
                  { icon: <Layers size={12} />, label: "Kebele", val: lot.kebele || lot.region },
                  { icon: <Mountain size={12} />, label: "Region", val: lot.region },
                  { icon: <Globe size={12} />, label: "Country", val: "Ethiopia" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ color: AT.color.textDisabled }}>{row.icon}</span>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textDisabled, textTransform: "uppercase" }}>{row.label}</span>
                    </div>
                    <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, textTransform: "capitalize" }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <p style={cardTitle}>Green Passport</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                {[
                  { label: "GPS Verified", pass: lot.gps_verified, icon: <MapPin size={11} /> },
                  { label: "Deforestation Free", pass: lot.deforestation_free, icon: <Leaf size={11} /> },
                  { label: "EUDR DDS Ready", pass: lot.eudr_dds_ready, icon: <FileCheck size={11} /> },
                ].map((item) => (
                  <div key={item.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 10px", borderRadius: AT.radius.sm,
                    background: item.pass ? AT.color.primaryLight : AT.color.surfaceSecondary,
                    border: `1px solid ${item.pass ? AT.color.primary + "33" : AT.color.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ color: item.pass ? AT.color.primaryDark : AT.color.textDisabled }}>{item.icon}</span>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: item.pass ? AT.color.text : AT.color.textMuted }}>{item.label}</span>
                    </div>
                    {item.pass ? <CheckCircle size={13} color={AT.color.primaryDark} /> : <XCircle size={13} color={AT.color.textDisabled} />}
                  </div>
                ))}
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px",
                background: lot.green_passport_ready ? AT.color.primaryLight : AT.color.surfaceSecondary,
                border: `1px solid ${lot.green_passport_ready ? AT.color.primary + "33" : AT.color.border}`,
                borderRadius: AT.radius.md,
              }}>
                <Leaf size={13} color={lot.green_passport_ready ? AT.color.primaryDark : AT.color.textDisabled} />
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", margin: 0, color: lot.green_passport_ready ? AT.color.primaryDark : AT.color.textMuted }}>
                  {lot.green_passport_ready ? "Green Passport Issued" : "Passport Not Yet Issued"}
                </p>
              </div>
            </div>

            <SampleRequestWidget lotId={lot.id} lotRef={lot.lot_id} />

            {(user?.role === "qgrader" || user?.role === "admin") && (
              <div style={{ ...card, borderColor: `${AT.color.primary}44` }}>
                <p style={{ ...cardTitle, color: AT.color.primaryDark }}>Q-Grader Actions</p>
                <button
                  onClick={() => navigate(`/lots/${lot.id}/cup`)}
                  style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center" }}
                >
                  <FlaskConical size={14} /> Submit Cupping Score
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px){ .ld-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px){ .ab-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </AdminShell>
  );
}
