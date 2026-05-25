import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import StatusPill from "../components/StatusPill";
import { Plus, Search, SlidersHorizontal, ShieldCheck, TrendingUp, Package, ChevronLeft, ChevronRight } from "lucide-react";

const REGIONS = ["","yirgacheffe","sidama","guji","jimma","harrar","limu","nekemte"];
const GRADES  = ["","G1","G2","G3"];
const STATUS  = ["","draft","listed","contracted","exported"];

export default function Lots() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isExporter = user?.role === "exporter" || user?.role === "admin";
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch]   = useState("");
  const params = { ...filters, ...(search ? { search } : {}) };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lots", params],
    queryFn:  () => getLots(params),
  });

  const setFilter = (key: string, val: string) =>
    setFilters(f => val
      ? { ...f, [key]: val }
      : Object.fromEntries(Object.entries(f).filter(([k]) => k !== key))
    );

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.75rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 4px" }}>
            Coffee Lots
          </h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: 0 }}>
            Digital Birth Certificate Registry
          </p>
        </div>
        {isExporter && (
          <button onClick={() => navigate("/lots/new")} style={{
            display: "flex", alignItems: "center", gap: "7px",
            background: "#C1440E", border: "none", borderRadius: "3px",
            padding: "9px 18px", color: "white",
            fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8125rem",
            fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            <Plus size={14} /> New Lot
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
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
            placeholder="Search lot ID, name, region..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select style={sel} onChange={e => setFilter("region", e.target.value)}>
          <option value="">All Regions</option>
          {REGIONS.filter(Boolean).map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select style={sel} onChange={e => setFilter("grade", e.target.value)}>
          <option value="">All Grades</option>
          {GRADES.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={sel} onChange={e => setFilter("status", e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select style={sel} onChange={e => setFilter("eudr_dds_ready", e.target.value)}>
          <option value="">EUDR — All</option>
          <option value="true">EUDR Ready</option>
          <option value="false">Not Ready</option>
        </select>
      </div>

      {/* Count */}
      {data && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <SlidersHorizontal size={12} color="rgba(245,237,216,0.25)" />
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.3)", letterSpacing: "0.08em" }}>
            {data.count} lot{data.count !== 1 ? "s" : ""} found
          </span>
        </div>
      )}

      {/* States */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "64px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
          Loading lots...
        </div>
      )}
      {isError && (
        <div style={{ textAlign: "center", padding: "64px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "#C1440E" }}>
          Failed to load lots. Check API connection.
        </div>
      )}
      {data && data.results.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px" }}>
          <Package size={32} color="rgba(245,237,216,0.1)" style={{ marginBottom: "12px" }} />
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
            No lots found.
          </p>
          {isExporter && (
            <button onClick={() => navigate("/lots/new")} style={{
              marginTop: "12px", background: "none", border: "none",
              fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
              color: "#D4824A", cursor: "pointer", letterSpacing: "0.08em",
            }}>
              Register your first lot →
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {data && data.results.length > 0 && (
        <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(245,237,216,0.07)" }}>
                  {["Lot ID","Name","Region","Grade","SCA","Volume","Status","EUDR","Export"].map(h => (
                    <th key={h} style={{
                      fontFamily: "DM Mono, monospace", fontSize: "0.55rem",
                      letterSpacing: "0.15em", textTransform: "uppercase",
                      color: "rgba(245,237,216,0.3)", padding: "12px 16px",
                      textAlign: "left", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((lot, i) => (
                  <tr key={lot.id}
                    onClick={() => navigate(`/lots/${lot.id}`)}
                    style={{
                      borderBottom: i < data.results.length - 1 ? "1px solid rgba(245,237,216,0.04)" : "none",
                      cursor: "pointer", transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,237,216,0.025)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "13px 16px", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#C9952A", whiteSpace: "nowrap" }}>
                      {lot.lot_id}
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: "#F5EDD8", whiteSpace: "nowrap" }}>
                      {lot.name}
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "rgba(245,237,216,0.5)", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                      {lot.region}
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "rgba(245,237,216,0.5)", whiteSpace: "nowrap" }}>
                      {lot.grade}
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: lot.sca_score && lot.sca_score >= 85 ? "#C9952A" : "rgba(245,237,216,0.6)", whiteSpace: "nowrap" }}>
                      {lot.sca_score ? `${lot.sca_score}` : "—"}
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "rgba(245,237,216,0.5)", whiteSpace: "nowrap" }}>
                      {lot.volume_kg} kg
                    </td>
                    <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                      <StatusPill status={lot.status} />
                    </td>
                    <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                      {lot.eudr_dds_ready
                        ? <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#A8C5A0" }}><ShieldCheck size={11} /> Ready</span>
                        : <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.2)" }}>—</span>
                      }
                    </td>
                    <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                      {lot.export_ready
                        ? <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#4A7C59" }}><TrendingUp size={11} /> Ready</span>
                        : <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.2)" }}>—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data.next || data.previous) && (
            <div style={{
              padding: "12px 16px", borderTop: "1px solid rgba(245,237,216,0.06)",
              display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center",
            }}>
              {data.previous && (
                <button onClick={() => setFilter("page", String((parseInt(filters.page || "1") - 1)))}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(245,237,216,0.1)", borderRadius: "3px", padding: "7px 14px", color: "rgba(245,237,216,0.5)", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", cursor: "pointer" }}>
                  <ChevronLeft size={12} /> Previous
                </button>
              )}
              {data.next && (
                <button onClick={() => setFilter("page", String((parseInt(filters.page || "1") + 1)))}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "#C1440E", border: "none", borderRadius: "3px", padding: "7px 14px", color: "white", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", cursor: "pointer" }}>
                  Next <ChevronRight size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
