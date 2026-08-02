import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLot, createOffer, downloadEudrDds, downloadSpecSheet } from "../api/lots";
import { createSampleRequest } from "../api/samples";
import { useAuth } from "../context/AuthContext";
import AdminShell from "../components/admin/AdminShell";
import {
  ShieldCheck, Mountain, Leaf, FlaskConical, TrendingUp,
  ArrowLeft, Award, CheckCircle, XCircle, Download,
  MapPin, Calendar, Package, X, FileText, Building2, Sprout, Share2,
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";
import { titleCase, formatUsd, formatKg, isBuyerRole } from "../lib/utils";

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
        <polygon key={lvl} points={keys.map((_, i) => { const p = gridPt(i, lvl); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke={AT.color.border} strokeWidth="1" />
      ))}
      {keys.map((_, i) => { const p = gridPt(i, 1); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={AT.color.border} strokeWidth="1" />; })}
      <path d={dataPath} fill="rgba(26,187,156,0.14)" stroke={AT.color.primary} strokeWidth="1.5" />
      {keys.map((k, i) => { const p = pt(i, scores[k] || min); return <circle key={k} cx={p.x} cy={p.y} r="3" fill={AT.color.primary} />; })}
      {keys.map((k, i) => { const a = angle(i); const lx = cx + (r + 18) * Math.cos(a); const ly = cy + (r + 18) * Math.sin(a); return (
        <text key={k} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={AT.color.textMuted} fontFamily={AT.font.sans}>
          {k.replace("_", " ").toUpperCase().slice(0, 6)}
        </text>
      ); })}
    </svg>
  );
}

