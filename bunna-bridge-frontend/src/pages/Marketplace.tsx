import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import ComplianceBadge from "../components/ComplianceBadge";
import SampleRequestWidget from "../components/SampleRequestWidget";

const REGIONS    = ["yirgacheffe","sidama","guji","jimma","harrar","limu","nekemte"];
const GRADES     = ["G1","G2","G3"];
const PROCESSING = ["washed","natural","honey"];

export default function Marketplace() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [filters, setFilters] = useState<Record<string, string>>({ status: "listed" });
  const [search,  setSearch]  = useState("");
  const [expandedSample, setExpandedSample] = useState<string | null>(null);

  const params = { ...filters, ...(search ? { search } : {}) };
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", params],
    queryFn:  () => getLots(params),
  });

  const setFilter = (k: string, v: string) =>
    setFilters(f =>
      v ? { ...f, [k]: v }
        : Object.fromEntries(Object.entries(f).filter(([key]) => key !== k))
    );

  const isBuyer = user?.role === "buyer" || user?.role === "admin";

  const s = {
    page:    { padding: "2rem 2.5rem" },
    hdr:     { marginBottom: "2rem" },
    title:   { fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: "0 0 0.25rem" },
    sub:     { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#D4824A", textTransform: "uppercase" as const },
    filters: { display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" as const },
    input:   { background: "rgba(245,237,216,0.06)", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.5rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.7rem", outline: "none" },
    select:  { background: "#2C1810", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.5rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.7rem", outline: "none" },
    grid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "1.2rem" },
    card:    { background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", padding: "1.5rem", transition: "border-color 0.2s, transform 0.15s" },
    lotId:   { fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "#C9952A", textTransform: "uppercase" as const, marginBottom: "0.4rem" },
    name:    { fontSize: "1.1rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 0.25rem" },
    region:  { fontFamily: "monospace", fontSize: "0.62rem", color: "rgba(245,237,216,0.4)", marginBottom: "1rem" },
    row:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" },
    rlabel:  { fontFamily: "monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", letterSpacing: "0.08em" },
    rval:    { fontFamily: "monospace", fontSize: "0.72rem", color: "#F5EDD8" },
    sca:     { fontFamily: "serif", fontSize: "1.8rem", fontWeight: 300, color: "#C9952A" },
    divider: { height: "1px", background: "rgba(245,237,216,0.06)", margin: "1rem 0" },
    badges:  { display: "flex", gap: "0.4rem", flexWrap: "wrap" as const },
    empty:   { textAlign: "center" as const, padding: "4rem", fontFamily: "monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.3)" },
    count:   { fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.3)", marginBottom: "1rem" },
    viewBtn: { flex: 1, background: "transparent", border: "1px solid rgba(245,237,216,0.1)", borderRadius: "2px", padding: "0.55rem 0", color: "rgba(245,237,216,0.5)", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" },
    sampleBtn: (active: boolean) => ({
      flex: 1, background: active ? "rgba(193,68,14,0.15)" : "#C1440E",
      border: active ? "1px solid rgba(193,68,14,0.4)" : "none",
      borderRadius: "2px", padding: "0.55rem 0",
      color: active ? "#C1440E" : "white",
      fontFamily: "monospace", fontSize: "0.62rem",
      letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer",
    }),
  };

  return (
    <PageWrapper>
      <div style={s.page}>
        <div style={s.hdr}>
          <h1 style={s.title}>Specialty Lot Marketplace</h1>
          <p style={s.sub}>EUDR-Verified Ethiopian Coffee · Direct from Origin</p>
        </div>

        <div style={s.filters}>
          <input style={{ ...s.input, width: "220px" }}
            placeholder="Search origin, lot ID..."
            value={search}
            onChange={e => setSearch(e.target.value)} />
          <select style={s.select} onChange={e => setFilter("region", e.target.value)}>
            <option value="">All Regions</option>
            {REGIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <select style={s.select} onChange={e => setFilter("grade", e.target.value)}>
            <option value="">All Grades</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select style={s.select} onChange={e => setFilter("processing", e.target.value)}>
            <option value="">All Processing</option>
            {PROCESSING.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <select style={s.select} onChange={e => setFilter("eudr_dds_ready", e.target.value)}>
            <option value="">All Lots</option>
            <option value="true">EUDR Ready Only</option>
          </select>
        </div>

        {data && <p style={s.count}>{data.count} lot{data.count !== 1 ? "s" : ""} available</p>}
        {isLoading && <p style={s.empty}>Loading marketplace...</p>}
        {data && data.results.length === 0 && (
          <p style={s.empty}>No lots available matching your filters.</p>
        )}

        {data && data.results.length > 0 && (
          <div style={s.grid}>
            {data.results.map(lot => (
              <div key={lot.id} style={s.card}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(201,149,42,0.25)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(245,237,216,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}>

                <p style={{ ...s.lotId, margin: "0 0 0.4rem" }}>{lot.lot_id}</p>
                <p style={{ ...s.name, margin: "0 0 0.25rem" }}>{lot.name}</p>
                <p style={{ ...s.region, margin: "0 0 1rem" }}>
                  {lot.region.charAt(0).toUpperCase() + lot.region.slice(1)} ·{" "}
                  {lot.altitude_m} masl · {lot.processing}
                </p>

                <div style={s.row}>
                  <span style={s.rlabel}>SCA Score</span>
                  <span style={s.sca}>{lot.sca_score ?? "—"}</span>
                </div>
                <div style={s.row}>
                  <span style={s.rlabel}>Volume</span>
                  <span style={s.rval}>{lot.volume_kg} kg</span>
                </div>
                <div style={s.row}>
                  <span style={s.rlabel}>Price / kg</span>
                  <span style={{ ...s.rval, color: "#C9952A" }}>
                    {lot.price_per_kg ? `$${lot.price_per_kg}` : "POA"}
                  </span>
                </div>

                {lot.flavor_notes && (
                  <p style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.35)", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
                    {lot.flavor_notes}
                  </p>
                )}

                <div style={s.divider} />

                <div style={s.badges}>
                  <ComplianceBadge label="EUDR" pass={lot.eudr_dds_ready} />
                  {lot.green_passport_ready && (
                    <span style={{ fontFamily: "monospace", fontSize: "0.55rem", padding: "0.2rem 0.5rem", background: "rgba(74,124,89,0.2)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "2px", color: "#A8C5A0" }}>
                      🌿 Green Passport
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button style={s.viewBtn}
                    onClick={() => navigate(`/lots/${lot.id}`)}>
                    View Details
                  </button>
                  {isBuyer && (
                    <button
                      style={s.sampleBtn(expandedSample === lot.id)}
                      onClick={() => setExpandedSample(
                        expandedSample === lot.id ? null : lot.id
                      )}>
                      {expandedSample === lot.id ? "✕ Cancel" : "Request Sample"}
                    </button>
                  )}
                </div>

                {/* Inline sample request form */}
                {isBuyer && expandedSample === lot.id && (
                  <div onClick={e => e.stopPropagation()}>
                    <SampleRequestWidget
                      lotId={lot.id}
                      lotRef={lot.lot_id}
                      onSuccess={() => setExpandedSample(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
