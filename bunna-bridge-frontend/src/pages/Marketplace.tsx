import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../hooks/useWatchlist";
import PageWrapper from "../components/PageWrapper";
import {
  Search, ShieldCheck, Leaf, Mountain, Package,
  FlaskConical, TrendingUp, Award, Filter, X, Heart
} from "lucide-react";

const REGIONS    = ["yirgacheffe","sidama","guji","jimma","harrar","limu","nekemte"];
const GRADES     = ["G1","G2","G3"];
const PROCESSING = ["washed","natural","honey","anaerobic"];

const PROCESS_COLOR: Record<string, string> = {
  washed:    "#1B4D35",
  natural:   "#7B4B2A",
  honey:     "#B8860B",
  anaerobic: "#5B4B8A",
  other:     "#4A4A45",
};

function ScaBadge({ score }: { score: number | null }) {
  if (!score) return null;
  const color = score >= 85 ? "#7B4B2A" : score >= 80 ? "#1B4D35" : "rgba(28,28,26,0.4)";
  const bg    = score >= 85 ? "#F5EDE4"  : score >= 80 ? "#E8F2EC"  : "#F0EDE6";
  const label = score >= 90 ? "OUTSTANDING" : score >= 85 ? "EXCELLENT" : score >= 80 ? "VERY GOOD" : "GOOD";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", background: bg, borderRadius: "4px", padding: "6px 10px" }}>
      <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.9rem", fontWeight: 300, color, lineHeight: 1 }}>
        {score.toFixed(1)}
      </span>
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.48rem", letterSpacing: "0.12em", color, opacity: 0.8 }}>
        {label}
      </span>
    </div>
  );
}

