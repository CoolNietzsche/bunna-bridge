import { Search, X, SlidersHorizontal } from "lucide-react";
import { T } from "../../styles/tokens";
import { titleCase } from "../../lib/utils";
import type { LotFilters, OriginSummary } from "../../lib/catalog";
import { defaultFilters } from "../../lib/catalog";

interface FilterBarProps {
  value: LotFilters;
  onChange: (next: LotFilters) => void;
  origins: OriginSummary[];
  count: number;
}

const PROCESSING = ["washed", "natural", "honey", "anaerobic"];
const GRADES = ["G1", "G2", "G3"];

export default function FilterBar({ value, onChange, origins, count }: FilterBarProps) {
  const set = (patch: Partial<LotFilters>) => onChange({ ...value, ...patch });
  const activeCount = ["origin", "process", "grade", "cert", "compliance"].filter((k) => (value as any)[k]).length + (value.minAltitude ? 1 : 0);

  const selectStyle: React.CSSProperties = {
    appearance: "none", background: T.color.surface, border: `1px solid ${T.color.border}`,
    borderRadius: "999px", padding: "9px 16px", fontFamily: T.font.sans, fontSize: "0.85rem",
    color: T.color.ink, cursor: "pointer", outline: "none",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: "999px", padding: "9px 16px", flex: "1 1 240px", minWidth: "200px" }}>
        <Search size={15} color={T.color.textGhost} />
        <input
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search name, origin, lot ID, notes…"
          style={{ background: "transparent", border: "none", outline: "none", color: T.color.ink, fontFamily: T.font.sans, fontSize: "0.85rem", width: "100%" }}
        />
        {value.q && <X size={14} color={T.color.textGhost} style={{ cursor: "pointer" }} onClick={() => set({ q: "" })} />}
      </div>

      <select style={selectStyle} value={value.origin} onChange={(e) => set({ origin: e.target.value })}>
        <option value="">All origins</option>
        {origins.map((o) => <option key={o.region} value={o.region}>{o.label} ({o.count})</option>)}
      </select>

      <select style={selectStyle} value={value.process} onChange={(e) => set({ process: e.target.value })}>
        <option value="">All processes</option>
        {PROCESSING.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
      </select>

      <select style={selectStyle} value={value.grade} onChange={(e) => set({ grade: e.target.value })}>
        <option value="">All grades</option>
        {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      <select style={selectStyle} value={value.compliance} onChange={(e) => set({ compliance: e.target.value })}>
        <option value="">Any compliance</option>
        <option value="eudr">EUDR-ready</option>
        <option value="passport">Green Passport</option>
        <option value="export">Export-ready</option>
      </select>

      <select style={selectStyle} value={value.cert} onChange={(e) => set({ cert: e.target.value })}>
        <option value="">Any certification</option>
        <option value="organic">Organic</option>
        <option value="fairtrade">Fair Trade</option>
        <option value="rainforest">Rainforest Alliance</option>
      </select>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontFamily: T.font.mono, fontSize: "0.66rem", color: T.color.textFaint, whiteSpace: "nowrap" }}>
          {count} {count === 1 ? "lot" : "lots"}
        </span>
        <select style={selectStyle} value={value.sort} onChange={(e) => set({ sort: e.target.value })}>
          <option value="score">Top score</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="recent">Most recent</option>
        </select>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ ...defaultFilters, q: value.q, sort: value.sort })}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "transparent", border: `1px solid ${T.color.borderStrong}`, borderRadius: "999px", padding: "9px 14px", fontFamily: T.font.sans, fontSize: "0.8rem", color: T.color.textMuted, cursor: "pointer" }}
          >
            <SlidersHorizontal size={13} /> Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
