import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOffers, respondToOffer } from "../api/lots";
import type { Offer } from "../api/lots";
import AdminShell from "../components/admin/AdminShell";
import { Inbox, CheckCircle, XCircle, RefreshCw, ArrowRight } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

function CounterModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(offer.price_per_kg_usd);
  const [qty, setQty] = useState(offer.quantity_kg);
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => respondToOffer(offer.id, "counter", {
      counter_price: parseFloat(price),
      counter_qty: parseFloat(qty),
      exporter_notes: notes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); setDone(true); },
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ ...AC.card, padding: "28px", width: "100%", maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <RefreshCw size={36} color={AT.color.primary} style={{ marginBottom: "14px" }} />
            <p style={{ fontFamily: AT.font.sans, fontSize: "1.25rem", fontWeight: 600, color: AT.color.text, margin: "0 0 8px" }}>Counter Sent</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, margin: "0 0 20px" }}>The buyer will be notified of your counter offer.</p>
            <button onClick={onClose} style={AC.btnPrimary}>Done</button>
          </div>
        ) : (
          <>
            <p style={AC.eyebrow}>Counter offer</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.text, margin: "4px 0 20px" }}>{offer.lot_name}</p>
            <div style={{ background: AT.color.surfaceSecondary, borderRadius: AT.radius.md, padding: "10px 14px", marginBottom: "18px" }}>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 4px" }}>BUYER'S OFFER</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 700, color: AT.color.text, margin: 0 }}>
                ${parseFloat(offer.price_per_kg_usd).toFixed(2)}/kg · {parseFloat(offer.quantity_kg).toLocaleString()} kg
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
              <div>
                <label style={{ ...AC.eyebrow, display: "block", marginBottom: "5px" }}>Your counter price (USD/kg)</label>
                <input style={AC.input} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label style={{ ...AC.eyebrow, display: "block", marginBottom: "5px" }}>Counter quantity (kg)</label>
                <input style={AC.input} type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div>
                <label style={{ ...AC.eyebrow, display: "block", marginBottom: "5px" }}>Note to buyer (optional)</label>
                <textarea style={{ ...AC.input, minHeight: "64px", resize: "vertical" as const }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain your counter…" />
              </div>
            </div>
            {mutation.isError && <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.red, marginBottom: "12px" }}>Failed. Please try again.</p>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onClose} style={{ flex: 1, ...AC.btnGhost, justifyContent: "center" }}>Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!price || !qty || mutation.isPending} style={{ flex: 2, ...AC.btnPrimary, justifyContent: "center", opacity: !price || !qty ? 0.5 : 1 }}>
                {mutation.isPending ? "Sending…" : "Send Counter"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OfferRow({ offer }: { offer: Offer }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCounter, setShowCounter] = useState(false);

  const respondMutation = useMutation({
    mutationFn: (action: "accept" | "reject") => respondToOffer(offer.id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });

  const isPending = offer.status === "pending";

  return (
    <>
      {showCounter && <CounterModal offer={offer} onClose={() => setShowCounter(false)} />}
      <div style={{ ...AC.card, padding: "18px 20px", borderColor: isPending ? `${AT.color.yellow}55` : AT.color.border }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>{offer.lot_id_display}</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", fontWeight: 600, color: AT.color.text, margin: "0 0 6px" }}>{offer.lot_name}</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, margin: 0 }}>
              From: <span style={{ color: AT.color.textSecondary }}>{offer.buyer_company || offer.buyer_email}</span>
              {offer.buyer_name && offer.buyer_company && ` · ${offer.buyer_name}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.66rem", color: AT.color.textDisabled, margin: "0 0 2px" }}>OFFER</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "1.15rem", fontWeight: 700, color: AT.color.primaryDark, margin: 0, lineHeight: 1 }}>${parseFloat(offer.price_per_kg_usd).toFixed(2)}/kg</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.7rem", color: AT.color.textMuted, margin: "2px 0 0" }}>{parseFloat(offer.quantity_kg).toLocaleString()} kg</p>
            </div>
            {offer.lot_fob_price && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.66rem", color: AT.color.textDisabled, margin: "0 0 2px" }}>YOUR FOB</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.15rem", fontWeight: 600, color: AT.color.textMuted, margin: 0, lineHeight: 1 }}>${parseFloat(offer.lot_fob_price).toFixed(2)}/kg</p>
              </div>
            )}
          </div>
        </div>

        {offer.notes && <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textSecondary, margin: "12px 0 0", fontStyle: "italic" }}>"{offer.notes}"</p>}
        {offer.delivery_window && <p style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textDisabled, margin: "8px 0 0" }}>Delivery: {offer.delivery_window}</p>}

        {isPending && (
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            <button onClick={() => respondMutation.mutate("accept")} disabled={respondMutation.isPending} style={{ display: "flex", alignItems: "center", gap: "6px", ...AC.btnSm, background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}55`, color: AT.color.primaryDark }}>
              <CheckCircle size={13} /> Accept
            </button>
            <button onClick={() => setShowCounter(true)} style={{ display: "flex", alignItems: "center", gap: "6px", ...AC.btnSm, background: AT.color.yellowLight, border: `1px solid #b4530955`, color: "#b45309" }}>
              <RefreshCw size={13} /> Counter
            </button>
            <button onClick={() => respondMutation.mutate("reject")} disabled={respondMutation.isPending} style={{ display: "flex", alignItems: "center", gap: "6px", ...AC.btnSm, background: AT.color.redLight, border: `1px solid ${AT.color.red}44`, color: AT.color.red }}>
              <XCircle size={13} /> Reject
            </button>
            <button onClick={() => navigate(`/marketplace/${offer.lot}`)} style={{ display: "flex", alignItems: "center", gap: "6px", ...AC.btnSm }}>
              <ArrowRight size={13} /> View Lot
            </button>
          </div>
        )}

        {!isPending && (
          <span style={{ ...AC.pill.base, ...(offer.status === "accepted" ? AC.pill.green : AC.pill.muted), marginTop: "12px", textTransform: "uppercase" }}>
            {offer.status}
          </span>
        )}

        <p style={{ fontFamily: AT.font.sans, fontSize: "0.7rem", color: AT.color.textDisabled, margin: "12px 0 0" }}>
          Received {new Date(offer.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
    </>
  );
}

export default function ExporterOffers() {
  const [filter, setFilter] = useState<Offer["status"] | "all">("pending");
  const { data, isLoading } = useQuery({ queryKey: ["offers"], queryFn: getOffers });

  const offers: Offer[] = data ?? [];
  const filtered: Offer[] = filter === "all" ? offers : offers.filter((o: Offer) => o.status === filter);
  const pendingCount = offers.filter((o: Offer) => o.status === "pending").length;

  const grouped = filtered.reduce((acc: Record<string, { lot_name: string; lot_id: string; offers: Offer[] }>, o: Offer) => {
    const key = o.lot_id_display;
    if (!acc[key]) acc[key] = { lot_name: o.lot_name, lot_id: o.lot_id_display, offers: [] };
    acc[key].offers.push(o);
    return acc;
  }, {} as Record<string, { lot_name: string; lot_id: string; offers: Offer[] }>);

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>Exporter</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
          <h1 style={AC.pageTitle}>Offer Inbox</h1>
          {pendingCount > 0 && <span style={{ ...AC.pill.base, ...AC.pill.green, fontSize: "0.72rem" }}>{pendingCount} new</span>}
        </div>
        <p style={AC.pageSubtitle}>Review, accept, counter, or reject offers from buyers.</p>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        {(["pending", "all", "accepted", "countered", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{ padding: "6px 14px", borderRadius: AT.radius.pill, border: `1px solid ${filter === s ? AT.color.primary : AT.color.border}`, background: filter === s ? AT.color.primaryLight : "transparent", fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 500, color: filter === s ? AT.color.primaryDark : AT.color.textMuted, cursor: "pointer", textTransform: "capitalize" }}
          >
            {s}{s === "pending" && pendingCount ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {isLoading && <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, textAlign: "center", padding: "60px 0" }}>Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <Inbox size={32} color={AT.color.textDisabled} style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.textMuted, margin: "0 0 8px" }}>
            {filter === "pending" ? "No pending offers" : "No offers here"}
          </p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textDisabled, margin: 0 }}>Offers from buyers will appear here once submitted.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {Object.values(grouped).map((group) => (
          <div key={group.lot_id}>
            {Object.keys(grouped).length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: 0 }}>{group.lot_id}</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, margin: 0 }}>{group.lot_name}</p>
                <div style={{ flex: 1, height: "1px", background: AT.color.borderLight }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {group.offers.map((offer) => <OfferRow key={offer.id} offer={offer} />)}
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
