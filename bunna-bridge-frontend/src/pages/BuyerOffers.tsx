import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOffers, withdrawOffer, acceptCounter } from "../api/lots";
import type { Offer } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import { TrendingUp, ArrowRight, X, CheckCircle, Clock, XCircle, RefreshCw, MinusCircle } from "lucide-react";
import { T } from "../styles/tokens";
import { CS } from "../styles/components";

const STATUS_CONFIG: Record<Offer["status"], { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:   { label: "PENDING",   color: T.color.coffee,  bg: T.color.coffeeLight,  border: "rgba(123,75,42,0.2)",  icon: <Clock size={11} /> },
  countered: { label: "COUNTERED", color: T.color.coffee,  bg: T.color.coffeeLight,  border: "rgba(123,75,42,0.2)",  icon: <RefreshCw size={11} /> },
  accepted:  { label: "ACCEPTED",  color: T.color.forest,  bg: T.color.forestLight,  border: "rgba(27,77,53,0.2)",   icon: <CheckCircle size={11} /> },
  rejected:  { label: "REJECTED",  color: T.color.red,     bg: T.color.redLight,     border: "rgba(192,57,43,0.2)",  icon: <XCircle size={11} /> },
  withdrawn: { label: "WITHDRAWN", color: T.color.slate,   bg: T.color.stone,        border: T.color.border,        icon: <MinusCircle size={11} /> },
};

