import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLot, createOffer, downloadEudrDds, downloadSpecSheet } from "../api/lots";
import { createSampleRequest } from "../api/samples";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/AppShell";
import {
  ShieldCheck, Mountain, Leaf, FlaskConical, TrendingUp,
  ArrowLeft, Award, CheckCircle, XCircle, Download,
  MapPin, Calendar, Package, X, FileText, Building2, Sprout, Share2,
} from "lucide-react";
import { T } from "../styles/tokens";
import { CS } from "../styles/components";
import { originGradient, titleCase, formatUsd, formatKg } from "../lib/utils";

// ── Radar chart (pure SVG) ────────────────────────────────────────────────────
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const keys = Object.keys(scores);
  const n = keys.length;
  const cx = 110, cy = 110, r = 80;
  const max = 10, min = 6;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, val: number) => { const ratio = (val - min) / (max - min); const a = angle(i); return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) }; };
  const gridPt = (i: number, ratio: number) => { const a = angle(i); return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) }; };
  const dataPath = keys.map((k, i) => { const p = pt(i, scores[k] || min); return `${i === 0 ? "M" : "L"}${p.x},${p.y}`; }).join(" ") + "Z";
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon key={lvl} points={keys.map((_, i) => { const p = gridPt(i, lvl); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke={T.color.border} strokeWidth="1" />
      ))}
      {keys.map((_, i) => { const p = gridPt(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={T.color.border} strokeWidth="1" />; })}
      <path d={dataPath} fill="rgba(214,137,44,0.16)" stroke={T.color.amber} strokeWidth="1.5" />
      {keys.map((k, i) => { const p = pt(i, scores[k] || min); return <circle key={k} cx={p.x} cy={p.y} r="3" fill={T.color.amber} />; })}
      {keys.map((k, i) => { const a = angle(i); const lx = cx + (r + 18) * Math.cos(a); const ly = cy + (r + 18) * Math.sin(a); return (
        <text key={k} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={T.color.textMuted} fontFamily={T.font.mono}>
          {k.replace("_", " ").toUpperCase().slice(0, 6)}
        </text>
      ); })}
    </svg>
  );
}

function GateRow({ label, passed }: { label: string; passed: boolean; key?: string | number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: `1px solid ${T.color.border}` }}>
      {passed ? <CheckCircle size={15} color={T.color.forest} /> : <XCircle size={15} color={T.color.red} />}
      <span style={{ fontFamily: T.font.sans, fontSize: "0.875rem", color: passed ? T.color.ink : T.color.textFaint }}>{label}</span>
      <span style={{ marginLeft: "auto", fontFamily: T.font.mono, fontSize: "0.58rem", letterSpacing: "0.06em", color: passed ? T.color.forest : T.color.red, fontWeight: 600 }}>
        {passed ? "PASS" : "PENDING"}
      </span>
    </div>
  );
}

