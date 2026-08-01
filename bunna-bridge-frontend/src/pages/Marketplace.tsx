import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Package } from "lucide-react";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../hooks/useWatchlist";
import AppShell from "../components/AppShell";
import LotCard from "../components/market/LotCard";
import OriginCard from "../components/market/OriginCard";
import SelectionCard from "../components/market/SelectionCard";
import FilterBar from "../components/market/FilterBar";
import {
  SELECTIONS, computeOrigins, applyLotFilters, filtersFromParams, type LotFilters,
} from "../lib/catalog";
import { T } from "../styles/tokens";

type Tab = "all" | "origins" | "selections";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All coffees" },
  { key: "origins", label: "By origin" },
  { key: "selections", label: "By selection" },
];

export default function Marketplace() {
  const [params] = useSearchParams();
  const searchKey = params.toString();
  const { user, isAuthenticated } = useAuth();
  const { toggle, isWatched } = useWatchlist();
  const isBuyer = isAuthenticated && (user?.role === "buyer" || user?.role === "admin");

  const { data, isLoading } = useQuery({ queryKey: ["marketplace-lots"], queryFn: () => getLots() });
  const lots = data?.results ?? [];

  const [filters, setFilters] = useState<LotFilters>(() => filtersFromParams(params));
  const [tab, setTab] = useState<Tab>(() => (params.get("tab") as Tab) || "all");

  // Re-seed from URL when landing/footer links change the query string.
  useEffect(() => {
    setFilters(filtersFromParams(params));
    setTab(((params.get("tab") as Tab) || "all"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  const origins = useMemo(() => computeOrigins(lots), [lots]);
  const filtered = useMemo(() => applyLotFilters(lots, filters), [lots, filters]);

  return (
    <AppShell footer>
      {/* Header band */}
      <section className="container-editorial" style={{ paddingTop: "48px", paddingBottom: "8px" }}>
        <span style={kicker}>The marketplace</span>
        <h1 style={{ fontFamily: T.font.display, fontSize: "clamp(2.1rem, 4vw, 3.2rem)", fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.02em", color: T.color.ink, margin: "12px 0 0" }}>
          Specialty green coffee, direct from origin
        </h1>
        <p style={{ fontFamily: T.font.sans, fontSize: "1.05rem", color: T.color.textMuted, margin: "12px 0 0", maxWidth: "60ch" }}>
          {lots.length} Ethiopian micro-lots — search a coffee, an origin, or a producer, or browse by what matters to you.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginTop: "28px", borderBottom: `1px solid ${T.color.border}` }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                position: "relative", background: "transparent", border: "none", cursor: "pointer",
                padding: "12px 14px", fontFamily: T.font.sans, fontSize: "0.95rem",
                fontWeight: tab === t.key ? 600 : 500,
                color: tab === t.key ? T.color.ink : T.color.textMuted,
              }}
            >
              {t.label}
              {tab === t.key && <span style={{ position: "absolute", left: "14px", right: "14px", bottom: "-1px", height: "2px", background: T.color.forest, borderRadius: "2px" }} />}
            </button>
          ))}
        </div>
      </section>

      {/* Content */}
      <section className="container-editorial" style={{ paddingTop: "24px", paddingBottom: "24px" }}>
        {tab === "all" && (
          <>
            <FilterBar value={filters} onChange={setFilters} origins={origins} count={filtered.length} />

            {isLoading ? (
              <div style={emptyBox}><p style={emptyText}>Loading the catalogue…</p></div>
            ) : filtered.length === 0 ? (
              <div style={emptyBox}>
                <Package size={30} color={T.color.textGhost} style={{ margin: "0 auto 12px" }} />
                <p style={emptyText}>No lots match these filters.</p>
              </div>
            ) : (
              <div className="bb-catalog" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))", gap: "22px", marginTop: "24px" }}>
                {filtered.map((lot) => (
                  <LotCard key={lot.id} lot={lot} isBuyer={!!isBuyer} isWatched={isWatched(lot.id)} onToggleWatch={toggle} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "origins" && (
          <div className="bb-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "20px" }}>
            {origins.map((o) => <OriginCard key={o.region} origin={o} />)}
          </div>
        )}

        {tab === "selections" && (
          <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "20px" }}>
            {SELECTIONS.map((s) => <SelectionCard key={s.key} selection={s} count={lots.filter(s.match).length} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}

const kicker: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: T.font.mono,
  fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", color: T.color.clay,
};
const emptyBox: React.CSSProperties = { textAlign: "center", padding: "72px 0" };
const emptyText: React.CSSProperties = { fontFamily: T.font.mono, fontSize: "0.8rem", color: T.color.textFaint, margin: 0 };