function OfferStatusPill({ status }: { status: Offer["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{ ...CS.badge.base, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.icon} {cfg.label}
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
    <div style={{
      ...CS.card,
      border: offer.status === "countered"
        ? `1px solid rgba(123,75,42,0.3)`
        : `1px solid ${T.color.border}`,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
        <div>
          <p style={{ fontFamily: T.font.mono, fontSize: "0.55rem", color: T.color.coffee, letterSpacing: "0.12em", margin: "0 0 3px" }}>
            {offer.lot_id_display} · {offer.lot_region?.toUpperCase()}
          </p>
          <p style={{ fontFamily: T.font.display, fontSize: "1.2rem", color: T.color.ink, margin: 0, lineHeight: 1.2 }}>
            {offer.lot_name}
          </p>
        </div>
        <OfferStatusPill status={offer.status} />
      </div>

      {/* Offer details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
        {[
          ["YOUR PRICE", `$${parseFloat(offer.price_per_kg_usd).toFixed(2)}/kg`],
          ["QUANTITY",   `${parseFloat(offer.quantity_kg).toLocaleString()} kg`],
          ["TOTAL",      `$${(parseFloat(offer.price_per_kg_usd) * parseFloat(offer.quantity_kg)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ].map(([k, v]) => (
          <div key={k} style={{ background: T.color.linen, borderRadius: T.radius.md, padding: "10px 12px", border: `1px solid ${T.color.border}` }}>
            <p style={{ fontFamily: T.font.mono, fontSize: "0.5rem", color: T.color.textFaint, letterSpacing: "0.1em", margin: "0 0 3px" }}>{k}</p>
            <p style={{ fontFamily: T.font.display, fontSize: "1.15rem", color: T.color.coffee, margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Counter offer */}
      {offer.status === "countered" && offer.counter_price && (
        <div style={{ background: T.color.coffeeLight, border: `1px solid rgba(123,75,42,0.2)`, borderRadius: T.radius.md, padding: "14px 16px", marginBottom: "14px" }}>
          <p style={{ fontFamily: T.font.mono, fontSize: "0.55rem", color: T.color.coffee, letterSpacing: "0.1em", margin: "0 0 10px" }}>COUNTER OFFER FROM EXPORTER</p>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: T.font.mono, fontSize: "0.5rem", color: T.color.textFaint, margin: "0 0 2px" }}>PRICE</p>
              <p style={{ fontFamily: T.font.display, fontSize: "1.4rem", color: T.color.coffee, margin: 0 }}>${parseFloat(offer.counter_price).toFixed(2)}/kg</p>
            </div>
            {offer.counter_qty && (
              <div>
                <p style={{ fontFamily: T.font.mono, fontSize: "0.5rem", color: T.color.textFaint, margin: "0 0 2px" }}>QUANTITY</p>
                <p style={{ fontFamily: T.font.display, fontSize: "1.4rem", color: T.color.coffee, margin: 0 }}>{parseFloat(offer.counter_qty).toLocaleString()} kg</p>
              </div>
            )}
          </div>
          {offer.exporter_notes && (
            <p style={{ fontFamily: T.font.sans, fontSize: "0.8rem", color: T.color.textMuted, margin: "10px 0 0", fontStyle: "italic" }}>"{offer.exporter_notes}"</p>
          )}
        </div>
      )}

      {offer.notes && (
        <p style={{ fontFamily: T.font.sans, fontSize: "0.8rem", color: T.color.textFaint, margin: "0 0 14px", fontStyle: "italic" }}>
          Your note: "{offer.notes}"
        </p>
      )}

      {/* Confirm overlay */}
      {confirming && (
        <div style={{ background: T.color.linen, borderRadius: T.radius.md, border: `1px solid ${T.color.border}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
          <p style={{ fontFamily: T.font.sans, fontSize: "0.82rem", color: T.color.ink, margin: 0 }}>
            {confirming === "withdraw" ? "Withdraw this offer?" : "Accept the counter offer?"}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setConfirming(null)} style={CS.btnGhost}>Cancel</button>
            <button
              onClick={() => confirming === "withdraw" ? withdrawMutation.mutate() : acceptMutation.mutate()}
              disabled={withdrawMutation.isPending || acceptMutation.isPending}
              style={confirming === "withdraw" ? CS.btnDanger : CS.btnPrimary}
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
            <button onClick={() => setConfirming("accept")} style={CS.btnPrimary}>
              <CheckCircle size={13} /> Accept Counter
            </button>
          )}
          <button onClick={() => navigate(`/marketplace/${offer.lot}`)} style={CS.btnGhost}>
            <ArrowRight size={13} /> View Lot
          </button>
          <button onClick={() => setConfirming("withdraw")} style={CS.btnDanger}>
            <X size={13} /> Withdraw
          </button>
        </div>
      )}

      <p style={{ fontFamily: T.font.mono, fontSize: "0.52rem", color: T.color.textGhost, margin: "12px 0 0" }}>
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
  const counts = offers.reduce((acc: Record<string, number>, o: Offer) => {
    acc[o.status] = (acc[o.status] || 0) + 1; return acc;
  }, {} as Record<string, number>);

  return (
    <PageWrapper>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ ...CS.pageSubtitle, color: T.color.coffee, marginBottom: "4px" }}>BUYER</p>
        <h1 style={CS.pageTitle}>My Offers</h1>
        <p style={{ fontFamily: T.font.sans, fontSize: "0.85rem", color: T.color.textMuted, margin: 0 }}>
          Track and manage offers you've submitted to exporters.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
        {(["all", "pending", "countered", "accepted", "rejected", "withdrawn"] as const).map(s => {
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "5px 14px", borderRadius: T.radius.pill,
              border: `1px solid ${active ? "rgba(27,77,53,0.3)" : T.color.border}`,
              background: active ? T.color.forestLight : "transparent",
              fontFamily: T.font.mono, fontSize: "0.58rem", letterSpacing: "0.08em",
              color: active ? T.color.forest : T.color.textFaint,
              cursor: "pointer", textTransform: "uppercase",
            }}>
              {s}{s !== "all" && counts[s] ? ` (${counts[s]})` : s === "all" && offers.length ? ` (${offers.length})` : ""}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <p style={{ fontFamily: T.font.mono, fontSize: "0.7rem", color: T.color.textFaint, textAlign: "center", padding: "60px" }}>
          Loading offers...
        </p>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <TrendingUp size={32} color={T.color.textGhost} style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: T.font.display, fontSize: "1.3rem", color: T.color.textFaint, margin: "0 0 8px" }}>No offers yet</p>
          <p style={{ fontFamily: T.font.sans, fontSize: "0.82rem", color: T.color.textGhost, margin: 0 }}>
            Browse the marketplace and make an offer on a lot.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filtered.map((offer: Offer) => <OfferCard key={offer.id} offer={offer} />)}
      </div>
    </PageWrapper>
  );
}