// ── Offer modal ───────────────────────────────────────────────────────────────
function OfferModal({ lot, onClose }: { lot: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState(lot.min_order_kg || "300");
  const [price, setPrice] = useState(lot.fob_price_usd || "");
  const [window_, setWindow] = useState(lot.delivery_window || "");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createOffer({ lot: lot.id, quantity_kg: parseFloat(qty), price_per_kg_usd: parseFloat(price), delivery_window: window_, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); setDone(true); },
  });

  return (
    <div style={CS.modalOverlay} onClick={onClose}>
      <div style={CS.modalBox} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircle size={40} color={T.color.forest} style={{ margin: "0 auto 16px" }} />
            <p style={{ fontFamily: T.font.display, fontSize: "1.5rem", color: T.color.ink, margin: "0 0 8px" }}>Offer sent</p>
            <p style={{ fontFamily: T.font.sans, fontSize: "0.9rem", color: T.color.textMuted, margin: "0 0 20px" }}>The exporter will respond within 48 hours.</p>
            <button onClick={onClose} style={CS.btnPrimary}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <span style={CS.kicker}>Make an offer</span>
                <p style={{ fontFamily: T.font.display, fontSize: "1.4rem", color: T.color.ink, margin: "6px 0 0", fontWeight: 500 }}>{lot.name}</p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.color.textGhost, padding: "4px" }}><X size={18} /></button>
            </div>

            {lot.fob_price_usd && (
              <div style={{ background: T.color.amberLight, border: `1px solid ${T.color.border}`, borderRadius: T.radius.md, padding: "12px 16px", marginBottom: "18px" }}>
                <p style={{ fontFamily: T.font.mono, fontSize: "0.6rem", color: T.color.amber, margin: "0 0 2px", letterSpacing: "0.08em" }}>LISTED FOB PRICE</p>
                <p style={{ fontFamily: T.font.display, fontSize: "1.6rem", color: T.color.ink, margin: 0, fontWeight: 500 }}>{formatUsd(lot.fob_price_usd)} / kg</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
              <div><label style={CS.label}>Quantity (kg) · min {lot.min_order_kg} kg</label><input style={CS.input} type="number" value={qty} min={lot.min_order_kg} onChange={(e) => setQty(e.target.value)} /></div>
              <div><label style={CS.label}>Your offer price (USD / kg)</label><input style={CS.input} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 8.50" /></div>
              <div><label style={CS.label}>Delivery window</label><input style={CS.input} type="text" value={window_} onChange={(e) => setWindow(e.target.value)} placeholder="e.g. Q3 2026" /></div>
              <div><label style={CS.label}>Notes (optional)</label><textarea style={CS.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any specific requirements…" /></div>
            </div>

            {qty && price && (
              <div style={{ background: T.color.paper, border: `1px solid ${T.color.border}`, borderRadius: T.radius.md, padding: "12px 16px", marginBottom: "18px" }}>
                <p style={{ fontFamily: T.font.mono, fontSize: "0.6rem", color: T.color.textGhost, margin: "0 0 3px", letterSpacing: "0.08em" }}>TOTAL OFFER VALUE</p>
                <p style={{ fontFamily: T.font.display, fontSize: "1.7rem", color: T.color.ink, margin: 0, fontWeight: 500 }}>
                  {formatUsd(parseFloat(qty) * parseFloat(price))}
                </p>
              </div>
            )}

            {mutation.isError && <p style={{ fontFamily: T.font.sans, fontSize: "0.85rem", color: T.color.red, marginBottom: "12px", fontWeight: 500 }}>Failed to send offer. Please try again.</p>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onClose} style={{ flex: 1, ...CS.btnGhost }}>Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!qty || !price || mutation.isPending} style={{ flex: 2, ...CS.btnPrimary, opacity: !qty || !price ? 0.5 : 1 }}>
                {mutation.isPending ? "Sending…" : "Send offer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketplaceLotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const [showOffer, setShowOffer] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [sampleDone, setSampleDone] = useState(false);
  const [sampleNote, setSampleNote] = useState("");

  const { data: lot, isLoading } = useQuery({ queryKey: ["lot", id], queryFn: () => getLot(id!), enabled: !!id });

  const sampleMutation = useMutation({
    mutationFn: () => createSampleRequest({ lot: id!, message: sampleNote, quantity_g: 200, shipping_address: "" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["samples"] }); setSampleDone(true); },
  });

  const canTransact = isAuthenticated && (user?.role === "buyer" || user?.role === "admin");
  const showBuyerCta = !isAuthenticated || canTransact;

  const loginNext = (suffix: string) => navigate(`/login?next=${encodeURIComponent(`/marketplace/${id}${suffix}`)}`);
  const onOffer = () => { if (!isAuthenticated) return loginNext("?offer=1"); setShowOffer(true); };
  const onSample = () => { if (!isAuthenticated) return loginNext("?sample=1"); setShowSample(true); };

  // Auto-open modals when returning from login with ?offer/?sample=1 (buyers only).
  useEffect(() => {
    if (!canTransact) return;
    if (searchParams.get("offer") === "1") setShowOffer(true);
    if (searchParams.get("sample") === "1") setShowSample(true);
  }, [searchParams, canTransact]);

  if (isLoading) return (
    <AppShell footer>
      <div className="container-editorial" style={{ padding: "96px 0", textAlign: "center" }}>
        <p style={{ fontFamily: T.font.mono, fontSize: "0.8rem", color: T.color.textFaint }}>Loading lot…</p>
      </div>
    </AppShell>
  );

  if (!lot) return (
    <AppShell footer>
      <div className="container-editorial" style={{ padding: "96px 0", textAlign: "center" }}>
        <p style={{ fontFamily: T.font.mono, color: T.color.textFaint }}>Lot not found.</p>
      </div>
    </AppShell>
  );

  const score = lot.latest_sca_score ?? (typeof lot.sca_score === "number" ? lot.sca_score : null);
  const latestScore = lot.cupping_scores?.[0];
  const radarScores = latestScore ? {
    Fragrance: parseFloat(String(latestScore.fragrance_aroma)),
    Flavor: parseFloat(String(latestScore.flavor)),
    Aftertaste: parseFloat(String(latestScore.aftertaste)),
    Acidity: parseFloat(String(latestScore.acidity)),
    Body: parseFloat(String(latestScore.body)),
    Balance: parseFloat(String(latestScore.balance)),
    Sweetness: parseFloat(String(latestScore.sweetness)),
    Overall: parseFloat(String(latestScore.overall)),
  } : null;

  const gates = [
    { label: "Deforestation-free verified", passed: lot.deforestation_free },
    { label: "GPS & farm boundary verified", passed: lot.gps_verified },
    { label: "Phytosanitary certificate", passed: lot.phyto_cert_uploaded },
    { label: "ECTA export license active", passed: lot.ecta_license_active },
    { label: "NBE FX declaration filed", passed: lot.nbe_fx_declared },
    { label: "CTA floor price met", passed: lot.cta_floor_met },
    { label: "EUDR DDS ready", passed: lot.eudr_dds_ready },
  ];

  return (
    <AppShell footer>
      {showOffer && <OfferModal lot={lot} onClose={() => setShowOffer(false)} />}

      {/* Hero banner */}
      <section style={{ position: "relative", background: originGradient(lot.region), overflow: "hidden" }}>
        <svg viewBox="0 0 400 400" aria-hidden style={{ position: "absolute", right: "-40px", top: "-60px", width: "360px", opacity: 0.14 }}>
          <path d="M200 40c80-16 128 32 120 112-72 0-128-40-120-112Z" fill="#FFFFFF" />
        </svg>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,20,15,0.35), transparent 70%)" }} />
        <div className="container-editorial" style={{ position: "relative", paddingTop: "28px", paddingBottom: "48px" }}>
          <button onClick={() => navigate("/marketplace")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.24)", color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "0.82rem", cursor: "pointer", padding: "7px 14px", borderRadius: "999px", marginBottom: "28px" }}>
            <ArrowLeft size={14} /> Back to marketplace
          </button>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "24px" }}>
            <div style={{ maxWidth: "640px" }}>
              <span style={{ fontFamily: T.font.mono, fontSize: "0.66rem", letterSpacing: "0.14em", color: "rgba(255,255,255,0.85)" }}>{lot.lot_id}</span>
              <h1 style={{ fontFamily: T.font.display, fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 400, color: "#FFFFFF", margin: "10px 0 0", lineHeight: 1.03, letterSpacing: "-0.01em" }}>{lot.name}</h1>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
                <Meta icon={<MapPin size={13} />} text={`${titleCase(lot.region)}, Ethiopia`} />
                <Meta icon={<Mountain size={13} />} text={`${lot.altitude_m} masl`} />
                <Meta icon={<Sprout size={13} />} text={`${titleCase(lot.processing)} · ${lot.grade}`} />
                <Meta icon={<Calendar size={13} />} text={lot.harvest_date} />
              </div>
            </div>
            {score != null && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: T.font.display, fontSize: "clamp(3rem, 7vw, 4.5rem)", fontWeight: 400, color: "#FFFFFF", margin: 0, lineHeight: 1 }}>{score.toFixed(1)}</p>
                <p style={{ fontFamily: T.font.mono, fontSize: "0.62rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.8)", margin: "4px 0 0" }}>SCA SCORE</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="container-editorial" style={{ paddingTop: "40px", paddingBottom: "24px" }}>
        <div className="bb-story" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 0.9fr)", gap: "40px", alignItems: "start" }}>
          {/* Left — story */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px", minWidth: 0 }}>
            {/* Flavor profile */}
            {(lot.flavor_tags?.length > 0 || lot.tasting_notes) && (
              <section>
                <span style={CS.kicker}>Flavor profile</span>
                {lot.flavor_tags?.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                    {lot.flavor_tags.map((tag) => <span key={tag} style={CS.chip}>{tag}</span>)}
                  </div>
                )}
                {lot.tasting_notes && (
                  <p style={{ fontFamily: T.font.display, fontSize: "1.4rem", fontWeight: 400, fontStyle: "italic", color: T.color.ink, lineHeight: 1.5, margin: "18px 0 0" }}>
                    “{lot.tasting_notes}”
                  </p>
                )}
              </section>
            )}

            {/* Farm story */}
            {lot.farm_story && (
              <section>
                <span style={CS.kicker}>The farm</span>
                <p style={{ fontFamily: T.font.sans, fontSize: "1.05rem", color: T.color.textMuted, lineHeight: 1.75, margin: "14px 0 0" }}>{lot.farm_story}</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
                  {lot.washing_station && <Fact label="Station" value={lot.washing_station} />}
                  {lot.kebele && <Fact label="Kebele" value={lot.kebele} />}
                  {lot.varietal && <Fact label="Varietal" value={lot.varietal} />}
                </div>
              </section>
            )}

            {/* Cupping */}
            {radarScores && (
              <section style={CS.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={CS.kicker}>SCA cupping profile</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: T.font.display, fontSize: "2rem", fontWeight: 500, color: T.color.forest }}>{latestScore!.total_score.toFixed(1)}</span>
                    {latestScore!.grader_name && <span style={{ fontFamily: T.font.mono, fontSize: "0.58rem", color: T.color.textFaint, display: "block" }}>Q-Grader: {latestScore!.grader_name}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}><RadarChart scores={radarScores} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 20px", marginTop: "12px" }}>
                  {Object.entries(radarScores).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.color.border}` }}>
                      <span style={{ fontFamily: T.font.mono, fontSize: "0.62rem", color: T.color.textGhost }}>{k}</span>
                      <span style={{ fontFamily: T.font.mono, fontSize: "0.68rem", color: T.color.clay, fontWeight: 600 }}>{v.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Traceability */}
            <section style={{ ...CS.card, borderColor: lot.is_eudr_ready ? T.color.forest : T.color.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <ShieldCheck size={17} color={lot.is_eudr_ready ? T.color.forest : T.color.textGhost} />
                <span style={{ fontFamily: T.font.mono, fontSize: "0.66rem", letterSpacing: "0.12em", color: lot.is_eudr_ready ? T.color.forest : T.color.textFaint, textTransform: "uppercase", fontWeight: 600 }}>
                  {lot.is_eudr_ready ? "EUDR compliant — Green Passport ready" : `${lot.compliance_score ?? 0}/7 gates passed`}
                </span>
              </div>
              {gates.map((g) => <GateRow key={g.label} label={g.label} passed={g.passed} />)}
            </section>
          </div>

          {/* Right — sticky action + details */}
          <div style={{ position: "sticky", top: "calc(var(--header-height) + 20px)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={CS.card}>
              <p style={{ fontFamily: T.font.mono, fontSize: "0.56rem", letterSpacing: "0.1em", color: T.color.textGhost, margin: "0 0 3px" }}>FOB PRICE / KG</p>
              <p style={{ fontFamily: T.font.display, fontSize: "2.4rem", fontWeight: 500, color: T.color.ink, margin: "0 0 4px", lineHeight: 1 }}>
                {lot.fob_price_usd ? formatUsd(lot.fob_price_usd) : "On request"}
              </p>
              <p style={{ fontFamily: T.font.mono, fontSize: "0.66rem", color: T.color.textFaint, margin: "0 0 16px" }}>
                {formatKg(lot.available_qty_kg || lot.volume_kg)} available{lot.delivery_window ? ` · ${lot.delivery_window}` : ""}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {showBuyerCta && (
                  <button onClick={onOffer} style={{ ...CS.btnPrimary, width: "100%" }}>
                    <TrendingUp size={15} /> {isAuthenticated ? "Make an offer" : "Sign in to offer"}
                  </button>
                )}
                {showBuyerCta && !showSample && (
                  <button onClick={onSample} style={{ ...CS.btnGhost, width: "100%" }}>
                    <FlaskConical size={15} /> Request a sample
                  </button>
                )}
                {lot.eudr_dds_ready && (
                  <button onClick={() => downloadEudrDds(lot.id)} style={{ ...CS.btnSmall, width: "100%", padding: "10px" }}>
                    <Download size={14} /> Download EUDR DDS
                  </button>
                )}
                <button onClick={() => downloadSpecSheet(lot.id, lot.lot_id)} style={{ ...CS.btnSmall, width: "100%", padding: "10px" }}>
                  <FileText size={14} /> Download spec sheet
                </button>
                {(lot.status === "listed" || lot.status === "contracted" || lot.status === "exported") && (
                  <button onClick={() => window.open(`/story/${lot.id}`, "_blank", "noopener,noreferrer")} style={{ ...CS.btnSmall, width: "100%", padding: "10px" }}>
                    <Share2 size={14} /> Share public lot story
                  </button>
                )}
              </div>

              {/* Inline sample form */}
              {showSample && (
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${T.color.border}` }}>
                  {sampleDone ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle size={18} color={T.color.forest} />
                      <p style={{ fontFamily: T.font.sans, fontSize: "0.85rem", color: T.color.forest, margin: 0, fontWeight: 600 }}>Sample request sent.</p>
                    </div>
                  ) : (
                    <>
                      <label style={CS.label}>Note to exporter (optional)</label>
                      <textarea style={{ ...CS.textarea, minHeight: "72px", marginBottom: "10px" }} placeholder="Tell them about your roastery…" value={sampleNote} onChange={(e) => setSampleNote(e.target.value)} />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setShowSample(false)} style={{ ...CS.btnGhost, flex: 1, padding: "9px" }}>Cancel</button>
                        <button onClick={() => sampleMutation.mutate()} disabled={sampleMutation.isPending} style={{ ...CS.btnPrimary, flex: 1, padding: "9px" }}>
                          {sampleMutation.isPending ? "Sending…" : "Send"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Details */}
            <div style={CS.card}>
              <p style={{ ...CS.cardTitle }}>Lot details</p>
              {([
                ["Region", titleCase(lot.region)],
                ["Processing", titleCase(lot.processing)],
                ["Grade", lot.grade],
                ["Varietal", lot.varietal],
                ["Altitude", `${lot.altitude_m} masl`],
                ["Harvest", lot.harvest_date],
                ["Min order", `${lot.min_order_kg} kg`],
                ["Lot type", titleCase(lot.lot_type)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.color.border}` }}>
                  <span style={{ fontFamily: T.font.mono, fontSize: "0.62rem", color: T.color.textGhost }}>{k}</span>
                  <span style={{ fontFamily: T.font.sans, fontSize: "0.82rem", color: T.color.ink, textAlign: "right", maxWidth: "60%", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Exporter */}
            <div style={CS.card}>
              <p style={{ ...CS.cardTitle }}>Exporter</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ width: "40px", height: "40px", borderRadius: T.radius.md, background: T.color.forestLight, color: T.color.forest, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Building2 size={18} /></span>
                <div>
                  <p style={{ fontFamily: T.font.display, fontSize: "1.1rem", color: T.color.ink, margin: 0, fontWeight: 500 }}>{lot.exporter_company || lot.exporter_name}</p>
                  {lot.exporter_company && lot.exporter_name && <p style={{ fontFamily: T.font.sans, fontSize: "0.8rem", color: T.color.textFaint, margin: "2px 0 0" }}>{lot.exporter_name}</p>}
                </div>
              </div>
            </div>

            {/* Certifications */}
            {(lot.is_organic || lot.is_fair_trade || lot.is_rainforest_alliance) && (
              <div style={CS.card}>
                <p style={{ ...CS.cardTitle }}>Certifications</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {lot.is_organic && <Cert icon={<Leaf size={13} />} label="Organic" />}
                  {lot.is_fair_trade && <Cert icon={<Award size={13} />} label="Fair Trade" />}
                  {lot.is_rainforest_alliance && <Cert icon={<Package size={13} />} label="Rainforest Alliance" />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 900px){ .bb-story { grid-template-columns: 1fr !important; } .bb-story > div:last-child { position: static !important; } }`}</style>
    </AppShell>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: T.font.sans, fontSize: "0.85rem", color: "rgba(255,255,255,0.92)" }}>
      {icon} {text}
    </span>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ ...CS.cardInner, display: "inline-flex", flexDirection: "column", gap: "2px", padding: "8px 14px" }}>
      <span style={{ fontFamily: T.font.mono, fontSize: "0.54rem", letterSpacing: "0.08em", textTransform: "uppercase", color: T.color.textGhost }}>{label}</span>
      <span style={{ fontFamily: T.font.sans, fontSize: "0.85rem", color: T.color.ink, fontWeight: 500 }}>{value}</span>
    </span>
  );
}
function Cert({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: T.font.sans, fontSize: "0.85rem", color: T.color.forest, fontWeight: 600 }}>{icon} {label}</span>;
}
