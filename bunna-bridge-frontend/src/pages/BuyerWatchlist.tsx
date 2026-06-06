import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLots } from "../api/lots";
import { useWatchlist } from "../hooks/useWatchlist";
import PageWrapper from "../components/PageWrapper";
import {
  Heart, ShieldCheck, Mountain, TrendingUp, FlaskConical, Leaf, X
} from "lucide-react";

export default function BuyerWatchlist() {
  const navigate = useNavigate();
  const { ids, toggle } = useWatchlist();

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => getLots({ status: "listed" }),
    enabled: ids.length > 0,
  });

  const watched = (data?.results ?? []).filter(lot => ids.includes(lot.id));

  return (
    <PageWrapper>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#C9952A", margin: "0 0 4px" }}>BUYER</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 400, color: "#F5EDD8", margin: 0 }}>Watchlist</h1>
          {ids.length > 0 && (
            <span style={{ background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.25)", borderRadius: "20px", padding: "2px 10px", fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#C1440E" }}>
              {ids.length} saved
            </span>
          )}
        </div>
        <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.85rem", color: "rgba(245,237,216,0.35)", margin: "6px 0 0" }}>
          Lots you've saved for quick access.
        </p>
      </div>

      {ids.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <Heart size={32} color="rgba(245,237,216,0.1)" style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "rgba(245,237,216,0.3)", margin: "0 0 8px" }}>No saved lots</p>
          <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: "rgba(245,237,216,0.2)", margin: "0 0 20px" }}>
            Tap the heart icon on any lot card in the marketplace.
          </p>
          <button onClick={() => navigate("/marketplace")}
            style={{ background: "#C1440E", border: "none", borderRadius: "4px", padding: "10px 24px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>
            Browse Marketplace
          </button>
        </div>
      )}

      {isLoading && ids.length > 0 && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(245,237,216,0.25)", textAlign: "center", padding: "60px" }}>Loading...</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {watched.map(lot => (
          <div key={lot.id}
            style={{ background: "#1E1208", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "8px", padding: "18px 20px", cursor: "pointer" }}
            onClick={() => navigate(`/marketplace/${lot.id}`)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#C9952A", letterSpacing: "0.15em", margin: "0 0 2px" }}>
                  {lot.lot_id} · {lot.region?.toUpperCase()}
                </p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.2rem", color: "#F5EDD8", margin: "0 0 6px", lineHeight: 1.2 }}>
                  {lot.name}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)" }}>
                    <Mountain size={9} /> {lot.altitude_m}m
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", textTransform: "capitalize" }}>
                    {lot.processing} · {lot.grade}
                  </span>
                  {lot.is_eudr_ready && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#4A7C59" }}>
                      <ShieldCheck size={9} /> EUDR
                    </span>
                  )}
                  {lot.is_organic && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#4A7C59" }}>
                      <Leaf size={9} /> Organic
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.5rem", fontWeight: 300, color: "#C9952A", margin: 0, lineHeight: 1 }}>
                  {lot.fob_price_usd ? `$${parseFloat(lot.fob_price_usd).toFixed(2)}` : "POA"}
                </p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(245,237,216,0.3)", margin: 0 }}>per kg FOB</p>
              </div>
            </div>

            {lot.flavor_tags?.length > 0 && (
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "12px" }}>
                {lot.flavor_tags.slice(0, 4).map(tag => (
                  <span key={tag} style={{ padding: "3px 10px", background: "rgba(74,37,21,0.6)", border: "1px solid rgba(201,149,42,0.15)", borderRadius: "20px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.72rem", color: "#EDE0C4" }}>{tag}</span>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }} onClick={e => e.stopPropagation()}>
              <button onClick={() => navigate(`/marketplace/${lot.id}?offer=1`)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "#C1440E", border: "none", borderRadius: "4px", padding: "8px 16px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                <TrendingUp size={12} /> Make Offer
              </button>
              <button onClick={() => navigate(`/marketplace/${lot.id}?sample=1`)}
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "4px", padding: "8px 14px", color: "#C1440E", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                <FlaskConical size={12} />
              </button>
              <button onClick={() => toggle(lot.id)}
                title="Remove from watchlist"
                style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(245,237,216,0.08)", borderRadius: "4px", padding: "8px 12px", color: "rgba(245,237,216,0.3)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer", marginLeft: "auto" }}>
                <X size={12} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