function GateRow({ label, passed }: { label: string; passed: boolean; key?: string | number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
      {passed ? <CheckCircle size={15} color={AT.color.primary} /> : <XCircle size={15} color={AT.color.red} />}
      <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: passed ? AT.color.text : AT.color.textMuted }}>{label}</span>
      <span style={{ marginLeft: "auto", fontFamily: AT.font.sans, fontSize: "0.68rem", fontWeight: 600, color: passed ? AT.color.primaryDark : AT.color.red }}>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,35,50,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div style={{ ...AC.card, padding: "28px", width: "100%", maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <CheckCircle size={40} color={AT.color.primary} style={{ margin: "0 auto 16px" }} />
            <p style={{ fontFamily: AT.font.sans, fontSize: "1.3rem", fontWeight: 600, color: AT.color.text, margin: "0 0 8px" }}>Offer sent</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.textSecondary, margin: "0 0 20px" }}>The exporter will respond within 48 hours.</p>
            <button onClick={onClose} style={AC.btnPrimary}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <p style={AC.eyebrow}>Make an offer</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.2rem", fontWeight: 600, color: AT.color.text, margin: "4px 0 0" }}>{lot.name}</p>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: AT.color.textMuted }}><X size={18} /></button>
            </div>

            {lot.fob_price_usd && (
              <div style={{ background: AT.color.primaryLight, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: "12px 16px", marginBottom: "18px" }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.primaryDark, margin: "0 0 2px", fontWeight: 600 }}>LISTED FOB PRICE</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.5rem", fontWeight: 700, color: AT.color.text, margin: 0 }}>{formatUsd(lot.fob_price_usd)} / kg</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "18px" }}>
              <div><label style={{ ...AC.eyebrow, display: "block", marginBottom: "6px" }}>Quantity (kg) · min {lot.min_order_kg} kg</label><input style={AC.input} type="number" value={qty} min={lot.min_order_kg} onChange={(e) => setQty(e.target.value)} /></div>
              <div><label style={{ ...AC.eyebrow, display: "block", marginBottom: "6px" }}>Your offer price (USD / kg)</label><input style={AC.input} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 8.50" /></div>
              <div><label style={{ ...AC.eyebrow, display: "block", marginBottom: "6px" }}>Delivery window</label><input style={AC.input} type="text" value={window_} onChange={(e) => setWindow(e.target.value)} placeholder="e.g. Q3 2026" /></div>
              <div><label style={{ ...AC.eyebrow, display: "block", marginBottom: "6px" }}>Notes (optional)</label><textarea style={{ ...AC.input, minHeight: "72px", resize: "vertical" as const }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any specific requirements…" /></div>
            </div>

            {qty && price && (
              <div style={{ background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: "12px 16px", marginBottom: "18px" }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>TOTAL OFFER VALUE</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.6rem", fontWeight: 700, color: AT.color.text, margin: 0 }}>{formatUsd(parseFloat(qty) * parseFloat(price))}</p>
              </div>
            )}

            {mutation.isError && <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.red, marginBottom: "12px", fontWeight: 500 }}>Failed to send offer. Please try again.</p>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={onClose} style={{ flex: 1, ...AC.btnGhost, justifyContent: "center" }}>Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={!qty || !price || mutation.isPending} style={{ flex: 2, ...AC.btnPrimary, justifyContent: "center", opacity: !qty || !price ? 0.5 : 1 }}>
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

  const canTransact = isAuthenticated && (isBuyerRole(user?.role) || user?.role === "admin");

  useEffect(() => {
    if (!canTransact) return;
    if (searchParams.get("offer") === "1") setShowOffer(true);
    if (searchParams.get("sample") === "1") setShowSample(true);
  }, [searchParams, canTransact]);

  if (isLoading) return (
    <AdminShell>
      <div style={{ padding: "96px 0", textAlign: "center" }}><p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading lot…</p></div>
    </AdminShell>
  );
  if (!lot) return (
    <AdminShell>
      <div style={{ padding: "96px 0", textAlign: "center" }}><p style={{ fontFamily: AT.font.sans, color: AT.color.textMuted }}>Lot not found.</p></div>
    </AdminShell>
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
    <AdminShell>
      {showOffer && <OfferModal lot={lot} onClose={() => setShowOffer(false)} />}

      <button onClick={() => navigate("/marketplace")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: AT.color.textMuted, fontFamily: AT.font.sans, fontSize: "0.82rem", cursor: "pointer", padding: 0, marginBottom: "16px" }}>
        <ArrowLeft size={14} /> Back to marketplace
      </button>

      {/* Header */}
      <div style={{ ...AC.card, marginBottom: "20px", overflow: "hidden" }}>
        <div style={{ height: "4px", background: lot.export_ready ? AT.color.primary : AT.color.yellow }} />
        <div style={{ padding: "20px 24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "16px" }}>
          <div>
            <span style={{ fontFamily: AT.font.mono, fontSize: "0.72rem", color: AT.color.textMuted }}>{lot.lot_id}</span>
            <h1 style={{ ...AC.pageTitle, marginTop: "4px", fontSize: "1.7rem" }}>{lot.name}</h1>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "10px" }}>
              <Meta icon={<MapPin size={13} />} text={`${titleCase(lot.region)}, Ethiopia`} />
              <Meta icon={<Mountain size={13} />} text={`${lot.altitude_m} masl`} />
              <Meta icon={<Sprout size={13} />} text={`${titleCase(lot.processing)} · ${lot.grade}`} />
              <Meta icon={<Calendar size={13} />} text={lot.harvest_date} />
            </div>
          </div>
          {score != null && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontFamily: AT.font.sans, fontSize: "2.4rem", fontWeight: 700, color: AT.color.primaryDark, margin: 0, lineHeight: 1 }}>{score.toFixed(1)}</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textMuted, margin: "4px 0 0", fontWeight: 500 }}>SCA SCORE</p>
            </div>
          )}
        </div>
      </div>

      <div className="ml-story" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 0.9fr)", gap: "20px", alignItems: "start" }}>
        {/* Left — story */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
          {(lot.flavor_tags?.length > 0 || lot.tasting_notes) && (
            <section style={{ ...AC.card, ...AC.cardPad }}>
              <p style={AC.eyebrow}>Flavor profile</p>
              {lot.flavor_tags?.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                  {lot.flavor_tags.map((tag) => <span key={tag} style={{ padding: "4px 12px", borderRadius: AT.radius.pill, background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.text }}>{tag}</span>)}
                </div>
              )}
              {lot.tasting_notes && (
                <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", fontStyle: "italic", color: AT.color.text, lineHeight: 1.55, margin: "14px 0 0" }}>"{lot.tasting_notes}"</p>
              )}
            </section>
          )}

          {lot.farm_story && (
            <section style={{ ...AC.card, ...AC.cardPad }}>
              <p style={AC.eyebrow}>The farm</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.9rem", color: AT.color.textSecondary, lineHeight: 1.65, margin: "12px 0 0" }}>{lot.farm_story}</p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
                {lot.washing_station && <Fact label="Station" value={lot.washing_station} />}
                {lot.kebele && <Fact label="Kebele" value={lot.kebele} />}
                {lot.varietal && <Fact label="Varietal" value={lot.varietal} />}
              </div>
            </section>
          )}

          {radarScores && (
            <section style={{ ...AC.card, ...AC.cardPad }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={AC.eyebrow}>SCA cupping profile</p>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "1.5rem", fontWeight: 700, color: AT.color.primaryDark }}>{latestScore!.total_score.toFixed(1)}</span>
                  {latestScore!.grader_name && <span style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textMuted, display: "block" }}>Q-Grader: {latestScore!.grader_name}</span>}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}><RadarChart scores={radarScores} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 20px", marginTop: "12px" }}>
                {Object.entries(radarScores).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
                    <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textMuted }}>{k}</span>
                    <span style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", fontWeight: 600, color: AT.color.text }}>{v.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section style={{ ...AC.card, ...AC.cardPad, borderColor: lot.is_eudr_ready ? AT.color.primary : AT.color.border }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <ShieldCheck size={17} color={lot.is_eudr_ready ? AT.color.primary : AT.color.textDisabled} />
              <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", fontWeight: 600, color: lot.is_eudr_ready ? AT.color.primaryDark : AT.color.textMuted }}>
                {lot.is_eudr_ready ? "EUDR compliant — Green Passport ready" : `${lot.compliance_score ?? 0}/7 gates passed`}
              </span>
            </div>
            {gates.map((g) => <GateRow key={g.label} label={g.label} passed={g.passed} />)}
          </section>
        </div>

        {/* Right — action panel */}
        <div style={{ position: "sticky", top: `calc(${AT.spacing.topbarH} + 16px)`, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textDisabled, margin: "0 0 3px" }}>FOB PRICE / KG</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "2rem", fontWeight: 700, color: AT.color.text, margin: "0 0 4px", lineHeight: 1 }}>
              {lot.fob_price_usd ? formatUsd(lot.fob_price_usd) : "On request"}
            </p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, margin: "0 0 16px" }}>
              {formatKg(lot.available_qty_kg || lot.volume_kg)} available{lot.delivery_window ? ` · ${lot.delivery_window}` : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {canTransact && (
                <button onClick={() => setShowOffer(true)} style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center" }}>
                  <TrendingUp size={15} /> Make an offer
                </button>
              )}
              {canTransact && !showSample && (
                <button onClick={() => setShowSample(true)} style={{ ...AC.btnGhost, width: "100%", justifyContent: "center" }}>
                  <FlaskConical size={15} /> Request a sample
                </button>
              )}
              {lot.eudr_dds_ready && (
                <button onClick={() => downloadEudrDds(lot.id)} style={{ ...AC.btnSm, width: "100%", justifyContent: "center", padding: "10px" }}>
                  <Download size={14} /> Download EUDR DDS
                </button>
              )}
              <button onClick={() => downloadSpecSheet(lot.id, lot.lot_id)} style={{ ...AC.btnSm, width: "100%", justifyContent: "center", padding: "10px" }}>
                <FileText size={14} /> Download spec sheet
              </button>
              {(lot.status === "listed" || lot.status === "contracted" || lot.status === "exported") && (
                <button onClick={() => window.open(`/story/${lot.id}`, "_blank", "noopener,noreferrer")} style={{ ...AC.btnSm, width: "100%", justifyContent: "center", padding: "10px" }}>
                  <Share2 size={14} /> Share public lot story
                </button>
              )}
            </div>

            {showSample && (
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${AT.color.borderLight}` }}>
                {sampleDone ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <CheckCircle size={18} color={AT.color.primary} />
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.primaryDark, margin: 0, fontWeight: 600 }}>Sample request sent.</p>
                  </div>
                ) : (
                  <>
                    <label style={{ ...AC.eyebrow, display: "block", marginBottom: "6px" }}>Note to exporter (optional)</label>
                    <textarea style={{ ...AC.input, minHeight: "72px", marginBottom: "10px", resize: "vertical" as const }} placeholder="Tell them about your roastery…" value={sampleNote} onChange={(e) => setSampleNote(e.target.value)} />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setShowSample(false)} style={{ ...AC.btnGhost, flex: 1, justifyContent: "center", padding: "9px" }}>Cancel</button>
                      <button onClick={() => sampleMutation.mutate()} disabled={sampleMutation.isPending} style={{ ...AC.btnPrimary, flex: 1, justifyContent: "center", padding: "9px" }}>
                        {sampleMutation.isPending ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={AC.eyebrow}>Lot details</p>
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
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
                <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textDisabled }}>{k}</span>
                <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text, textAlign: "right", maxWidth: "60%", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={AC.eyebrow}>Exporter</p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "10px" }}>
              <span style={{ width: "40px", height: "40px", borderRadius: AT.radius.md, background: AT.color.primaryLight, color: AT.color.primaryDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Building2 size={18} /></span>
              <div>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", fontWeight: 600, color: AT.color.text, margin: 0 }}>{lot.exporter_company || lot.exporter_name}</p>
                {lot.exporter_company && lot.exporter_name && <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, margin: "2px 0 0" }}>{lot.exporter_name}</p>}
              </div>
            </div>
          </div>

          {(lot.is_organic || lot.is_fair_trade || lot.is_rainforest_alliance) && (
            <div style={{ ...AC.card, ...AC.cardPad }}>
              <p style={AC.eyebrow}>Certifications</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {lot.is_organic && <Cert icon={<Leaf size={13} />} label="Organic" />}
                {lot.is_fair_trade && <Cert icon={<Award size={13} />} label="Fair Trade" />}
                {lot.is_rainforest_alliance && <Cert icon={<Package size={13} />} label="Rainforest Alliance" />}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 900px){ .ml-story { grid-template-columns: 1fr !important; } .ml-story > div:last-child { position: static !important; } }`}</style>
    </AdminShell>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textSecondary }}>{icon} {text}</span>;
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: "2px", padding: "8px 14px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md }}>
      <span style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.04em", color: AT.color.textDisabled }}>{label}</span>
      <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text, fontWeight: 500 }}>{value}</span>
    </span>
  );
}
function Cert({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.primaryDark, fontWeight: 600 }}>{icon} {label}</span>;
}
