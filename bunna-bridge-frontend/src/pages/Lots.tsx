import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import AdminShell from "../components/admin/AdminShell";
import { LotStatusBadge } from "../components/admin/AdminStatusBadge";
import { Plus, Search, SlidersHorizontal, ShieldCheck, TrendingUp, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const REGIONS = ["", "yirgacheffe", "sidama", "guji", "jimma", "harrar", "limu", "nekemte"];
const GRADES = ["", "G1", "G2", "G3"];
const STATUS = ["", "draft", "listed", "contracted", "exported"];

export default function Lots() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isExporter = user?.role === "exporter" || user?.role === "admin";
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const params = { ...filters, ...(search ? { search } : {}) };
  const { data, isLoading, isError } = useQuery({ queryKey: ["lots", params], queryFn: () => getLots(params) });

  const setFilter = (key: string, val: string) =>
    setFilters((f) => (val ? { ...f, [key]: val } : Object.fromEntries(Object.entries(f).filter(([k]) => k !== key))));

  return (
    <AdminShell>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>Registry</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Coffee Lots</h1>
        </div>
        {isExporter && (
          <button onClick={() => navigate("/lots/new")} style={AC.btnPrimary}>
            <Plus size={15} /> New Lot
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: AT.color.surface, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: "8px 12px", flex: "2 1 220px" }}>
          <Search size={14} color={AT.color.textMuted} />
          <input
            style={{ background: "transparent", border: "none", outline: "none", fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, width: "100%" }}
            placeholder="Search lot ID, name, region…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select style={{ ...AC.input, flex: "1 1 130px" }} onChange={(e) => setFilter("region", e.target.value)}>
          <option value="">All Regions</option>
          {REGIONS.filter(Boolean).map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select style={{ ...AC.input, flex: "1 1 130px" }} onChange={(e) => setFilter("grade", e.target.value)}>
          <option value="">All Grades</option>
          {GRADES.filter(Boolean).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select style={{ ...AC.input, flex: "1 1 130px" }} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS.filter(Boolean).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select style={{ ...AC.input, flex: "1 1 130px" }} onChange={(e) => setFilter("eudr_dds_ready", e.target.value)}>
          <option value="">EUDR — All</option>
          <option value="true">EUDR Ready</option>
          <option value="false">Not Ready</option>
        </select>
      </div>

      {/* Count */}
      {data && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <SlidersHorizontal size={13} color={AT.color.textDisabled} />
          <span style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted }}>
            {data.count} lot{data.count !== 1 ? "s" : ""} found
          </span>
        </div>
      )}

      {isLoading && <div style={{ textAlign: "center", padding: "64px 0", fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading lots…</div>}
      {isError && <div style={{ textAlign: "center", padding: "64px 0", fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.red }}>Failed to load lots. Check API connection.</div>}
      {data && data.results.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <Package size={32} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, margin: 0 }}>No lots found.</p>
          {isExporter && (
            <button onClick={() => navigate("/lots/new")} style={{ marginTop: "10px", background: "none", border: "none", cursor: "pointer", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.primaryDark, fontWeight: 600 }}>
              Register your first lot →
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {data && data.results.length > 0 && (
        <div style={AC.card}>
          <div style={{ overflowX: "auto" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  {["Lot ID", "Name", "Region", "Grade", "SCA", "Volume", "Status", "EUDR", "Export"].map((h) => (
                    <th key={h} style={AC.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((lot) => (
                  <tr
                    key={lot.id}
                    onClick={() => navigate(`/lots/${lot.id}`)}
                    style={AC.trHover}
                    onMouseEnter={(e) => (e.currentTarget.style.background = AT.color.surfaceSecondary)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...AC.td, fontFamily: AT.font.mono, fontSize: "0.75rem", color: AT.color.textSecondary, whiteSpace: "nowrap" }}>{lot.lot_id}</td>
                    <td style={{ ...AC.td, fontWeight: 500, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.name}</td>
                    <td style={{ ...AC.td, textTransform: "capitalize", color: AT.color.textSecondary, whiteSpace: "nowrap" }}>{lot.region}</td>
                    <td style={{ ...AC.td, color: AT.color.textSecondary, whiteSpace: "nowrap" }}>{lot.grade}</td>
                    <td style={{ ...AC.td, fontWeight: 600, whiteSpace: "nowrap", color: lot.sca_score && Number(lot.sca_score) >= 85 ? AT.color.primaryDark : AT.color.text }}>
                      {lot.sca_score ? `${lot.sca_score}` : "—"}
                    </td>
                    <td style={{ ...AC.td, color: AT.color.textSecondary, whiteSpace: "nowrap" }}>{lot.volume_kg} kg</td>
                    <td style={{ ...AC.td, whiteSpace: "nowrap" }}><LotStatusBadge status={lot.status} /></td>
                    <td style={{ ...AC.td, whiteSpace: "nowrap" }}>
                      {lot.eudr_dds_ready
                        ? <span style={{ ...AC.status.base, ...AC.status.green }}><ShieldCheck size={12} /> Ready</span>
                        : <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textDisabled }}>—</span>}
                    </td>
                    <td style={{ ...AC.td, whiteSpace: "nowrap" }}>
                      {lot.export_ready
                        ? <span style={{ ...AC.status.base, ...AC.status.blue }}><TrendingUp size={12} /> Ready</span>
                        : <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textDisabled }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(data.next || data.previous) && (
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${AT.color.borderLight}`, display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              {data.previous && (
                <button onClick={() => setFilter("page", String(parseInt(filters.page || "1") - 1))} style={AC.btnSm}>
                  <ChevronLeft size={13} /> Previous
                </button>
              )}
              {data.next && (
                <button onClick={() => setFilter("page", String(parseInt(filters.page || "1") + 1))} style={{ ...AC.btnSm, background: AT.color.primary, borderColor: AT.color.primaryDark, color: "#fff" }}>
                  Next <ChevronRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
