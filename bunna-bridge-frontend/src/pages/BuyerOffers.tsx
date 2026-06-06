import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOffers, withdrawOffer, acceptCounter } from "../api/lots";
import type { Offer } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import { TrendingUp, ArrowRight, X, CheckCircle, Clock, XCircle, RefreshCw, MinusCircle } from "lucide-react";

const STATUS_CONFIG: Record<Offer["status"], { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "PENDING",   color: "#C9952A",               icon: <Clock size={11} /> },
  countered: { label: "COUNTERED", color: "#D4824A",               icon: <RefreshCw size={11} /> },
  accepted:  { label: "ACCEPTED",  color: "#A8C5A0",               icon: <CheckCircle size={11} /> },
  rejected:  { label: "REJECTED",  color: "rgba(193,68,14,0.7)",   icon: <XCircle size={11} /> },
  withdrawn: { label: "WITHDRAWN", color: "rgba(245,237,216,0.25)",icon: <MinusCircle size={11} /> },
};

function StatusPill({ status }: { status: Offer["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`, fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.1em", color: cfg.color }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<"withdraw" | "accept" | null>(null);

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawOffer(offer.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); setConfirming(null); },
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptCounter(offer.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); setConfirming(null); },
  });

  const isActive = offer.status === "pending" || offer.status === "countered";

  return (
    <div style={{ background: "#1E1208", border: `1px solid ${offer.status === "countered" ? "rgba(212,130,74,0.3)" : "rgba(245,237,216,0.06)"}`, borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#C9952A", letterSpacing: "0.15em", margin: "0 0 3px" }}>
            {offer.lot_id_display} · {offer.lot_region?.toUpperCase()}
          </p>
          <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.2rem", color: "#F5EDD8", margin: 0, lineHeight: 1.2 }}>
            {offer.lot_name}
          </p>
        </div>
        <StatusPill status={offer.status} />
      </div>

      {/* Offer details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          ["YOUR PRICE", `$${parseFloat(offer.price_per_kg_usd).toFixed(2)}/kg`],
          ["QUANTITY",   `${parseFloat(offer.quantity_kg).toLocaleString()} kg`],
          ["TOTAL",      `$${(parseFloat(offer.price_per_kg_usd) * parseFloat(offer.quantity_kg)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ].map(([k, v]) => (
          <div key={k} style={{ background: "rgba(245,237,216,0.03)", borderRadius: "5px", padding: "10px 12px" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(245,237,216,0.3)", letterSpacing: "0.1em", margin: "0 0 3px" }}>{k}</p>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: "#C9952A", margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Counter offer block */}
      {offer.status === "countered" && offer.counter_price && (
        <div style={{ background: "rgba(212,130,74,0.06)", border: "1px solid rgba(212,130,74,0.2)", borderRadius: "6px", padding: "14px 16px" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#D4824A", letterSpacing: "0.1em", margin: "0 0 8px" }}>COUNTER OFFER FROM EXPORTER</p>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(245,237,216,0.3)", margin: "0 0 2px" }}>PRICE</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "#D4824A", margin: 0 }}>${parseFloat(offer.counter_price).toFixed(2)}/kg</p>
            </div>
            {offer.counter_qty && (
              <div>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(245,237,216,0.3)", margin: "0 0 2px" }}>QUANTITY</p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "#D4824A", margin: 0 }}>{parseFloat(offer.counter_qty).toLocaleString()} kg</p>
              </div>
            )}
          </div>
          {offer.exporter_notes && (
            <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "rgba(245,237,216,0.45)", margin: "10px 0 0", fontStyle: "italic" }}>"{offer.exporter_notes}"</p>
          )}
        </div>
      )}

      {/* Notes */}
      {offer.notes && (
        <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "rgba(245,237,216,0.35)", margin: 0, fontStyle: "italic" }}>
          Your note: "{offer.notes}"
        </p>
      )}

      {/* Confirm overlay */}
      {confirming && (
        <div style={{ background: "rgba(26,15,7,0.7)", borderRadius: "6px", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: "#EDE0C4", margin: 0 }}>
            {confirming === "withdraw" ? "Withdraw this offer?" : "Accept the counter offer?"}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setConfirming(null)} style={{ background: "transparent", border: "1px solid rgba(245,237,216,0.15)", borderRadius: "4px", padding: "6px 14px", color: "rgba(245,237,216,0.4)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
            <button
              onClick={() => confirming === "withdraw" ? withdrawMutation.mutate() : acceptMutation.mutate()}
              disabled={withdrawMutation.isPending || acceptMutation.isPending}
              style={{ background: confirming === "withdraw" ? "rgba(193,68,14,0.8)" : "#1E3A2F", border: "none", borderRadius: "4px", padding: "6px 14px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}
            >
              {withdrawMutation.isPending || acceptMutation.isPending ? "..." : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {isActive && !confirming && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {offer.status === "countered" && (
            <button onClick={() => setConfirming("accept")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1E3A2F", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "4px", padding: "8px 16px", color: "#A8C5A0", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
              <CheckCircle size={12} /> Accept Counter
            </button>
          )}
          <button onClick={() => navigate(`/marketplace/${offer.lot}`)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(245,237,216,0.1)", borderRadius: "4px", padding: "8px 16px", color: "rgba(245,237,216,0.5)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
            <ArrowRight size={12} /> View Lot
          </button>
          <button onClick={() => setConfirming("withdraw")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(193,68,14,0.2)", borderRadius: "4px", padding: "8px 16px", color: "rgba(193,68,14,0.6)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
            <X size={12} /> Withdraw
          </button>
        </div>
      )}

      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(245,237,216,0.2)", margin: 0 }}>
        Submitted {new Date(offer.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        {offer.delivery_window ? ` · Delivery: ${offer.delivery_window}` : ""}
      </p>
    </div>
  );
}

export default function BuyerOffers() {
  const [filter, setFilter] = useState<Offer["status"] | "all">("all");
  const { data, isLoading } = useQuery({ queryKey: ["offers"], queryFn: getOffers });

  const offers: Offer[] = data ?? [];
  const filtered = filter === "all" ? offers : offers.filter(o => o.status === filter);
  const counts = offers.reduce((acc: Record<string, number>, o: Offer) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <PageWrapper>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#C9952A", margin: "0 0 4px" }}>BUYER</p>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 6px" }}>My Offers</h1>
        <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.85rem", color: "rgba(245,237,216,0.35)", margin: 0 }}>
          Track and manage offers you've submitted to exporters.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
        {(["all", "pending", "countered", "accepted", "rejected", "withdrawn"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "5px 14px", borderRadius: "20px", border: `1px solid ${filter === s ? "rgba(201,149,42,0.4)" : "rgba(245,237,216,0.08)"}`, background: filter === s ? "rgba(201,149,42,0.08)" : "transparent", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.08em", color: filter === s ? "#C9952A" : "rgba(245,237,216,0.35)", cursor: "pointer", textTransform: "uppercase" }}>
            {s}{s !== "all" && counts[s] ? ` (${counts[s]})` : s === "all" && offers.length ? ` (${offers.length})` : ""}
          </button>
        ))}
      </div>

      {isLoading && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(245,237,216,0.25)", textAlign: "center", padding: "60px" }}>Loading offers...</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <TrendingUp size={32} color="rgba(245,237,216,0.1)" style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "rgba(245,237,216,0.3)", margin: "0 0 8px" }}>No offers yet</p>
          <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: "rgba(245,237,216,0.2)", margin: 0 }}>
            Browse the marketplace and make an offer on a lot.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {(filtered as Offer[]).map((offer: Offer) => <OfferCard key={offer.id} offer={offer} />)}
      </div>
    </PageWrapper>
  );
}
