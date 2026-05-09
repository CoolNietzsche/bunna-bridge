import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import StatusPill from "../components/StatusPill";
import ComplianceBadge from "../components/ComplianceBadge";

const REGIONS = ["", "yirgacheffe", "sidama", "guji", "jimma", "harrar", "limu", "nekemte"];
const GRADES  = ["", "G1", "G2", "G3"];
const STATUS  = ["", "draft", "listed", "contracted", "exported"];

export default function Lots() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch]   = useState("");

  const params = { ...filters, ...(search ? { search } : {}) };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lots", params],
    queryFn:  () => getLots(params),
  });

  const setFilter = (key: string, val: string) =>
    setFilters(f => val ? { ...f, [key]: val } : Object.fromEntries(Object.entries(f).filter(([k]) => k !== key)));

  const s = {
    page:    { padding: "2rem 2.5rem" },
    hdr:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
    title:   { fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: 0 },
    sub:     { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#D4824A", textTransform: "uppercase" as const, marginTop: "0.25rem" },
    newbtn:  { background: "#C1440E", border: "none", borderRadius: "2px", padding: "0.7rem 1.4rem", color: "white", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, cursor: "pointer" },
    filters: { display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" as const },
    input:   { background: "rgba(245,237,216,0.06)", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.5rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.7rem", outline: "none" },
    select:  { background: "#2C1810", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.5rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.7rem", outline: "none" },
    table:   { width: "100%", borderCollapse: "collapse" as const },
    th:      { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)", padding: "0.75rem 1rem", borderBottom: "1px solid rgba(245,237,216,0.08)", textAlign: "left" as const },
    tr:      { borderBottom: "1px solid rgba(245,237,216,0.05)", cursor: "pointer", transition: "background 0.15s" },
    td:      { padding: "1rem", fontSize: "0.85rem", color: "#F5EDD8" },
    tdMono:  { padding: "1rem", fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(245,237,216,0.6)" },
    empty:   { textAlign: "center" as const, padding: "4rem", fontFamily: "monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.3)", letterSpacing: "0.1em" },
    count:   { fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.3)", marginBottom: "1rem" },
  };

  return (
    <PageWrapper>
      <div style={s.page}>
        <div style={s.hdr}>
          <div>
            <h1 style={s.title}>Coffee Lots</h1>
            <p style={s.sub}>Digital Birth Certificate Registry</p>
          </div>
          <button style={s.newbtn} onClick={() => navigate("/lots/new")}>
            + New Lot
          </button>
        </div>

        {/* Filters */}
        <div style={s.filters}>
          <input style={{ ...s.input, width: "220px" }} placeholder="Search lot ID, name, region..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select style={s.select} onChange={e => setFilter("region", e.target.value)}>
            <option value="">All Regions</option>
            {REGIONS.filter(Boolean).map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <select style={s.select} onChange={e => setFilter("grade", e.target.value)}>
            <option value="">All Grades</option>
            {GRADES.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select style={s.select} onChange={e => setFilter("status", e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS.filter(Boolean).map(s2 => <option key={s2} value={s2}>{s2}</option>)}
          </select>
          <select style={s.select} onChange={e => setFilter("eudr_dds_ready", e.target.value)}>
            <option value="">EUDR — All</option>
            <option value="true">EUDR Ready</option>
            <option value="false">Not Ready</option>
          </select>
        </div>

        {/* Count */}
        {data && <p style={s.count}>{data.count} lot{data.count !== 1 ? "s" : ""} found</p>}

        {/* Table */}
        {isLoading && <p style={s.empty}>Loading lots...</p>}
        {isError   && <p style={{ ...s.empty, color: "#C1440E" }}>Failed to load lots. Check API connection.</p>}
        {data && data.results.length === 0 && <p style={s.empty}>No lots found. Create your first lot.</p>}

        {data && data.results.length > 0 && (
          <div style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", overflow: "hidden" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Lot ID", "Name", "Region", "Grade", "SCA Score", "Volume", "Status", "EUDR", "Export Ready"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map(lot => (
                  <tr key={lot.id} style={s.tr}
                    onClick={() => navigate(`/lots/${lot.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,237,216,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={s.tdMono}>{lot.lot_id}</td>
                    <td style={s.td}>{lot.name}</td>
                    <td style={s.tdMono}>{lot.region}</td>
                    <td style={s.tdMono}>{lot.grade}</td>
                    <td style={{ ...s.tdMono, color: lot.sca_score && lot.sca_score >= 85 ? "#C9952A" : "#F5EDD8" }}>
                      {lot.sca_score ? `${lot.sca_score} pts` : "—"}
                    </td>
                    <td style={s.tdMono}>{lot.volume_kg} kg</td>
                    <td style={s.td}><StatusPill status={lot.status} /></td>
                    <td style={s.td}>
                      <ComplianceBadge label="EUDR" pass={lot.eudr_dds_ready} />
                    </td>
                    <td style={s.td}>
                      <ComplianceBadge label="Export" pass={lot.export_ready} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {(data.next || data.previous) && (
              <div style={{ padding: "1rem", borderTop: "1px solid rgba(245,237,216,0.06)", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                {data.previous && (
                  <button style={{ ...s.newbtn, background: "transparent", border: "1px solid rgba(245,237,216,0.15)", color: "#F5EDD8" }}
                    onClick={() => setFilter("page", String((parseInt(filters.page || "1") - 1)))}>
                    ← Previous
                  </button>
                )}
                {data.next && (
                  <button style={s.newbtn}
                    onClick={() => setFilter("page", String((parseInt(filters.page || "1") + 1)))}>
                    Next →
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
