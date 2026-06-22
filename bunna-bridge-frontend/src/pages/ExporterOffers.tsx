import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOffers, respondToOffer } from "../api/lots";
import type { Offer } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import { Inbox, CheckCircle, XCircle, RefreshCw, ArrowRight } from "lucide-react";

function CounterModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(offer.price_per_kg_usd);
  const [qty, setQty]     = useState(offer.quantity_kg);
  const [notes, setNotes] = useState("");
  const [done, setDone]   = useState(false);

  const mutation = useMutation({
    mutationFn: () => respondToOffer(offer.id, "counter", {
      counter_price: parseFloat(price),
      counter_qty: parseFloat(qty),
      exporter_notes: notes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); setDone(true); },
  });

  const inp = { background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.09)", borderRadius: "4px", padding: "9px 12px", color: "#1C1C1A", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", outline: "none", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,15,7,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} onClick={onClose}>
      <div style={{ background: "#1B4D35", border: "1px solid rgba(212,130,74,0.25)", borderRadius: "10px", padding: "28px", width: "100%", maxWidth: "420px" }} onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <RefreshCw size={36} color="#1B4D35" style={{ marginBottom: "14px" }} />
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", color: "#1C1C1A", margin: "0 0 8px" }}>Counter Sent</p>
            <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: "rgba(28,28,26,0.4)", margin: "0 0 20px" }}>The buyer will be notified of your counter offer.</p>
            <button onClick={onClose} style={{ background: "#1B4D35", border: "none", borderRadius: "4px", padding: "10px 24px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#1B4D35", letterSpacing: "0.12em", margin: "0 0 4px" }}>COUNTER OFFER</p>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.2rem", color: "#1C1C1A", margin: "0 0 20px" }}>{offer.lot_name}</p>
            <div style={{ background: "rgba(28,28,26,0.03)", borderRadius: "6px", padding: "10px 14px", marginBottom: "18px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.3)", margin: "0 0 4px" }}>BUYER'S OFFER</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.2rem", color: "#8B5E3C", margin: 0 }}>
                ${parseFloat(offer.price_per_kg_usd).toFixed(2)}/kg · {parseFloat(offer.quantity_kg).toLocaleString()} kg
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
              <div>
                <label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.35)", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>YOUR COUNTER PRICE (USD/KG)</label>
                <input style={inp} type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.35)", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>COUNTER QUANTITY (KG)</label>
                <input style={inp} type="number" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.35)", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>NOTE TO BUYER (OPTIONAL)</label>
                <textarea style={{ ...inp, minHeight: "64px", resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain your counter..." />
              </div>
            </div>
            {mutation.isError && <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#1B4D35", marginBottom: "12px" }}>Failed. Please try again.</p>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid rgba(28,28,26,0.09)", borderRadius: "4px", padding: "10px", color: "rgba(28,28,26,0.4)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!price || !qty || mutation.isPending} style={{ flex: 2, background: "#1B4D35", border: "none", borderRadius: "4px", padding: "10px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer", opacity: (!price || !qty) ? 0.5 : 1 }}>
                {mutation.isPending ? "Sending..." : "Send Counter"}
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
      <div style={{ background: "#1B4D35", border: `1px solid ${isPending ? "rgba(201,149,42,0.15)" : "rgba(28,28,26,0.04)"}`, borderRadius: "8px", padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#8B5E3C", letterSpacing: "0.12em", margin: "0 0 2px" }}>{offer.lot_id_display}</p>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: "#1C1C1A", margin: "0 0 6px" }}>{offer.lot_name}</p>
            <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: "rgba(28,28,26,0.35)", margin: 0 }}>
              From: <span style={{ color: "rgba(28,28,26,0.5)" }}>{offer.buyer_company || offer.buyer_email}</span>
              {offer.buyer_name && offer.buyer_company && ` · ${offer.buyer_name}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(28,28,26,0.3)", margin: "0 0 2px" }}>OFFER</p>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "#8B5E3C", margin: 0, lineHeight: 1 }}>${parseFloat(offer.price_per_kg_usd).toFixed(2)}/kg</p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(28,28,26,0.3)", margin: "2px 0 0" }}>{parseFloat(offer.quantity_kg).toLocaleString()} kg</p>
            </div>
            {lot_fob_price(offer) && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(28,28,26,0.3)", margin: "0 0 2px" }}>YOUR FOB</p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "rgba(28,28,26,0.4)", margin: 0, lineHeight: 1 }}>${parseFloat(lot_fob_price(offer)!).toFixed(2)}/kg</p>
              </div>
            )}
          </div>
        </div>

        {offer.notes && (
          <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.78rem", color: "rgba(28,28,26,0.35)", margin: "12px 0 0", fontStyle: "italic" }}>"{offer.notes}"</p>
        )}

        {offer.delivery_window && (
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(28,28,26,0.25)", margin: "8px 0 0" }}>Delivery: {offer.delivery_window}</p>
        )}

        {isPending && (
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              onClick={() => respondMutation.mutate("accept")}
              disabled={respondMutation.isPending}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1B4D35", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "4px", padding: "8px 16px", color: "#A8D5BC", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}
            >
              <CheckCircle size={12} /> Accept
            </button>
            <button
              onClick={() => setShowCounter(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(212,130,74,0.08)", border: "1px solid rgba(212,130,74,0.25)", borderRadius: "4px", padding: "8px 16px", color: "#1B4D35", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}
            >
              <RefreshCw size={12} /> Counter
            </button>
            <button
              onClick={() => respondMutation.mutate("reject")}
              disabled={respondMutation.isPending}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(192,57,43,0.15)", borderRadius: "4px", padding: "8px 16px", color: "rgba(27,77,53,0.6)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}
            >
              <XCircle size={12} /> Reject
            </button>
            <button
              onClick={() => navigate(`/marketplace/${offer.lot}`)}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(28,28,26,0.07)", borderRadius: "4px", padding: "8px 16px", color: "rgba(28,28,26,0.35)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}
            >
              <ArrowRight size={12} /> View Lot
            </button>
          </div>
        )}

        {!isPending && (
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: offer.status === "accepted" ? "#A8D5BC" : "rgba(27,77,53,0.5)", margin: "12px 0 0", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {offer.status}
          </p>
        )}

        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(28,28,26,0.18)", margin: "10px 0 0" }}>
          Received {new Date(offer.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
    </>
  );
}

function lot_fob_price(offer: Offer) { return offer.lot_fob_price; }

export default function ExporterOffers() {
  const [filter, setFilter] = useState<Offer["status"] | "all">("pending");
  const { data, isLoading } = useQuery({ queryKey: ["offers"], queryFn: getOffers });

  const offers: Offer[] = data ?? [];
  const filtered: Offer[] = filter === "all" ? offers : offers.filter((o: Offer) => o.status === filter);
  const pendingCount = offers.filter((o: Offer) => o.status === "pending").length;

  // Group by lot
  const grouped = filtered.reduce((acc: Record<string, { lot_name: string; lot_id: string; offers: Offer[] }>, o: Offer) => {
    const key = o.lot_id_display;
    if (!acc[key]) acc[key] = { lot_name: o.lot_name, lot_id: o.lot_id_display, offers: [] };
    acc[key].offers.push(o);
    return acc;
  }, {} as Record<string, { lot_name: string; lot_id: string; offers: Offer[] }>);

  return (
    <PageWrapper>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#8B5E3C", margin: "0 0 4px" }}>EXPORTER</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 400, color: "#1C1C1A", margin: 0 }}>Offer Inbox</h1>
          {pendingCount > 0 && (
            <span style={{ background: "#1B4D35", borderRadius: "20px", padding: "2px 10px", fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "white" }}>
              {pendingCount} new
            </span>
          )}
        </div>
        <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.85rem", color: "rgba(28,28,26,0.35)", margin: "6px 0 0" }}>
          Review, accept, counter, or reject offers from buyers.
        </p>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "24px" }}>
        {(["pending", "all", "accepted", "countered", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "5px 14px", borderRadius: "20px", border: `1px solid ${filter === s ? "rgba(201,149,42,0.4)" : "rgba(28,28,26,0.07)"}`, background: filter === s ? "rgba(201,149,42,0.08)" : "transparent", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.08em", color: filter === s ? "#8B5E3C" : "rgba(28,28,26,0.35)", cursor: "pointer", textTransform: "uppercase" }}>
            {s}{s === "pending" && pendingCount ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {isLoading && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(28,28,26,0.25)", textAlign: "center", padding: "60px" }}>Loading...</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <Inbox size={32} color="rgba(28,28,26,0.09)" style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "rgba(28,28,26,0.3)", margin: "0 0 8px" }}>
            {filter === "pending" ? "No pending offers" : "No offers here"}
          </p>
          <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: "rgba(28,28,26,0.15)", margin: 0 }}>
            Offers from buyers will appear here once submitted.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {Object.values(grouped).map(group => (
          <div key={group.lot_id}>
            {Object.keys(grouped).length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(28,28,26,0.3)", letterSpacing: "0.12em", margin: 0 }}>{group.lot_id}</p>
                <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: "rgba(28,28,26,0.5)", margin: 0 }}>{group.lot_name}</p>
                <div style={{ flex: 1, height: "1px", background: "rgba(28,28,26,0.04)" }} />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {group.offers.map(offer => <OfferRow key={offer.id} offer={offer} />)}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
