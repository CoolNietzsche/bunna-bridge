import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLot, createOffer, downloadEudrDds, downloadSpecSheet } from "../api/lots";
import { createSampleRequest } from "../api/samples";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import {
  ShieldCheck, Mountain, Leaf, FlaskConical, TrendingUp,
  ArrowLeft, Award, CheckCircle, XCircle, Download,
  MapPin, Calendar, Package, X, FileText
} from "lucide-react";

// ── Radar chart (pure SVG, no lib needed) ─────────────────────────────────────
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const keys = Object.keys(scores);
  const n = keys.length;
  const cx = 110, cy = 110, r = 80;
  const max = 10, min = 6;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, val: number) => {
    const ratio = (val - min) / (max - min);
    const a = angle(i);
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) };
  };
  const gridPt = (i: number, ratio: number) => {
    const a = angle(i);
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) };
  };

  const dataPath = keys.map((k, i) => {
    const p = pt(i, scores[k] || min);
    return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
  }).join(" ") + "Z";

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      {/* Grid */}
      {gridLevels.map(lvl => (
        <polygon key={lvl}
          points={keys.map((_, i) => { const p = gridPt(i, lvl); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="rgba(28,28,26,0.05)" strokeWidth="1"
        />
      ))}
      {/* Spokes */}
      {keys.map((_, i) => {
        const p = gridPt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(28,28,26,0.05)" strokeWidth="1" />;
      })}
      {/* Data */}
      <path d={dataPath} fill="rgba(201,149,42,0.15)" stroke="#8B5E3C" strokeWidth="1.5" />
      {/* Dots */}
      {keys.map((k, i) => {
        const p = pt(i, scores[k] || min);
        return <circle key={k} cx={p.x} cy={p.y} r="3" fill="#8B5E3C" />;
      })}
      {/* Labels */}
      {keys.map((k, i) => {
        const a = angle(i);
        const lx = cx + (r + 18) * Math.cos(a);
        const ly = cy + (r + 18) * Math.sin(a);
        return (
          <text key={k} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="7" fill="rgba(28,28,26,0.4)"
            fontFamily="DM Mono, monospace"
          >
            {k.replace("_", " ").toUpperCase().slice(0, 6)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Gate row ──────────────────────────────────────────────────────────────────
function GateRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #FFFFFF" }}>
      {passed
        ? <CheckCircle size={14} color="#A8D5BC" />
        : <XCircle size={14} color="rgba(27,77,53,0.6)" />
      }
      <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: passed ? "rgba(28,28,26,0.5)" : "rgba(28,28,26,0.35)" }}>
        {label}
      </span>
      <span style={{ marginLeft: "auto", fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: passed ? "#A8D5BC" : "rgba(27,77,53,0.6)" }}>
        {passed ? "PASS" : "PENDING"}
      </span>
    </div>
  );
}

// ── Offer modal ───────────────────────────────────────────────────────────────
function OfferModal({ lot, onClose }: { lot: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty]     = useState(lot.min_order_kg || "300");
  const [price, setPrice] = useState(lot.fob_price_usd || "");
  const [window_, setWindow] = useState(lot.delivery_window || "");
  const [notes, setNotes] = useState("");
  const [done, setDone]   = useState(false);

  const mutation = useMutation({
    mutationFn: () => createOffer({
      lot: lot.id,
      quantity_kg: parseFloat(qty),
      price_per_kg_usd: parseFloat(price),
      delivery_window: window_,
      notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offers"] });
      setDone(true);
    },
  });

  const inp = {
    background: "#FFFFFF",
    border: "1px solid rgba(28,28,26,0.09)",
    borderRadius: "4px", padding: "9px 12px",
    color: "#1C1C1A", fontFamily: "Instrument Sans, sans-serif",
    fontSize: "0.875rem", outline: "none", width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,15,7,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
      onClick={onClose}>
      <div style={{ background: "#1B4D35", border: "1px solid rgba(28,28,26,0.1)", borderRadius: "10px", padding: "28px", width: "100%", maxWidth: "440px" }}
        onClick={e => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <CheckCircle size={40} color="#A8D5BC" style={{ marginBottom: "16px" }} />
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", color: "#1C1C1A", margin: "0 0 8px" }}>Offer Sent</p>
            <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.85rem", color: "rgba(28,28,26,0.45)", margin: "0 0 20px" }}>
              The exporter will respond within 48 hours.
            </p>
            <button onClick={onClose} style={{ background: "#1B4D35", border: "none", borderRadius: "4px", padding: "10px 24px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#8B5E3C", letterSpacing: "0.12em", margin: "0 0 3px" }}>MAKE AN OFFER</p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.2rem", color: "#1C1C1A", margin: 0 }}>{lot.name}</p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(28,28,26,0.3)", padding: "4px" }}>
                <X size={16} />
              </button>
            </div>

            {lot.fob_price_usd && (
              <div style={{ background: "rgba(201,149,42,0.06)", border: "1px solid rgba(201,149,42,0.15)", borderRadius: "6px", padding: "10px 14px", marginBottom: "18px" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.4)", margin: "0 0 2px" }}>LISTED FOB PRICE</p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.5rem", color: "#8B5E3C", margin: 0 }}>
                  ${parseFloat(lot.fob_price_usd).toFixed(2)} / kg
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
              <div>
                <label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
                  QUANTITY (KG) · Min {lot.min_order_kg} kg
                </label>
                <input style={inp} type="number" value={qty} min={lot.min_order_kg} onChange={e => setQty(e.target.value)} />
              </div>
              <div>
                <label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
                  YOUR OFFER PRICE (USD / KG)
                </label>
                <input style={inp} type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 8.50" />
              </div>
              <div>
                <label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
                  DELIVERY WINDOW
                </label>
                <input style={inp} type="text" value={window_} onChange={e => setWindow(e.target.value)} placeholder="e.g. Q3 2025" />
              </div>
              <div>
                <label style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.4)", letterSpacing: "0.08em", display: "block", marginBottom: "5px" }}>
                  NOTES (OPTIONAL)
                </label>
                <textarea style={{ ...inp, minHeight: "72px", resize: "vertical" }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific requirements..." />
              </div>
            </div>

            {qty && price && (
              <div style={{ background: "rgba(28,28,26,0.03)", border: "1px solid rgba(28,28,26,0.06)", borderRadius: "6px", padding: "10px 14px", marginBottom: "18px" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.35)", margin: "0 0 3px" }}>TOTAL OFFER VALUE</p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.6rem", color: "#1C1C1A", margin: 0 }}>
                  ${(parseFloat(qty) * parseFloat(price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {mutation.isError && (
              <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#1B4D35", marginBottom: "12px" }}>
                Failed to send offer. Please try again.
              </p>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onClose} style={{ flex: 1, background: "transparent", border: "1px solid rgba(28,28,26,0.09)", borderRadius: "4px", padding: "10px", color: "rgba(28,28,26,0.5)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={!qty || !price || mutation.isPending}
                style={{ flex: 2, background: "#1B4D35", border: "none", borderRadius: "4px", padding: "10px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer", opacity: (!qty || !price) ? 0.5 : 1 }}
              >
                {mutation.isPending ? "Sending..." : "Send Offer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MarketplaceLotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showOffer, setShowOffer]   = useState(searchParams.get("offer") === "1");
  const [showSample, setShowSample] = useState(searchParams.get("sample") === "1");
  const [sampleDone, setSampleDone] = useState(false);
  const [sampleNote, setSampleNote] = useState("");

  const { data: lot, isLoading } = useQuery({
    queryKey: ["lot", id],
    queryFn: () => getLot(id!),
    enabled: !!id,
  });

  const sampleMutation = useMutation({
    mutationFn: () => createSampleRequest({ lot: id!, message: sampleNote, quantity_g: 200, shipping_address: "" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["samples"] }); setSampleDone(true); },
  });

  const isBuyer = user?.role === "buyer" || user?.role === "admin";

  useEffect(() => {
    setShowOffer(searchParams.get("offer") === "1");
    setShowSample(searchParams.get("sample") === "1");
  }, [searchParams]);

  if (isLoading) return (
    <PageWrapper>
      <div style={{ textAlign: "center", padding: "80px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(28,28,26,0.25)" }}>
        Loading lot...
      </div>
    </PageWrapper>
  );

  if (!lot) return (
    <PageWrapper>
      <div style={{ textAlign: "center", padding: "80px" }}>
        <p style={{ fontFamily: "DM Mono, monospace", color: "rgba(28,28,26,0.3)" }}>Lot not found.</p>
      </div>
    </PageWrapper>
  );

  const latestScore = lot.cupping_scores?.[0];
  const radarScores = latestScore ? {
    "Fragrance": parseFloat(String(latestScore.fragrance_aroma)),
    "Flavor":    parseFloat(String(latestScore.flavor)),
    "Aftertaste":parseFloat(String(latestScore.aftertaste)),
    "Acidity":   parseFloat(String(latestScore.acidity)),
    "Body":      parseFloat(String(latestScore.body)),
    "Balance":   parseFloat(String(latestScore.balance)),
    "Sweetness": parseFloat(String(latestScore.sweetness)),
    "Overall":   parseFloat(String(latestScore.overall)),
  } : null;

  const gates = [
    { label: "Deforestation-Free Verified", passed: lot.deforestation_free },
    { label: "GPS & Farm Boundary Verified", passed: lot.gps_verified },
    { label: "Phytosanitary Certificate", passed: lot.phyto_cert_uploaded },
    { label: "ECTA Export License Active", passed: lot.ecta_license_active },
    { label: "NBE FX Declaration Filed", passed: lot.nbe_fx_declared },
    { label: "CTA Floor Price Met", passed: lot.cta_floor_met },
    { label: "EUDR DDS Ready", passed: lot.eudr_dds_ready },
  ];

  const inp = {
    background: "#FFFFFF",
    border: "1px solid rgba(28,28,26,0.09)",
    borderRadius: "4px", padding: "9px 12px",
    color: "#1C1C1A", fontFamily: "Instrument Sans, sans-serif",
    fontSize: "0.875rem", outline: "none", width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <PageWrapper>
      {showOffer && lot && <OfferModal lot={lot} onClose={() => setShowOffer(false)} />}

      {/* Back */}
      <button
        onClick={() => navigate("/marketplace")}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "rgba(28,28,26,0.35)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer", marginBottom: "24px", padding: 0 }}
      >
        <ArrowLeft size={14} /> Back to Marketplace
      </button>

      {/* Hero */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "12px" }}>
          <div>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#8B5E3C", textTransform: "uppercase", margin: "0 0 4px" }}>
              {lot.lot_id}
            </p>
            <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.2rem", fontWeight: 400, color: "#1C1C1A", margin: "0 0 8px", lineHeight: 1.1 }}>
              {lot.name}
            </h1>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(28,28,26,0.4)", textTransform: "capitalize" }}>
                <MapPin size={10} /> {lot.region}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(28,28,26,0.4)" }}>
                <Mountain size={10} /> {lot.altitude_m} masl
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(28,28,26,0.4)", textTransform: "capitalize" }}>
                <Calendar size={10} /> {lot.harvest_date}
              </span>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(28,28,26,0.4)", textTransform: "capitalize" }}>
                {lot.processing} · {lot.grade} · {lot.varietal}
              </span>
            </div>
          </div>

          {/* Price + CTA block */}
          <div style={{ background: "#1B4D35", border: "1px solid rgba(28,28,26,0.07)", borderRadius: "8px", padding: "18px 20px", minWidth: "220px" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(28,28,26,0.3)", margin: "0 0 3px", letterSpacing: "0.1em" }}>FOB PRICE / KG</p>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.2rem", fontWeight: 300, color: "#8B5E3C", margin: "0 0 2px", lineHeight: 1 }}>
              {lot.fob_price_usd ? `$${parseFloat(lot.fob_price_usd).toFixed(2)}` : "Price on Request"}
            </p>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.35)", margin: "0 0 14px" }}>
              {lot.available_qty_kg ? `${parseFloat(lot.available_qty_kg).toLocaleString()} kg available` : `${lot.volume_kg} kg`}
              {lot.delivery_window ? ` · ${lot.delivery_window}` : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {isBuyer && (
                <button
                  onClick={() => setShowOffer(true)}
                  style={{ background: "#1B4D35", border: "none", borderRadius: "4px", padding: "10px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
                >
                  <TrendingUp size={14} /> Make an Offer
                </button>
              )}
              {isBuyer && !showSample && (
                <button
                  onClick={() => setShowSample(true)}
                  style={{ background: "transparent", border: "1px solid rgba(192,57,43,0.25)", borderRadius: "4px", padding: "10px", color: "#1B4D35", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
                >
                  <FlaskConical size={14} /> Request Sample
                </button>
              )}
              {lot.eudr_dds_ready && (
                <button
                  onClick={() => downloadEudrDds(lot.id)}
                  style={{ background: "transparent", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "4px", padding: "10px", color: "#A8D5BC", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
                >
                  <Download size={14} /> Download DDS
                </button>
              )}
              <button
                onClick={() => downloadSpecSheet(lot.id, lot.lot_id)}
                style={{ background: "transparent", border: "1px solid rgba(28,28,26,0.1)", borderRadius: "4px", padding: "10px", color: "#8B5E3C", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
              >
                <FileText size={14} /> Download Spec Sheet
              </button>
            </div>
          </div>
        </div>

        {/* Flavor tags */}
        {lot.flavor_tags?.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
            {lot.flavor_tags.map(tag => (
              <span key={tag} style={{ padding: "4px 12px", background: "rgba(74,37,21,0.6)", border: "1px solid rgba(28,28,26,0.1)", borderRadius: "20px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: "rgba(28,28,26,0.5)" }}>
                {tag}
              </span>
            ))}
            {lot.is_organic && <span style={{ padding: "4px 12px", background: "rgba(74,124,89,0.12)", border: "1px solid rgba(74,124,89,0.25)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#2D7A52" }}>Organic</span>}
            {lot.is_fair_trade && <span style={{ padding: "4px 12px", background: "rgba(74,124,89,0.12)", border: "1px solid rgba(74,124,89,0.25)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#2D7A52" }}>Fair Trade</span>}
          </div>
        )}
      </div>

      {/* Sample request inline */}
      {showSample && isBuyer && (
        <div style={{ background: "#1B4D35", border: "1px solid rgba(192,57,43,0.15)", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
          {sampleDone ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <CheckCircle size={20} color="#A8D5BC" />
              <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: "#A8D5BC", margin: 0 }}>Sample request sent successfully.</p>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#1B4D35", letterSpacing: "0.1em", margin: "0 0 12px" }}>REQUEST SAMPLE</p>
              <textarea
                style={{ ...inp, minHeight: "72px", resize: "vertical", marginBottom: "10px" }}
                placeholder="Add a note for the exporter (optional)..."
                value={sampleNote}
                onChange={e => setSampleNote(e.target.value)}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowSample(false)} style={{ background: "transparent", border: "1px solid rgba(28,28,26,0.09)", borderRadius: "4px", padding: "9px 16px", color: "rgba(28,28,26,0.4)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
                <button onClick={() => sampleMutation.mutate()} disabled={sampleMutation.isPending} style={{ background: "#1B4D35", border: "none", borderRadius: "4px", padding: "9px 20px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                  {sampleMutation.isPending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(260px, 320px)", gap: "24px", alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Tasting notes */}
          {lot.tasting_notes && (
            <div style={{ background: "#1B4D35", border: "1px solid rgba(28,28,26,0.05)", borderRadius: "8px", padding: "22px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(28,28,26,0.3)", textTransform: "uppercase", margin: "0 0 12px" }}>Tasting Notes</p>
              <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.9rem", color: "rgba(28,28,26,0.5)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                "{lot.tasting_notes}"
              </p>
            </div>
          )}

          {/* Cupping scores radar */}
          {radarScores && (
            <div style={{ background: "#1B4D35", border: "1px solid rgba(28,28,26,0.05)", borderRadius: "8px", padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(28,28,26,0.3)", textTransform: "uppercase", margin: 0 }}>SCA Cupping Profile</p>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 300, color: "#8B5E3C" }}>
                    {latestScore!.total_score.toFixed(1)}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(28,28,26,0.3)", display: "block" }}>
                    {latestScore!.grader_name && `Q-Grader: ${latestScore!.grader_name}`}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RadarChart scores={radarScores} />
              </div>
              {/* Score breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginTop: "12px" }}>
                {Object.entries(radarScores).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #FFFFFF" }}>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.35)" }}>{k}</span>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#8B5E3C" }}>{v.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Farm story */}
          {lot.farm_story && (
            <div style={{ background: "#1B4D35", border: "1px solid rgba(28,28,26,0.05)", borderRadius: "8px", padding: "22px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(28,28,26,0.3)", textTransform: "uppercase", margin: "0 0 12px" }}>Farm Story</p>
              <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: "rgba(28,28,26,0.5)", lineHeight: 1.75, margin: 0 }}>
                {lot.farm_story}
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* EUDR compliance block */}
          <div style={{ background: "#1B4D35", border: `1px solid ${lot.is_eudr_ready ? "rgba(74,124,89,0.3)" : "rgba(28,28,26,0.05)"}`, borderRadius: "8px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <ShieldCheck size={16} color={lot.is_eudr_ready ? "#A8D5BC" : "rgba(28,28,26,0.25)"} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.12em", color: lot.is_eudr_ready ? "#A8D5BC" : "rgba(28,28,26,0.3)", textTransform: "uppercase" }}>
                {lot.is_eudr_ready ? "EUDR Compliant" : `${lot.compliance_score ?? 0}/7 Gates Passed`}
              </span>
            </div>
            {gates.map(g => <GateRow key={g.label} label={g.label} passed={g.passed} />)}
          </div>

          {/* Lot details */}
          <div style={{ background: "#1B4D35", border: "1px solid rgba(28,28,26,0.05)", borderRadius: "8px", padding: "18px" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(28,28,26,0.3)", textTransform: "uppercase", margin: "0 0 12px" }}>Lot Details</p>
            {[
              ["Region", lot.region],
              ["Processing", lot.processing],
              ["Grade", lot.grade],
              ["Varietal", lot.varietal],
              ["Altitude", `${lot.altitude_m} masl`],
              ["Harvest", lot.harvest_date],
              ["Available", lot.available_qty_kg ? `${parseFloat(lot.available_qty_kg).toLocaleString()} kg` : `${lot.volume_kg} kg`],
              ["Min Order", `${lot.min_order_kg} kg`],
              ["Lot Type", lot.lot_type],
              ["Delivery", lot.delivery_window || "On request"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #FFFFFF" }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.35)" }}>{k}</span>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "rgba(28,28,26,0.5)", textTransform: "capitalize", textAlign: "right", maxWidth: "60%" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Exporter */}
          <div style={{ background: "#1B4D35", border: "1px solid rgba(28,28,26,0.05)", borderRadius: "8px", padding: "18px" }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(28,28,26,0.3)", textTransform: "uppercase", margin: "0 0 10px" }}>Exporter</p>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: "#1C1C1A", margin: "0 0 2px" }}>
              {lot.exporter_company || lot.exporter_name}
            </p>
            {lot.exporter_company && lot.exporter_name && (
              <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: "rgba(28,28,26,0.35)", margin: 0 }}>
                {lot.exporter_name}
              </p>
            )}
          </div>

          {/* Certifications */}
          {(lot.is_organic || lot.is_fair_trade || lot.is_rainforest_alliance) && (
            <div style={{ background: "#1B4D35", border: "1px solid rgba(74,124,89,0.15)", borderRadius: "8px", padding: "18px" }}>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", color: "rgba(28,28,26,0.3)", textTransform: "uppercase", margin: "0 0 10px" }}>Certifications</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {lot.is_organic && <span style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#A8D5BC" }}><Leaf size={12} /> Organic</span>}
                {lot.is_fair_trade && <span style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#A8D5BC" }}><Award size={12} /> Fair Trade</span>}
                {lot.is_rainforest_alliance && <span style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#A8D5BC" }}><Package size={12} /> Rainforest Alliance</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