function FlavorTag({ tag }: { tag: string }) {
  return (
    <span style={{
      padding: "2px 8px",
      background: "#F0EDE6",
      border: "1px solid rgba(28,28,26,0.1)",
      borderRadius: "20px",
      fontFamily: "Instrument Sans, sans-serif",
      fontSize: "0.62rem",
      color: "#4A4A45",
      whiteSpace: "nowrap",
    }}>
      {tag}
    </span>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<Record<string, string>>({ status: "listed" });
  const [search, setSearch]   = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
  const { toggle, isWatched } = useWatchlist();

  const sel = {
    background: "#FFFFFF",
    border: "1px solid rgba(28,28,26,0.12)",
    borderRadius: "4px", padding: "8px 12px",
    color: "#1C1C1A",
    fontFamily: "Instrument Sans, sans-serif",
    fontSize: "0.8125rem", outline: "none",
    flex: "1 1 140px",
  };

  const activeFilterCount = Object.keys(filters).filter(k => k !== "status").length;

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.9rem", fontWeight: 400, color: "#1C1C1A", margin: "0 0 4px" }}>
            Specialty Lot Marketplace
          </h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.35)", margin: 0 }}>
            EUDR-Verified Ethiopian Coffee · Direct from Origin
          </p>
        </div>
        {data && (
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "rgba(28,28,26,0.35)", paddingTop: "6px" }}>
            {data.count} lot{data.count !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "#FFFFFF",
          border: "1px solid rgba(28,28,26,0.12)",
          borderRadius: "4px", padding: "8px 12px",
          flex: "2 1 220px",
        }}>
          <Search size={13} color="rgba(28,28,26,0.3)" />
          <input
            style={{ background: "transparent", border: "none", outline: "none", color: "#1C1C1A", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8125rem", width: "100%" }}
            placeholder="Search lot name, origin, lot ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <X size={12} color="rgba(28,28,26,0.3)" style={{ cursor: "pointer" }} onClick={() => setSearch("")} />}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: showFilters ? "#E8F2EC" : "#FFFFFF",
            border: showFilters ? "1px solid rgba(27,77,53,0.3)" : "1px solid rgba(28,28,26,0.12)",
            borderRadius: "4px", padding: "8px 14px",
            color: showFilters ? "#1B4D35" : "rgba(28,28,26,0.55)",
            fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8125rem",
            cursor: "pointer",
          }}
        >
          <Filter size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span style={{ background: "#1B4D35", color: "white", borderRadius: "10px", padding: "1px 6px", fontSize: "0.6rem", fontFamily: "DM Mono, monospace" }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div style={{
          display: "flex", gap: "8px", flexWrap: "wrap",
          marginBottom: "16px", padding: "14px",
          background: "#FFFFFF",
          border: "1px solid rgba(28,28,26,0.08)",
          borderRadius: "6px",
          boxShadow: "0 1px 3px rgba(28,28,26,0.06)",
        }}>
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
          <select style={sel} onChange={e => setFilter("lot_type", e.target.value)}>
            <option value="">Spot + Forward</option>
            <option value="spot">Spot Only</option>
            <option value="forward">Forward Only</option>
            <option value="reserve">Reserve</option>
          </select>
          <select style={sel} onChange={e => setFilter("eudr_dds_ready", e.target.value)}>
            <option value="">All Compliance</option>
            <option value="true">EUDR Ready Only</option>
          </select>
          <select style={sel} onChange={e => setFilter("is_organic", e.target.value)}>
            <option value="">All Certifications</option>
            <option value="true">Organic Only</option>
          </select>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "64px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(28,28,26,0.3)" }}>
          Loading marketplace...
        </div>
      )}

      {data && data.results.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px" }}>
          <Package size={32} color="rgba(28,28,26,0.12)" style={{ marginBottom: "12px" }} />
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(28,28,26,0.3)" }}>
            No lots available matching your filters.
          </p>
        </div>
      )}

      {/* Card grid */}
      {data && data.results.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "16px" }}>
          {data.results.map(lot => (
            <div
              key={lot.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(28,28,26,0.08)",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(28,28,26,0.06)",
                display: "flex", flexDirection: "column",
                transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(27,77,53,0.25)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(28,28,26,0.1)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(28,28,26,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(28,28,26,0.06)";
              }}
              onClick={() => navigate(`/marketplace/${lot.id}`)}
            >
              {/* Card header strip */}
              <div style={{
                padding: "16px 18px 14px",
                borderBottom: "1px solid rgba(28,28,26,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.15em", color: "#7B4B2A", textTransform: "uppercase", margin: "0 0 3px" }}>
                      {lot.lot_id}
                    </p>
                    <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.15rem", fontWeight: 400, color: "#1C1C1A", margin: 0, lineHeight: 1.2 }}>
                      {lot.name}
                    </p>
                  </div>
                  <ScaBadge score={lot.latest_sca_score ?? (lot.sca_score ? parseFloat(lot.sca_score as unknown as string) : null)} />
                </div>

                {/* Origin meta */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "6px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.4)", textTransform: "capitalize" }}>
                    <Mountain size={9} /> {lot.region} · {lot.altitude_m}m
                  </span>
                  <span style={{
                    fontFamily: "DM Mono, monospace", fontSize: "0.55rem",
                    color: PROCESS_COLOR[lot.processing] || "#4A4A45",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>
                    {lot.processing}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(28,28,26,0.35)" }}>
                    {lot.grade}
                  </span>
                  {lot.lot_type === "forward" && (
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#7B4B2A", letterSpacing: "0.08em" }}>
                      FORWARD
                    </span>
                  )}
                </div>
              </div>

              {/* Flavor tags */}
              {lot.flavor_tags && lot.flavor_tags.length > 0 && (
                <div style={{ padding: "10px 18px", display: "flex", gap: "5px", flexWrap: "wrap", borderBottom: "1px solid rgba(28,28,26,0.06)" }}>
                  {lot.flavor_tags.slice(0, 4).map(tag => <FlavorTag key={tag} tag={tag} />)}
                </div>
              )}

              {/* Tasting notes */}
              {lot.tasting_notes && (
                <div style={{ padding: "10px 18px 0", borderBottom: "1px solid rgba(28,28,26,0.06)" }}>
                  <p style={{
                    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.73rem",
                    color: "rgba(28,28,26,0.5)", lineHeight: 1.55,
                    margin: "0 0 10px", fontStyle: "italic",
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {lot.tasting_notes}
                  </p>
                </div>
              )}

              {/* Pricing + availability */}
              <div style={{ padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(28,28,26,0.06)" }}>
                <div>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.35)", margin: "0 0 2px", letterSpacing: "0.08em" }}>
                    FOB PRICE / KG
                  </p>
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontWeight: 300, color: "#7B4B2A", margin: 0, lineHeight: 1 }}>
                    {lot.fob_price_usd ? `$${parseFloat(lot.fob_price_usd).toFixed(2)}` : "Price on Request"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.35)", margin: "0 0 2px", letterSpacing: "0.08em" }}>
                    AVAILABLE
                  </p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.78rem", color: "#1C1C1A", margin: 0 }}>
                    {lot.available_qty_kg ? `${parseFloat(lot.available_qty_kg).toLocaleString()} kg` : `${lot.volume_kg} kg`}
                  </p>
                  {lot.delivery_window && (
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.35)", margin: "2px 0 0" }}>
                      {lot.delivery_window}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges + exporter */}
              <div style={{ padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                  {lot.is_eudr_ready && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", padding: "3px 7px", background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.2)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#1B4D35" }}>
                      <ShieldCheck size={8} /> EUDR
                    </span>
                  )}
                  {lot.green_passport_ready && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", padding: "3px 7px", background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.2)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#1B4D35" }}>
                      <Leaf size={8} /> Passport
                    </span>
                  )}
                  {lot.is_organic && (
                    <span style={{ padding: "3px 7px", background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.2)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#1B4D35" }}>
                      Organic
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "3px", padding: "3px 7px", background: "#F0EDE6", border: "1px solid rgba(28,28,26,0.08)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#4A4A45" }}>
                    <Award size={8} /> {lot.compliance_score ?? 0}/7 Gates
                  </span>
                </div>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.3)", maxWidth: "80px", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span
                    onClick={e => { e.stopPropagation(); if(lot.exporter) navigate(`/exporters/${lot.exporter}`); }}
                    style={{ cursor: lot.exporter ? "pointer" : "default" }}
                  >{lot.exporter_company || lot.exporter_name}</span>
                </span>
              </div>

              {/* CTA buttons */}
              <div style={{ padding: "0 18px 16px", display: "flex", gap: "8px" }} onClick={e => e.stopPropagation()}>
                {isBuyer && (
                  <button
                    onClick={() => toggle(lot.id)}
                    title={isWatched(lot.id) ? "Remove from watchlist" : "Add to watchlist"}
                    style={{ background: "transparent", border: `1px solid ${isWatched(lot.id) ? "rgba(192,57,43,0.4)" : "rgba(28,28,26,0.1)"}`, borderRadius: "4px", padding: "9px 10px", color: isWatched(lot.id) ? "#C0392B" : "rgba(28,28,26,0.25)", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <Heart size={13} fill={isWatched(lot.id) ? "#C0392B" : "none"} />
                  </button>
                )}
                <button
                  onClick={() => navigate(`/marketplace/${lot.id}`)}
                  style={{ flex: 1, background: "transparent", border: "1px solid rgba(28,28,26,0.12)", borderRadius: "4px", padding: "9px", color: "rgba(28,28,26,0.6)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(28,28,26,0.25)"; e.currentTarget.style.color = "#1C1C1A"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(28,28,26,0.12)"; e.currentTarget.style.color = "rgba(28,28,26,0.6)"; }}
                >
                  View Lot
                </button>
                {isBuyer && (
                  <button
                    onClick={() => navigate(`/marketplace/${lot.id}?offer=1`)}
                    style={{ flex: 1, background: "#1B4D35", border: "none", borderRadius: "4px", padding: "9px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "background 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#163D2A"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#1B4D35"; }}
                  >
                    <TrendingUp size={13} /> Make Offer
                  </button>
                )}
                {isBuyer && (
                  <button
                    onClick={() => navigate(`/marketplace/${lot.id}?sample=1`)}
                    style={{ background: "transparent", border: "1px solid rgba(27,77,53,0.3)", borderRadius: "4px", padding: "9px 12px", color: "#1B4D35", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.12s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#E8F2EC"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <FlaskConical size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
