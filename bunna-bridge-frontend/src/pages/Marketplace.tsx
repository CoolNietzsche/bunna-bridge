import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import SampleRequestWidget from "../components/SampleRequestWidget";
import { Search, ShieldCheck, Leaf, Mountain, Package, X, FlaskConical } from "lucide-react";

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
    setFilters(f => v
      ? { ...f, [k]: v }
      : Object.fromEntries(Object.entries(f).filter(([key]) => key !== k))
    );

  const isBuyer = user?.role === "buyer" || user?.role === "admin";

  const sel = {
    background: "rgba(245,237,216,0.04)",
    border: "1px solid rgba(245,237,216,0.09)",
    borderRadius: "3px", padding: "7px 12px",
    color: "#F5EDD8",
    fontFamily: "Instrument Sans, sans-serif",
    fontSize: "0.8125rem", outline: "none",
    flex: "1 1 130px",
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.75rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 4px" }}>
          Specialty Lot Marketplace
        </h1>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: 0 }}>
          EUDR-Verified Ethiopian Coffee · Direct from Origin
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(245,237,216,0.04)",
          border: "1px solid rgba(245,237,216,0.09)",
          borderRadius: "3px", padding: "7px 12px",
          flex: "2 1 200px",
        }}>
          <Search size={13} color="rgba(245,237,216,0.25)" />
          <input
            style={{ background: "transparent", border: "none", outline: "none", color: "#F5EDD8", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8125rem", width: "100%" }}
            placeholder="Search origin, lot ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select style={sel} onChange={e => setFilter("region", e.target.value)}>
          <option value="">All Regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select style={sel} onChange={e => setFilter("grade", e.target.value)}>
          <option value="">All Grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={sel} onChange={e => setFilter("processing", e.target.value)}>
          <option value="">All Processing</option>
          {PROCESSING.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <select style={sel} onChange={e => setFilter("eudr_dds_ready", e.target.value)}>
          <option value="">All Lots</option>
          <option value="true">EUDR Ready Only</option>
        </select>
      </div>

      {/* Count */}
      {data && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.3)", marginBottom: "16px", letterSpacing: "0.06em" }}>
          {data.count} lot{data.count !== 1 ? "s" : ""} available
        </p>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "64px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
          Loading marketplace...
        </div>
      )}

      {data && data.results.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px" }}>
          <Package size={32} color="rgba(245,237,216,0.1)" style={{ marginBottom: "12px" }} />
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
            No lots available matching your filters.
          </p>
        </div>
      )}

      {/* Card grid */}
      {data && data.results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "14px" }}>
          {data.results.map(lot => (
            <div key={lot.id} style={{
              background: "#2C1810",
              border: "1px solid rgba(245,237,216,0.07)",
              borderRadius: "6px", padding: "20px",
              transition: "border-color 0.15s, transform 0.15s",
              display: "flex", flexDirection: "column",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(201,149,42,0.25)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(245,237,216,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Top */}
              <div style={{ marginBottom: "14px" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "#C9952A", textTransform: "uppercase", margin: "0 0 4px" }}>
                  {lot.lot_id}
                </p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.15rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 6px" }}>
                  {lot.name}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.35)" }}>
                    <Mountain size={10} /> {lot.altitude_m} masl
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.35)", textTransform: "capitalize" }}>
                    {lot.processing}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.35)", textTransform: "capitalize" }}>
                    {lot.region}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", letterSpacing: "0.08em" }}>SCA Score</span>
                  <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.6rem", fontWeight: 300, color: "#C9952A", lineHeight: 1 }}>
                    {lot.sca_score ?? "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", letterSpacing: "0.08em" }}>Volume</span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#F5EDD8" }}>{lot.volume_kg} kg</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", letterSpacing: "0.08em" }}>Price / kg</span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: "#C9952A" }}>
                    {lot.price_per_kg ? `$${lot.price_per_kg}` : "POA"}
                  </span>
                </div>
              </div>

              {/* Flavor notes */}
              {lot.flavor_notes && (
                <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: "rgba(245,237,216,0.35)", margin: "0 0 14px", lineHeight: 1.5, fontStyle: "italic" }}>
                  {lot.flavor_notes}
                </p>
              )}

              {/* Badges */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px", marginTop: "auto" }}>
                {lot.eudr_dds_ready && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "rgba(30,58,47,0.4)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#A8C5A0" }}>
                    <ShieldCheck size={9} /> EUDR
                  </span>
                )}
                {lot.green_passport_ready && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "rgba(74,124,89,0.15)", border: "1px solid rgba(74,124,89,0.25)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#A8C5A0" }}>
                    <Leaf size={9} /> Green Passport
                  </span>
                )}
                <span style={{ padding: "3px 8px", background: "rgba(245,237,216,0.04)", border: "1px solid rgba(245,237,216,0.08)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(245,237,216,0.4)", textTransform: "uppercase" }}>
                  {lot.grade}
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(245,237,216,0.06)", marginBottom: "14px" }} />

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => navigate(`/lots/${lot.id}`)}
                  style={{ flex: 1, background: "transparent", border: "1px solid rgba(245,237,216,0.1)", borderRadius: "3px", padding: "8px", color: "rgba(245,237,216,0.5)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,237,216,0.2)"; e.currentTarget.style.color = "rgba(245,237,216,0.8)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,237,216,0.1)"; e.currentTarget.style.color = "rgba(245,237,216,0.5)"; }}
                >
                  View Details
                </button>
                {isBuyer && (
                  <button
                    onClick={() => setExpandedSample(expandedSample === lot.id ? null : lot.id)}
                    style={{
                      flex: 1, borderRadius: "3px", padding: "8px", border: "none",
                      background: expandedSample === lot.id ? "rgba(193,68,14,0.15)" : "#C1440E",
                      color: expandedSample === lot.id ? "#C1440E" : "white",
                      fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    }}
                  >
                    {expandedSample === lot.id
                      ? <><X size={12} /> Cancel</>
                      : <><FlaskConical size={12} /> Request Sample</>
                    }
                  </button>
                )}
              </div>

              {/* Inline sample form */}
              {isBuyer && expandedSample === lot.id && (
                <div onClick={e => e.stopPropagation()} style={{ marginTop: "12px" }}>
                  <SampleRequestWidget lotId={lot.id} lotRef={lot.lot_id} onSuccess={() => setExpandedSample(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
