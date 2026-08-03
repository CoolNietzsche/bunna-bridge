import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Package } from "lucide-react";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../hooks/useWatchlist";
import AppShell from "../components/AppShell";
import AdminLotCard from "../components/admin/AdminLotCard";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import { computeOrigins, applyLotFilters, filtersFromParams, type LotFilters } from "../lib/catalog";
import { isBuyerRole } from "../lib/utils";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

export default function Marketplace() {
  const [params, setParams] = useSearchParams();
  const searchKey = params.toString();
  const { user, isAuthenticated } = useAuth();
  const { toggle, isWatched } = useWatchlist();
  const isBuyer = isBuyerRole(user?.role) || user?.role === "admin";
  const showWatch = !isAuthenticated || isBuyer;

  const { data, isLoading } = useQuery({ queryKey: ["marketplace-lots"], queryFn: () => getLots() });
  const lots = data?.results ?? [];

  const [filters, setFilters] = useState<LotFilters>(() => filtersFromParams(params));
  useEffect(() => { setFilters(filtersFromParams(params)); }, [searchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resumes a watchlist toggle that was interrupted by a login redirect
  // (see AdminLotCard's onToggleWatch gate) — same "?param=1" resume pattern
  // MarketplaceLotDetail uses for offer/sample.
  useEffect(() => {
    const watchId = params.get("watchlist");
    if (watchId && isAuthenticated) {
      toggle(watchId);
      const next = new URLSearchParams(params);
      next.delete("watchlist");
      setParams(next, { replace: true });
    }
  }, [params, isAuthenticated, toggle, setParams]);

  const origins = useMemo(() => computeOrigins(lots), [lots]);
  const filtered = useMemo(() => applyLotFilters(lots, filters), [lots, filters]);

  return (
    <AppShell>
      <div className="container-editorial" style={{ padding: "32px 0" }}>
        <div style={{ marginBottom: "20px" }}>
          <p style={AC.eyebrow}>Catalog</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Marketplace</h1>
          <p style={AC.pageSubtitle}>{lots.length} Ethiopian micro-lots, verified and ready to trade.</p>
        </div>

        <AdminFilterBar value={filters} onChange={setFilters} origins={origins} count={filtered.length} />

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading the catalogue…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <Package size={30} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>No lots match these filters.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
            {filtered.map((lot) => (
              <AdminLotCard key={lot.id} lot={lot} showWatch={showWatch} isWatched={isWatched(lot.id)} onToggleWatch={toggle} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
