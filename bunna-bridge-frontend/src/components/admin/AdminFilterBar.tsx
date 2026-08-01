import { Search, X, SlidersHorizontal } from "lucide-react";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";
import { titleCase } from "../../lib/utils";
import type { LotFilters, OriginSummary } from "../../lib/catalog";
import { defaultFilters } from "../../lib/catalog";

interface AdminFilterBarProps {
  value: LotFilters;
  onChange: (next: LotFilters) => void;
  origins: OriginSummary[];
  count: number;
}

const PROCESSING = ["washed", "natural", "honey", "anaerobic"];
const GRADES = ["G1", "G2", "G3"];

export default function AdminFilterBar({ value, onChange, origins, count }: AdminFilterBarProps) {
  const set = (patch: Partial<LotFilters>) => onChange({ ...value, ...patch });
  const activeCount = ["origin", "process", "grade", "cert", "compliance"].filter((k) => (value as any)[k]).length + (value.minAltitude ? 1 : 0);

  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: "8px 12px", flex: "1 1 220px", minWidth: "180px" }}>
        <Search size={15} color={AT.color.textMuted} />
        <input
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search name, origin, lot ID…"
          style={{ background: "transparent", border: "none", outline: "none", color: AT.color.text, fontFamily: AT.font.sans, fontSize: "0.85rem", width: "100%" }}
        />
        {value.q && <X size={14} color={AT.color.textMuted} style={{ cursor: "pointer" }} onClick={() => set({ q: "" })} />}
      </div>

      <select style={{ ...AC.input, width: "auto", flex: "0 1 150px" }} value={value.origin} onChange={(e) => set({ origin: e.target.value })}>
        <option value="">All origins</option>
        {origins.map((o) => <option key={o.region} value={o.region}>{o.label}{o.count != null ? ` (${o.count})` : ""}</option>)}
      </select>
      <select style={{ ...AC.input, width: "auto", flex: "0 1 140px" }} value={value.process} onChange={(e) => set({ process: e.target.value })}>
        <option value="">All processes</option>
        {PROCESSING.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
      </select>
      <select style={{ ...AC.input, width: "auto", flex: "0 1 120px" }} value={value.grade} onChange={(e) => set({ grade: e.target.value })}>
        <option value="">All grades</option>
        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <select style={{ ...AC.input, width: "auto", flex: "0 1 160px" }} value={value.compliance} onChange={(e) => set({ compliance: e.target.value })}>
        <option value="">Any compliance</option>
        <option value="eudr">EUDR-ready</option>
        <option value="passport">Green Passport</option>
        <option value="export">Export-ready</option>
      </select>
      <select style={{ ...AC.input, width: "auto", flex: "0 1 160px" }} value={value.cert} onChange={(e) => set({ cert: e.target.value })}>
        <option value="">Any certification</option>
        <option value="organic">Organic</option>
        <option value="fairtrade">Fair Trade</option>
        <option value="rainforest">Rainforest Alliance</option>
      </select>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, whiteSpace: "nowrap" }}>{count} {count === 1 ? "lot" : "lots"}</span>
        <select style={{ ...AC.input, width: "auto" }} value={value.sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="score">Top score</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="recent">Most recent</option>
        </select>
        {activeCount > 0 && (
          <button onClick={() => onChange({ ...defaultFilters, q: value.q, sort: value.sort })} style={AC.btnSm}>
            <SlidersHorizontal size={13} /> Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
