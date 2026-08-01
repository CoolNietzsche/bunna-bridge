import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOffers, withdrawOffer, acceptCounter } from "../api/lots";
import type { Offer } from "../api/lots";
import AdminShell from "../components/admin/AdminShell";
import { TrendingUp, ArrowRight, X, CheckCircle, Clock, XCircle, RefreshCw, MinusCircle } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const STATUS_CONFIG: Record<Offer["status"], { label: string; tone: keyof typeof AC.pill; icon: React.ReactNode }> = {
  pending: { label: "PENDING", tone: "yellow", icon: <Clock size={11} /> },
  countered: { label: "COUNTERED", tone: "yellow", icon: <RefreshCw size={11} /> },
  accepted: { label: "ACCEPTED", tone: "green", icon: <CheckCircle size={11} /> },
  rejected: { label: "REJECTED", tone: "red", icon: <XCircle size={11} /> },
  withdrawn: { label: "WITHDRAWN", tone: "muted", icon: <MinusCircle size={11} /> },
};

function OfferStatusPill({ status }: { status: Offer["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return <span style={{ ...AC.pill.base, ...AC.pill[cfg.tone] }}>{cfg.icon} {cfg.label}</span>;
}

function OfferCard({ offer }: { offer: Offer }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<"withdraw" | "accept" | null>(null);

  const withdrawMutation = useMutation({ mutationFn: () => withdrawOffer(offer.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); setConfirming(null); } });
  const acceptMutation = useMutation({ mutationFn: () => acceptCounter(offer.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); setConfirming(null); } });

  const isActive = offer.status === "pending" || offer.status === "countered";

  return (
    <div style={{ ...AC.card, ...AC.cardPad, borderColor: offer.status === "countered" ? `${AT.color.yellow}55` : AT.color.border }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
        <div>
          <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>{offer.lot_id_display} · {offer.lot_region?.toUpperCase()}</p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.text, margin: 0 }}>{offer.lot_name}</p>
        </div>
        <OfferStatusPill status={offer.status} />
      </div>

      <div className="ab-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
        {[
          ["YOUR PRICE", `$${parseFloat(offer.price_per_kg_usd).toFixed(2)}/kg`],
          ["QUANTITY", `${parseFloat(offer.quantity_kg).toLocaleString()} kg`],
          ["TOTAL", `$${(parseFloat(offer.price_per_kg_usd) * parseFloat(offer.quantity_kg)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ].map(([k, v]) => (
          <div key={k} style={{ background: AT.color.surfaceSecondary, borderRadius: AT.radius.md, padding: "10px 12px", border: `1px solid ${AT.color.border}` }}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", color: AT.color.textDisabled, margin: "0 0 3px" }}>{k}</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", fontWeight: 700, color: AT.color.text, margin: 0 }}>{v}</p>
          </div>
        ))}
      </div>

      {offer.status === "countered" && offer.counter_price && (
        <div style={{ background: AT.color.yellowLight, border: `1px solid #b4530933`, borderRadius: AT.radius.md, padding: "14px 16px", marginBottom: "14px" }}>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", fontWeight: 600, color: "#b45309", margin: "0 0 10px" }}>COUNTER OFFER FROM EXPORTER</p>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", color: AT.color.textDisabled, margin: "0 0 2px" }}>PRICE</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "1.2rem", fontWeight: 700, color: "#b45309", margin: 0 }}>${parseFloat(offer.counter_price).toFixed(2)}/kg</p>
            </div>
            {offer.counter_qty && (
              <div>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", color: AT.color.textDisabled, margin: "0 0 2px" }}>QUANTITY</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.2rem", fontWeight: 700, color: "#b45309", margin: 0 }}>{parseFloat(offer.counter_qty).toLocaleString()} kg</p>
              </div>
            )}
          </div>
          {offer.exporter_notes && <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textSecondary, margin: "10px 0 0", fontStyle: "italic" }}>"{offer.exporter_notes}"</p>}
        </div>
      )}

      {offer.notes && <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textMuted, margin: "0 0 14px", fontStyle: "italic" }}>Your note: "{offer.notes}"</p>}

      {confirming && (
        <div style={{ background: AT.color.surfaceSecondary, borderRadius: AT.radius.md, border: `1px solid ${AT.color.border}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, margin: 0 }}>
            {confirming === "withdraw" ? "Withdraw this offer?" : "Accept the counter offer?"}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setConfirming(null)} style={AC.btnGhost}>Cancel</button>
            <button
              onClick={() => (confirming === "withdraw" ? withdrawMutation.mutate() : acceptMutation.mutate())}
              disabled={withdrawMutation.isPending || acceptMutation.isPending}
              style={confirming === "withdraw" ? { ...AC.btnPrimary, background: AT.color.red, borderColor: AT.color.red } : AC.btnPrimary}
            >
              {withdrawMutation.isPending || acceptMutation.isPending ? "…" : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {isActive && !confirming && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {offer.status === "countered" && (
            <button onClick={() => setConfirming("accept")} style={AC.btnPrimary}><CheckCircle size={13} /> Accept Counter</button>
          )}
          <button onClick={() => navigate(`/marketplace/${offer.lot}`)} style={AC.btnGhost}><ArrowRight size={13} /> View Lot</button>
          <button onClick={() => setConfirming("withdraw")} style={{ ...AC.btnGhost, color: AT.color.red, borderColor: `${AT.color.red}44` }}><X size={13} /> Withdraw</button>
        </div>
      )}

      <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textDisabled, margin: "12px 0 0" }}>
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
  const filtered = filter === "all" ? offers : offers.filter((o) => o.status === filter);
  const counts = offers.reduce((acc: Record<string, number>, o: Offer) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>Buyer</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>My Offers</h1>
        <p style={AC.pageSubtitle}>Track and manage offers you've submitted to exporters.</p>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        {(["all", "pending", "countered", "accepted", "rejected", "withdrawn"] as const).map((s) => {
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "6px 14px", borderRadius: AT.radius.pill, border: `1px solid ${active ? AT.color.primary : AT.color.border}`, background: active ? AT.color.primaryLight : "transparent", fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 500, color: active ? AT.color.primaryDark : AT.color.textMuted, cursor: "pointer", textTransform: "capitalize" }}>
              {s}{s !== "all" && counts[s] ? ` (${counts[s]})` : s === "all" && offers.length ? ` (${offers.length})` : ""}
            </button>
          );
        })}
      </div>

      {isLoading && <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, textAlign: "center", padding: "60px 0" }}>Loading offers…</p>}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <TrendingUp size={32} color={AT.color.textDisabled} style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.textMuted, margin: "0 0 8px" }}>No offers yet</p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textDisabled, margin: 0 }}>Browse the marketplace and make an offer on a lot.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {filtered.map((offer: Offer) => <OfferCard key={offer.id} offer={offer} />)}
      </div>

      <style>{`@media (max-width: 560px){ .ab-3col { grid-template-columns: 1fr !important; } }`}</style>
    </AdminShell>
  );
}
