import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLot, getComplianceCheck } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import ComplianceBadge from "../components/ComplianceBadge";
import StatusPill from "../components/StatusPill";
import CuppingHistory from '../components/CuppingHistory';
import SettlementWidget from '../components/SettlementWidget';

export default function LotDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const { data: lot, isLoading } = useQuery({
    queryKey: ["lot", id],
    queryFn:  () => getLot(id!),
    enabled:  !!id,
  });

  const { data: compliance } = useQuery({
    queryKey: ["compliance", id],
    queryFn:  () => getComplianceCheck(id!),
    enabled:  !!id,
  });

  const s = {
    page:      { padding: "2rem 2.5rem", maxWidth: "1100px" },
    back:      { background: "none", border: "none", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)", cursor: "pointer", marginBottom: "1.5rem", padding: 0 },
    grid:      { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem", alignItems: "start" },
    card:      { background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", padding: "1.5rem" },
    cardTitle: { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#D4824A", marginBottom: "1.2rem", marginTop: 0 },
    field:     { marginBottom: "1rem" },
    flabel:    { fontFamily: "monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.35)", marginBottom: "0.25rem" },
    fval:      { fontSize: "0.9rem", color: "#F5EDD8" },
    fvalMono:  { fontFamily: "monospace", fontSize: "0.8rem", color: "#F5EDD8" },
    sca:       { background: "rgba(201,149,42,0.08)", border: "1px solid rgba(201,149,42,0.2)", borderRadius: "3px", padding: "1rem", marginBottom: "1.2rem" },
    scaNum:    { fontFamily: "serif", fontSize: "2.5rem", fontWeight: 300, color: "#C9952A", lineHeight: 1 },
    track:     { height: "4px", background: "rgba(245,237,216,0.1)", borderRadius: "2px", margin: "0.5rem 0", overflow: "hidden" },
    fill:      (score: number) => ({ height: "100%", width: `${((score - 80) / 20) * 100}%`, background: "linear-gradient(to right, #C1440E, #C9952A)", borderRadius: "2px" }),
    gates:     { display: "flex", flexDirection: "column" as const, gap: "0.5rem" },
    gate:      (pass: boolean) => ({
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.6rem 0.8rem", borderRadius: "2px",
      background: pass ? "rgba(74,124,89,0.1)" : "rgba(193,68,14,0.1)",
      border: `1px solid ${pass ? "rgba(74,124,89,0.25)" : "rgba(193,68,14,0.25)"}`,
    }),
    gateLabel: { fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(245,237,216,0.7)" },
    gateIcon:  (pass: boolean) => ({ fontFamily: "monospace", fontSize: "0.7rem", color: pass ? "#A8C5A0" : "#C1440E", fontWeight: 700 }),
    exportBtn: (ready: boolean) => ({
      width: "100%", padding: "0.9rem", borderRadius: "2px",
      fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.15em",
      textTransform: "uppercase" as const, cursor: ready ? "pointer" : "not-allowed",
      border: "none", marginTop: "1rem",
      background: ready ? "#C1440E" : "rgba(245,237,216,0.06)",
      color: ready ? "white" : "rgba(245,237,216,0.25)",
    }),
    flavors:   { display: "flex", flexWrap: "wrap" as const, gap: "0.4rem", marginTop: "0.5rem" },
    flavor:    { padding: "0.25rem 0.6rem", background: "rgba(201,149,42,0.1)", border: "1px solid rgba(201,149,42,0.2)", borderRadius: "2px", fontFamily: "monospace", fontSize: "0.58rem", color: "#C9952A", letterSpacing: "0.05em" },
    cupBtn:    { width: "100%", background: "#2C1810", border: "1px solid rgba(212,130,74,0.4)", borderRadius: "2px", padding: "0.8rem", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "#D4824A", cursor: "pointer" },
  };

  if (isLoading) return (
    <PageWrapper>
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ fontFamily: "monospace", color: "#D4824A", letterSpacing: "0.2em", fontSize: "0.75rem" }}>LOADING LOT...</p>
      </div>
    </PageWrapper>
  );

  if (!lot) return (
    <PageWrapper>
      <div style={s.page}>
        <p style={{ fontFamily: "monospace", color: "#C1440E" }}>Lot not found.</p>
      </div>
    </PageWrapper>
  );

  const gateLabels: Record<string, string> = {
    gps_verified:        "GPS Verified",
    deforestation_free:  "Deforestation Free",
    eudr_dds_ready:      "EUDR DDS Ready",
    phyto_cert_uploaded: "Phytosanitary Cert",
    ecta_license_active: "ECTA License",
    nbe_fx_declared:     "NBE FX Declaration",
    cta_floor_met:       "CTA Floor Price Met",
  };

  return (
    <PageWrapper>
      <div style={s.page}>
        <button style={s.back} onClick={() => navigate("/lots")}>← Back to Lots</button>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.4rem" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: 0 }}>{lot.name}</h1>
            <StatusPill status={lot.status} />
            {lot.green_passport_ready && (
              <span style={{ fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.1em", padding: "0.25rem 0.6rem", background: "rgba(74,124,89,0.2)", border: "1px solid rgba(74,124,89,0.4)", borderRadius: "2px", color: "#A8C5A0" }}>
                🌿 GREEN PASSPORT
              </span>
            )}
          </div>
          <p style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.35)", margin: 0, letterSpacing: "0.1em" }}>
            {lot.lot_id} · {lot.region.toUpperCase()} · {lot.grade}
          </p>
        </div>

        <div style={s.grid}>
          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Origin */}
            <div style={s.card}>
              <p style={s.cardTitle}>Origin & Processing</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  ["Region",    lot.region],
                  ["Altitude",  `${lot.altitude_m} masl`],
                  ["Processing",lot.processing],
                  ["Grade",     lot.grade],
                  ["Varietal",  lot.varietal || "Ethiopian Heirloom"],
                  ["Harvest",   lot.harvest_date],
                  ["Volume",    `${lot.volume_kg} kg`],
                  ["Price/kg",  lot.price_per_kg ? `$${lot.price_per_kg}` : "—"],
                ].map(([label, val]) => (
                  <div key={label} style={s.field}>
                    <p style={{ ...s.flabel, margin: 0 }}>{label}</p>
                    <p style={{ ...s.fval, margin: 0 }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality */}
            <div style={s.card}>
              <p style={s.cardTitle}>Quality Ledger</p>
              {lot.sca_score ? (
                <div style={s.sca}>
                  <p style={{ fontFamily: "monospace", fontSize: "0.55rem", letterSpacing: "0.15em", color: "rgba(245,237,216,0.4)", textTransform: "uppercase", margin: "0 0 0.5rem" }}>
                    SCA Cupping Score
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                    <span style={s.scaNum}>{lot.sca_score}</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "#C9952A" }}>/ 100</span>
                  </div>
                  <div style={s.track}><div style={s.fill(parseFloat(String(lot.sca_score)))} /></div>
                  <p style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "rgba(245,237,216,0.3)", margin: "0.25rem 0 0" }}>
                    {parseFloat(String(lot.sca_score)) >= 90 ? "Outstanding" :
                     parseFloat(String(lot.sca_score)) >= 85 ? "Excellent" :
                     parseFloat(String(lot.sca_score)) >= 80 ? "Specialty" : "Below Specialty"}
                  </p>
                </div>
              ) : (
                <p style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(245,237,216,0.25)" }}>
                  No cupping score recorded yet.
                </p>
              )}

              {lot.flavor_notes && (
                <>
                  <p style={{ ...s.flabel, margin: "0 0 0.25rem" }}>Flavor Notes</p>
                  <div style={s.flavors}>
                    {lot.flavor_notes.split(",").map(f => (
                      <span key={f} style={s.flavor}>{f.trim()}</span>
                    ))}
                  </div>
                </>
              )}

              {lot.q_grader_name && (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ ...s.flabel, margin: "0 0 0.25rem" }}>Q-Grader</p>
                  <p style={{ ...s.fvalMono, margin: 0 }}>
                    {lot.q_grader_name}
                    {lot.q_grader_cert_id && (
                      <span style={{ color: "rgba(245,237,216,0.35)" }}> · #{lot.q_grader_cert_id}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Cupping history */}
            <div style={s.card}>
              <CuppingHistory lotId={lot.id} />
              <div style={{ marginTop: '24px' }}>
                <SettlementWidget lotId={lot.id} lotRef={lot.lot_id} defaultUsd={lot.price_per_kg && lot.volume_kg ? parseFloat(String(lot.price_per_kg)) * parseFloat(String(lot.volume_kg)) : undefined} />
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Compliance */}
            <div style={s.card}>
              <p style={s.cardTitle}>Compliance Gate Check</p>
              <div style={s.gates}>
                {compliance ? Object.entries(compliance.gates).map(([key, pass]) => (
                  <div key={key} style={s.gate(pass)}>
                    <span style={s.gateLabel}>{gateLabels[key] || key}</span>
                    <span style={s.gateIcon(pass)}>{pass ? "✓ PASS" : "✗ FAIL"}</span>
                  </div>
                )) : (
                  <p style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(245,237,216,0.25)" }}>
                    Loading...
                  </p>
                )}
              </div>

              <button style={s.exportBtn(lot.export_ready)} disabled={!lot.export_ready}>
                {lot.export_ready ? "⬆ Proceed to Export" : "⛔ Export Locked"}
              </button>

              {compliance && compliance.failed_gates.length > 0 && (
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(193,68,14,0.1)", border: "1px solid rgba(193,68,14,0.2)", borderRadius: "2px" }}>
                  <p style={{ fontFamily: "monospace", fontSize: "0.58rem", color: "#C1440E", letterSpacing: "0.1em", margin: "0 0 0.5rem", textTransform: "uppercase" }}>
                    Failed Gates
                  </p>
                  {compliance.failed_gates.map(g => (
                    <p key={g} style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(193,68,14,0.8)", margin: "0.2rem 0" }}>
                      → {gateLabels[g] || g}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Green Passport */}
            <div style={s.card}>
              <p style={s.cardTitle}>Green Passport Status</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <ComplianceBadge label="GPS Verified"       pass={lot.gps_verified} />
                <ComplianceBadge label="Deforestation Free" pass={lot.deforestation_free} />
                <ComplianceBadge label="EUDR DDS Ready"     pass={lot.eudr_dds_ready} />
              </div>
              <div style={{ marginTop: "1rem", padding: "0.75rem", background: lot.green_passport_ready ? "rgba(74,124,89,0.1)" : "rgba(245,237,216,0.04)", border: `1px solid ${lot.green_passport_ready ? "rgba(74,124,89,0.3)" : "rgba(245,237,216,0.08)"}`, borderRadius: "2px", textAlign: "center" }}>
                <p style={{ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.12em", color: lot.green_passport_ready ? "#A8C5A0" : "rgba(245,237,216,0.25)", margin: 0, textTransform: "uppercase" }}>
                  {lot.green_passport_ready ? "🌿 Green Passport Issued" : "Passport Not Yet Issued"}
                </p>
              </div>
            </div>

            {/* Q-Grader actions */}
            {(user?.role === "qgrader" || user?.role === "admin") && (
              <div style={{ ...s.card, border: "1px solid rgba(212,130,74,0.2)" }}>
                <p style={{ ...s.cardTitle, color: "#D4824A" }}>Q-Grader Actions</p>
                <button style={s.cupBtn} onClick={() => navigate(`/lots/${lot.id}/cup`)}>
                  + Submit Cupping Score
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
