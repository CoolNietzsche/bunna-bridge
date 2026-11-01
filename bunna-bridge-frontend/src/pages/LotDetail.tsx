import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLot, getComplianceCheck } from "../api/lots";
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
import ComplianceGatesPanel from "../components/ComplianceGatesPanel";
import {
  ArrowLeft, MapPin, Mountain, Layers, ShieldCheck, Leaf,
  Pencil, FlaskConical, Package, Users, Globe, BadgeCheck, Share2,
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { titleCase } from "../lib/utils";
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
    <svg viewBox="-24 -6 268 232" style={{ width: "100%", maxWidth: 240 }}>
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

  const { data: lot, isLoading, refetch } = useQuery({
    queryKey: ["lot", id],
    queryFn: () => getLot(id!),
    enabled: !!id,
  });
  const { data: compliance, refetch: refetchCompliance } = useQuery({
    queryKey: ["compliance", id],
    queryFn: () => getComplianceCheck(id!),
    enabled: !!id,
  });
  const { data: cuppingScores } = useQuery({
    queryKey: ["cupping-scores", id],
    queryFn: () => getCuppingScores(id!),
    enabled: !!id,
  });

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
  const scaNum = lot.sca_score ? parseFloat(String(lot.sca_score)) : null;
  const isOwner = !!user && (user.role === "admin" || String(user.id) === String(lot.exporter));
  const qVerified = !!cuppingScores?.some((s) => s.status === "confirmed");

  const trustBadges = [
    { icon: <Globe size={13} />, label: "Geolocated", active: lot.gps_verified },
    { icon: <Leaf size={13} />, label: "Deforestation-free", active: lot.deforestation_free },
    { icon: <FlaskConical size={13} />, label: "Q-grader verified", active: qVerified },
    { icon: <BadgeCheck size={13} />, label: "EUDR statement", active: lot.eudr_dds_ready },
    { icon: <ShieldCheck size={13} />, label: "Export-ready", active: lot.export_ready },
  ];

  const card: React.CSSProperties = { ...AC.card, ...AC.cardPad };
  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };

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
          <div style={{ background: AT.color.heroBg, padding: "24px 28px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "999px", background: `${AT.color.primary}14` }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", position: "relative" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <p style={{ fontFamily: AT.font.mono, fontSize: "0.7rem", color: AT.color.heroTextMuted, margin: 0, letterSpacing: "0.04em" }}>{lot.lot_id}</p>
                  <LotStatusBadge status={lot.status} />
                </div>
                <h1 style={{ fontFamily: AT.font.display, fontSize: "clamp(2rem, 4vw, 2.6rem)", fontWeight: 700, color: "#ffffff", margin: "0 0 6px", lineHeight: 1.08, letterSpacing: "-0.03em" }}>
                  {lot.name}
                </h1>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.heroText, margin: "0 0 14px", textTransform: "capitalize" }}>
                  {lot.region} · {lot.processing} · {lot.grade}
                </p>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  {[
                    { icon: <Mountain size={12} />, label: "Altitude", val: `${Number(lot.altitude_m).toLocaleString()} masl` },
                    { icon: <Package size={12} />, label: "Volume", val: `${Number(lot.volume_kg).toLocaleString()} kg` },
                    { icon: <MapPin size={12} />, label: "Kebele", val: lot.kebele || lot.region },
                  ].map((m) => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ color: AT.color.heroTextMuted, opacity: 0.6 }}>{m.icon}</span>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.heroTextMuted, opacity: 0.7 }}>{m.label}</span>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: "#ffffff" }}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {lot.sca_score && (
                <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: AT.radius.md, padding: "14px 22px", textAlign: "center", flexShrink: 0 }}>
                  <p style={{ fontFamily: AT.font.sans, fontWeight: 500, fontSize: "0.74rem", color: "rgba(255,255,255,0.6)", margin: "0 0 2px" }}>Q-Score</p>
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

        <div className="ld-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={card}>
              <p style={cardTitle}>Quality & Sensory</p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                {lot.sca_score && (
                  <div style={{ flex: 1, minWidth: "90px", background: AT.color.surfaceSecondary, borderRadius: "14px", padding: "16px", textAlign: "center", overflow: "hidden" }}>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 500, color: AT.color.textSecondary, margin: "0 0 6px" }}>Q-score</p>
                    <p style={{ fontFamily: AT.font.display, fontSize: "clamp(1.5rem, 6vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.03em", color: AT.color.green, margin: 0, lineHeight: 1 }}>{Number(lot.sca_score).toFixed(1)}</p>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: "90px", background: AT.color.surfaceSecondary, borderRadius: "14px", padding: "16px", textAlign: "center", overflow: "hidden" }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 500, color: AT.color.textSecondary, margin: "0 0 6px" }}>Altitude</p>
                  <p style={{ fontFamily: AT.font.display, fontSize: "clamp(1.5rem, 6vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.03em", color: AT.color.text, margin: 0, lineHeight: 1 }}>{Number(lot.altitude_m).toLocaleString()}</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.textMuted, margin: "4px 0 0" }}>metres</p>
                </div>
                <div style={{ flex: 1, minWidth: "90px", background: AT.color.surfaceSecondary, borderRadius: "14px", padding: "16px", textAlign: "center", overflow: "hidden" }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 500, color: AT.color.textSecondary, margin: "0 0 6px" }}>Volume</p>
                  <p style={{ fontFamily: AT.font.display, fontSize: "clamp(1.5rem, 6vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.03em", color: AT.color.text, margin: 0, lineHeight: 1 }}>{Number(lot.volume_kg).toLocaleString()}</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.textMuted, margin: "4px 0 0" }}>kg</p>
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
                      <p style={{ fontFamily: AT.font.sans, fontSize: "0.76rem", fontWeight: 500, color: AT.color.textMuted, margin: "0 0 3px" }}>Q-Grader</p>
                      <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, margin: 0 }}>
                        {lot.q_grader_name}
                        {lot.q_grader_cert_id && <span style={{ fontFamily: AT.font.mono, fontSize: "0.72rem", color: AT.color.textMuted }}> · #{lot.q_grader_cert_id}</span>}
                      </p>
                    </div>
                  )}
                  {lot.flavor_notes && (
                    <div>
                      <p style={{ fontFamily: AT.font.sans, fontSize: "0.76rem", fontWeight: 500, color: AT.color.textMuted, margin: "0 0 6px" }}>Flavor Notes</p>
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
                  ["Available", `${Number(lot.available_qty_kg).toLocaleString()} kg`],
                  ["FOB / kg", lot.fob_price_usd ? `$${Number(lot.fob_price_usd).toFixed(2)}` : "—"],
                  ["Processing", titleCase(lot.processing)],
                  ["Varietal", lot.varietal || "Ethiopian Heirloom"],
                  ["Harvest Date", lot.harvest_date],
                  ["Washing Station", lot.washing_station || "—"],
                  ["Kebele", lot.kebele || "—"],
                  ["Delivery window", lot.delivery_window || "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.76rem", fontWeight: 500, color: AT.color.textMuted, margin: "0 0 4px" }}>{label}</p>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.text, margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <CuppingHistory lotId={lot.id} />
            </div>

            {isOwner && (
              <div style={card}>
                <SettlementWidget
                  lotId={lot.id} lotRef={lot.lot_id}
                  defaultUsd={lot.price_per_kg && lot.volume_kg
                    ? parseFloat(String(lot.price_per_kg)) * parseFloat(String(lot.volume_kg))
                    : undefined}
                />
              </div>
            )}

            {isOwner && (
              <div style={card}>
                <LotDocuments lot={lot} lotId={lot.id} />
              </div>
            )}

            <div style={card}>
              <LotPhotos lotId={lot.id} photos={lot.farm_photos ?? []} />
            </div>

            {isOwner && (
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

            <ComplianceGatesPanel
              lot={lot} compliance={compliance} isOwner={isOwner}
              onChanged={() => { refetch(); refetchCompliance(); }}
            />

            {(isOwner || lot.status !== "draft") && (
              <div style={{ display: "grid", gridTemplateColumns: isOwner ? "1fr 1fr" : "1fr", gap: "8px" }}>
                {isOwner && (
                  <button onClick={() => navigate(`/lots/${lot.id}/edit`)} style={{ ...AC.btnGhost, justifyContent: "center" }}>
                    <Pencil size={13} /> Edit lot
                  </button>
                )}
                {lot.status !== "draft" && (
                  <button
                    onClick={() => window.open(`/story/${lot.id}`, "_blank", "noopener,noreferrer")}
                    style={{ ...AC.btnGhost, justifyContent: "center" }}
                  >
                    <Share2 size={13} /> Public story
                  </button>
                )}
              </div>
            )}

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
                      <span style={{ fontFamily: AT.font.sans, fontWeight: 500, fontSize: "0.74rem", color: AT.color.textDisabled }}>{row.label}</span>
                    </div>
                    <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, textTransform: "capitalize" }}>{row.val}</span>
                  </div>
                ))}
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
