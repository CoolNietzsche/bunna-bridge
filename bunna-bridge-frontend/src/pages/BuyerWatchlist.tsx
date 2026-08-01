import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLots } from "../api/lots";
import { useWatchlist } from "../hooks/useWatchlist";
import AdminShell from "../components/admin/AdminShell";
import {
  Heart, ShieldCheck, Mountain, TrendingUp, FlaskConical, Leaf, X
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

export default function BuyerWatchlist() {
  const navigate = useNavigate();
  const { ids, toggle } = useWatchlist();

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => getLots({ status: "listed" }),
    enabled: ids.length > 0,
  });

  const watched = (data?.results ?? []).filter((lot) => ids.includes(lot.id));

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>Buyer</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
          <h1 style={AC.pageTitle}>Watchlist</h1>
          {ids.length > 0 && <span style={{ ...AC.pill.base, ...AC.pill.red }}>{ids.length} saved</span>}
        </div>
        <p style={AC.pageSubtitle}>Lots you've saved for quick access.</p>
      </div>

      {ids.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <Heart size={32} color={AT.color.textDisabled} style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.textMuted, margin: "0 0 8px" }}>No saved lots</p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textDisabled, margin: "0 0 20px" }}>
            Tap the heart icon on any lot card in the marketplace.
          </p>
          <button onClick={() => navigate("/marketplace")} style={AC.btnPrimary}>Browse Marketplace</button>
        </div>
      )}

      {isLoading && ids.length > 0 && (
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, textAlign: "center", padding: "60px 0" }}>Loading…</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {watched.map((lot) => (
          <div
            key={lot.id}
            style={{ ...AC.card, ...AC.cardPad, cursor: "pointer" }}
            onClick={() => navigate(`/marketplace/${lot.id}`)}
          >
            <div className="ab-watch" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>
                  {lot.lot_id} · {lot.region?.toUpperCase()}
                </p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.text, margin: "0 0 8px", lineHeight: 1.25 }}>
                  {lot.name}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted }}>
                    <Mountain size={11} /> {lot.altitude_m}m
                  </span>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, textTransform: "capitalize" }}>
                    {lot.processing} · {lot.grade}
                  </span>
                  {lot.is_eudr_ready && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500, color: AT.color.primaryDark }}>
                      <ShieldCheck size={11} /> EUDR
                    </span>
                  )}
                  {lot.is_organic && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500, color: AT.color.primaryDark }}>
                      <Leaf size={11} /> Organic
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.3rem", fontWeight: 700, color: AT.color.text, margin: 0, lineHeight: 1 }}>
                  {lot.fob_price_usd ? `$${parseFloat(lot.fob_price_usd).toFixed(2)}` : "POA"}
                </p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", color: AT.color.textDisabled, margin: 0 }}>per kg FOB</p>
              </div>
            </div>

            {lot.flavor_tags?.length > 0 && (
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "12px" }}>
                {lot.flavor_tags.slice(0, 4).map((tag) => (
                  <span key={tag} style={{ padding: "3px 10px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.pill, fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textSecondary }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => navigate(`/marketplace/${lot.id}?offer=1`)} style={AC.btnPrimary}>
                <TrendingUp size={13} /> Make Offer
              </button>
              <button onClick={() => navigate(`/marketplace/${lot.id}?sample=1`)} style={AC.btnGhost}>
                <FlaskConical size={13} /> Sample
              </button>
              <button
                onClick={() => toggle(lot.id)}
                title="Remove from watchlist"
                style={{ ...AC.btnGhost, color: AT.color.red, borderColor: `${AT.color.red}44`, marginLeft: "auto" }}
              >
                <X size={13} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`@media (max-width: 560px){ .ab-watch { flex-direction: column !important; } .ab-watch > div:last-child { align-items: flex-start !important; } }`}</style>
    </AdminShell>
  );
}
