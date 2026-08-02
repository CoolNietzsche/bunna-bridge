import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, MapPin, Leaf, FileCheck2, ScanLine,
  ShieldCheck, Landmark, BadgeCheck, CheckCircle2,
} from "lucide-react";
import AppShell from "../components/AppShell";
import OriginCard from "../components/market/OriginCard";
import Reveal from "../components/Reveal";
import { SELECTIONS, STATIC_ORIGINS } from "../lib/catalog";
import { T } from "../styles/tokens";
import heroImage from "../assets/landing/hero.webp";
import ctaBandImage from "../assets/landing/cta-band.webp";
import originYirgacheffe from "../assets/landing/origin-yirgacheffe.webp";
import originGuji from "../assets/landing/origin-guji.webp";
import originSidama from "../assets/landing/origin-sidama.webp";
import originHarrar from "../assets/landing/origin-harrar.webp";
import cuppingDetailImage from "../assets/landing/cupping-detail.webp";

const ORIGIN_IMAGES: Record<string, string> = {
  yirgacheffe: originYirgacheffe,
  guji: originGuji,
  sidama: originSidama,
  harrar: originHarrar,
};

// The marketplace list requires auth on this deployment, and this page is
// only ever shown to anonymous visitors (authenticated users are redirected
// to /dashboard before reaching here — see App.tsx's RootRoute). So this
// page intentionally makes no live API calls: no fabricated counts, no
// guaranteed-to-401 requests. "Explore" links to /marketplace, which
// ProtectedRoute naturally bounces to /login?next=/marketplace. The "7
// gates / 3 frameworks / 1 passport" figures below are structural facts
// about the compliance pipeline (see CLAUDE.md), not live metrics.
export default function Landing() {
  const navigate = useNavigate();

  return (
    <AppShell footer>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${T.color.border}` }}>
        <TopographicMark
          style={{ position: "absolute", top: "-18%", right: "-14%", width: "min(60vw, 720px)" }}
          strokeA="var(--color-forest-light)"
          strokeB="var(--color-border)"
        />
        <div className="container-editorial" style={{ position: "relative", paddingTop: "clamp(72px, 11vw, 152px)", paddingBottom: "clamp(64px, 9vw, 108px)" }}>
          <div className="bb-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "48px", alignItems: "center" }}>
            <div>
              <Reveal>
                <span style={kicker}>Farm boundary → FOB, fully traceable</span>
              </Reveal>
              <Reveal delay={90}>
                <h1 style={{ fontFamily: T.font.display, fontSize: "clamp(2.9rem, 5.6vw, 4.6rem)", fontWeight: 400, lineHeight: 0.98, letterSpacing: "-0.025em", color: T.color.ink, margin: "22px 0 0" }}>
                  Ethiopian specialty coffee,<br />
                  <em style={{ fontStyle: "italic", color: T.color.forest }}>traceable to the tree.</em>
                </h1>
              </Reveal>
              <Reveal delay={170}>
                <p style={{ fontFamily: T.font.sans, fontSize: "clamp(1.05rem, 1.6vw, 1.2rem)", lineHeight: 1.65, color: T.color.textMuted, margin: "26px 0 0", maxWidth: "48ch" }}>
                  Beersheba connects farmers, exporters and roasters through a single
                  compliance pipeline — EUDR, ECTA and NBE — so every micro-lot carries
                  its own verified origin story, from GPS boundary to bill of lading.
                </p>
              </Reveal>
              <Reveal delay={250}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", marginTop: "36px" }}>
                  <button className="bb-cta" onClick={() => navigate("/marketplace")} style={primaryBtn}>
                    Explore the coffees <ArrowRight size={17} className="bb-cta-icon" />
                  </button>
                  <a href="#pipeline" style={ghostBtn}>How it works</a>
                </div>
              </Reveal>
            </div>

            <Reveal delay={140} className="bb-hero-image" style={{ position: "relative" }}>
              <div style={{ position: "relative", borderRadius: T.radius.xl, overflow: "hidden", boxShadow: T.shadow.hover, aspectRatio: "4 / 5" }}>
                <img
                  src={heroImage}
                  alt="Terraced highland coffee farm in Yirgacheffe, Ethiopia, at dawn"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            </Reveal>
          </div>

          <Reveal delay={340}>
            <div className="bb-proof-strip" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", marginTop: "64px", paddingTop: "22px", borderTop: `1px solid ${T.color.border}` }}>
              {["EUDR", "ECTA", "NBE", "SCA Q-grading", "GPS boundaries"].map((label, i) => (
                <span key={label} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && <span aria-hidden style={{ width: "1px", height: "12px", background: T.color.border, margin: "0 18px" }} />}
                  <span style={{ fontFamily: T.font.mono, fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: T.color.textFaint }}>
                    {label}
                  </span>
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── The pipeline ─────────────────────────────────────── */}
      <section id="pipeline" className="container-editorial" style={{ paddingTop: "96px", scrollMarginTop: "90px" }}>
        <div className="bb-pipeline-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "32px" }}>
          <Reveal style={{ flex: 1 }}>
            <SectionHead kicker="The pipeline" title="Seven gates to a Green Passport" sub="Every lot is scored against seven independent compliance checks before it can list. Pass all seven, and it earns a verifiable Green Passport." />
          </Reveal>
          <Reveal delay={100} className="bb-pipeline-image" style={{ flexShrink: 0 }}>
            <div style={{ width: "180px", borderRadius: T.radius.lg, overflow: "hidden", boxShadow: T.shadow.card, aspectRatio: "4 / 3" }}>
              <img
                src={cuppingDetailImage}
                alt="A Q-grader arranging cupping bowls at a wooden cupping table"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </Reveal>
        </div>

        <div style={{ position: "relative", marginTop: "56px" }}>
          <div aria-hidden className="bb-gates-line-h" />
          <div aria-hidden className="bb-gates-line-v" />
          <div className="bb-gates-row" style={{ display: "flex", justifyContent: "space-between", gap: "6px", position: "relative" }}>
            {GATES.map((g, i) => (
              <Reveal key={g.label} delay={i * 55} className="bb-gate-item" style={{ flex: "1 1 0", minWidth: 0 }}>
                <span style={{
                  width: "46px", height: "46px", borderRadius: "999px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: g.final ? T.color.amber : T.color.surface,
                  border: `1.5px solid ${g.final ? T.color.amber : T.color.borderStrong}`,
                  color: g.final ? "#1A1613" : T.color.forest,
                  boxShadow: g.final ? T.shadow.hover : "none",
                }}>
                  {g.icon}
                </span>
                <div>
                  {!g.final && <span style={{ display: "block", fontFamily: T.font.mono, fontSize: "0.58rem", color: T.color.textGhost, marginBottom: "6px" }}>0{i + 1}</span>}
                  <h4 style={{ fontFamily: T.font.sans, fontSize: "0.85rem", fontWeight: 600, color: T.color.ink, margin: "0 0 4px", lineHeight: 1.3 }}>{g.label}</h4>
                  <p style={{ fontFamily: T.font.sans, fontSize: "0.76rem", color: T.color.textMuted, margin: 0, lineHeight: 1.45 }}>{g.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Browse by origin (asymmetric bento) ──────────────── */}
      <section className="container-editorial" style={{ paddingTop: "104px" }}>
        <Reveal>
          <SectionHead kicker="Terroir" title="Browse by origin" sub="From the highlands of Yirgacheffe to the dry beds of Harrar." />
        </Reveal>
        <div className="bb-origins-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(2, 210px)", gap: "16px", marginTop: "32px" }}>
          {STATIC_ORIGINS.map((o, i) => (
            <Reveal key={o.region} delay={i * 70} className={`bb-origin-slot bb-origin-slot-${i}`} style={{ height: "100%" }}>
              <OriginCard origin={o} featured={i === 0} image={ORIGIN_IMAGES[o.region]} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Browse by selection (editorial index list) ───────── */}
      <section className="container-editorial" style={{ paddingTop: "104px" }}>
        <Reveal>
          <SectionHead kicker="Curated" title="Browse by selection" sub="Discover coffees by what matters — compliance, certification, and terroir." />
        </Reveal>
        <div style={{ marginTop: "16px" }}>
          {SELECTIONS.map((s, i) => (
            <Reveal key={s.key} delay={i * 45}>
              <a href={`/marketplace?${s.query}`} onClick={(e) => { e.preventDefault(); navigate(`/marketplace?${s.query}`); }} className="bb-selection-row">
                <span className="bb-selection-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="bb-selection-label">{s.label}</span>
                <span className="bb-selection-desc">{s.description}</span>
                <ArrowUpRight size={17} className="bb-selection-arrow" />
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Values + CTA ─────────────────────────────────────── */}
      <section className="container-editorial" style={{ paddingTop: "104px" }}>
        <Reveal>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: T.radius.xl, padding: "clamp(40px, 6vw, 76px)" }}>
            <img
              src={ctaBandImage}
              alt=""
              aria-hidden
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(23,64,47,0.90) 0%, rgba(14,42,32,0.94) 100%)" }} />
            <TopographicMark
              style={{ position: "absolute", top: "-28%", right: "-16%", width: "460px" }}
              strokeA="rgba(255,255,255,0.12)"
              strokeB="rgba(255,255,255,0.07)"
            />
            <div style={{ position: "relative", maxWidth: "660px" }}>
              <span style={{ ...kicker, color: T.color.mint }}>Why Beersheba</span>
              <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(2rem, 4vw, 3.1rem)", fontWeight: 400, lineHeight: 1.08, color: "#FFFFFF", margin: "16px 0 0" }}>
                Traceability, transparency, and a fair income — built into the trade.
              </h2>

              <div style={{ display: "flex", flexWrap: "wrap", marginTop: "30px", paddingTop: "22px", borderTop: "1px solid rgba(255,255,255,0.14)" }}>
                {[["7", "compliance gates"], ["3", "government frameworks"], ["1", "green passport"]].map(([n, l], i) => (
                  <div key={l as string} style={{ display: "flex", alignItems: "baseline", paddingRight: "28px", marginRight: "28px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.14)" : "none", marginBottom: "8px" }}>
                    <span style={{ fontFamily: T.font.display, fontSize: "2rem", color: "#FFFFFF", lineHeight: 1 }}>{n}</span>
                    <span style={{ fontFamily: T.font.mono, fontSize: "0.64rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginLeft: "8px" }}>{l}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "28px" }}>
                <button className="bb-cta" onClick={() => navigate("/marketplace")} style={{ ...primaryBtn, background: T.color.amber, borderColor: T.color.amber, color: "#1A1613", fontWeight: 600 }}>
                  Browse the marketplace <ArrowRight size={17} className="bb-cta-icon" />
                </button>
                <button onClick={() => navigate("/register")} style={ghostOnDarkBtn}>
                  Create an account
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <style>{`
        @media (max-width: 960px){ .bb-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }
        @media (max-width: 640px){ .bb-proof-strip { row-gap: 8px; } }
        @media (max-width: 720px){ .bb-hero-image { max-width: 380px; margin: 0 auto; } }
        @media (max-width: 700px){ .bb-pipeline-image { display: none; } .bb-pipeline-head { display: block; } }

        .bb-cta .bb-cta-icon { transition: transform 0.2s cubic-bezier(0.22,1,0.36,1); }
        .bb-cta:hover .bb-cta-icon { transform: translateX(3px); }

        /* Seven-gates connected timeline */
        .bb-gates-line-h { position: absolute; left: 3%; right: 3%; top: 23px; height: 1px; background: var(--color-border); }
        .bb-gates-line-v { display: none; }
        .bb-gate-item { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
        @media (max-width: 780px) {
          .bb-gates-row { flex-direction: column !important; align-items: stretch !important; gap: 26px !important; }
          .bb-gates-line-h { display: none; }
          .bb-gates-line-v { display: block; position: absolute; left: 23px; top: 4px; bottom: 4px; width: 1px; background: var(--color-border); }
          .bb-gate-item { flex-direction: row !important; align-items: flex-start !important; text-align: left !important; gap: 16px; }
        }

        /* Origins bento */
        .bb-origin-slot-0 { grid-column: span 2; grid-row: span 2; }
        .bb-origin-slot-1 { grid-column: span 2; grid-row: span 1; }
        .bb-origin-slot-2 { grid-column: span 1; grid-row: span 1; }
        .bb-origin-slot-3 { grid-column: span 1; grid-row: span 1; }
        @media (max-width: 820px) {
          .bb-origins-grid { grid-template-columns: 1fr 1fr !important; grid-template-rows: none !important; }
          .bb-origin-slot-0, .bb-origin-slot-1 { grid-column: span 2 !important; grid-row: auto !important; }
          .bb-origin-slot-2, .bb-origin-slot-3 { grid-column: span 1 !important; grid-row: auto !important; }
          .bb-origin-slot { height: 220px !important; }
        }
        @media (max-width: 560px) {
          .bb-origins-grid { grid-template-columns: 1fr !important; }
          .bb-origin-slot-0, .bb-origin-slot-1, .bb-origin-slot-2, .bb-origin-slot-3 { grid-column: span 1 !important; }
        }

        /* Selections editorial list */
        .bb-selection-row {
          display: flex; align-items: center; gap: 22px; padding: 22px 6px;
          border-top: 1px solid var(--color-border); text-decoration: none;
          transition: padding-left 0.2s ease;
        }
        .bb-selection-row:last-child { border-bottom: 1px solid var(--color-border); }
        .bb-selection-index { font-family: "DM Mono", monospace; font-size: 0.75rem; color: var(--color-text-ghost); width: 30px; flex-shrink: 0; }
        .bb-selection-label { font-family: "Fraunces", serif; font-size: 1.2rem; font-weight: 500; color: var(--color-ink); width: 200px; flex-shrink: 0; transition: color 0.2s ease; }
        .bb-selection-desc { font-family: "Space Grotesk", sans-serif; font-size: 0.9rem; color: var(--color-text-muted); flex: 1; }
        .bb-selection-arrow { color: var(--color-text-ghost); transition: transform 0.2s ease, color 0.2s ease; flex-shrink: 0; }
        .bb-selection-row:hover { padding-left: 14px; }
        .bb-selection-row:hover .bb-selection-label { color: var(--color-forest); }
        .bb-selection-row:hover .bb-selection-arrow { transform: translate(3px, -3px); color: var(--color-forest); }
        @media (max-width: 680px) {
          .bb-selection-row { flex-wrap: wrap; row-gap: 6px; }
          .bb-selection-label { width: auto; }
          .bb-selection-desc { flex: 1 0 100%; order: 3; }
        }
      `}</style>
    </AppShell>
  );
}

/** Concentric contour-line motif — evokes highland terrain, echoes the "traceable terroir" theme without photography. */
function TopographicMark({ style, strokeA, strokeB }: { style?: React.CSSProperties; strokeA: string; strokeB: string }) {
  const radii = [110, 165, 220, 275, 330];
  return (
    <svg aria-hidden viewBox="0 0 700 700" style={{ pointerEvents: "none", ...style }}>
      {radii.map((r, i) => (
        <circle key={r} cx="440" cy="470" r={r} fill="none" stroke={i % 2 === 0 ? strokeA : strokeB} strokeWidth="1.2" />
      ))}
    </svg>
  );
}

const GATES = [
  { label: "GPS boundary", sub: "Farm plotted and verified against forest baselines.", icon: <MapPin size={19} /> },
  { label: "Deforestation-free", sub: "Clear of forest loss since December 2020.", icon: <Leaf size={19} /> },
  { label: "EUDR due diligence", sub: "Statement generated and lodged for EU customs.", icon: <FileCheck2 size={19} /> },
  { label: "Phytosanitary cert", sub: "Export health certificate on file.", icon: <ScanLine size={19} /> },
  { label: "ECTA license", sub: "Active, licensed exporter of record.", icon: <ShieldCheck size={19} /> },
  { label: "NBE FX declaration", sub: "50/50 forex retention filed with the bank.", icon: <Landmark size={19} /> },
  { label: "CTA floor price", sub: "Meets the government coffee floor price.", icon: <BadgeCheck size={19} /> },
  { label: "Green Passport", sub: "All seven gates passed — export ready.", icon: <CheckCircle2 size={20} />, final: true },
];

function SectionHead({ kicker: k, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div>
      <span style={kicker}>{k}</span>
      <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(1.9rem, 3.2vw, 2.75rem)", fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.01em", color: T.color.ink, margin: "12px 0 0" }}>{title}</h2>
      {sub && <p style={{ fontFamily: T.font.sans, fontSize: "1rem", color: T.color.textMuted, margin: "10px 0 0", maxWidth: "60ch" }}>{sub}</p>}
    </div>
  );
}

const kicker: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px",
  fontFamily: T.font.mono, fontSize: "0.68rem", letterSpacing: "0.22em",
  textTransform: "uppercase", color: T.color.clay,
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px", padding: "13px 26px", borderRadius: "999px",
  background: T.color.forest, border: `1px solid ${T.color.forest}`, color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "0.95rem", fontWeight: 500, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px", padding: "13px 24px", borderRadius: "999px",
  background: "transparent", border: `1px solid ${T.color.borderStrong}`, color: T.color.ink, fontFamily: T.font.sans, fontSize: "0.95rem", fontWeight: 500, cursor: "pointer",
  textDecoration: "none",
};
const ghostOnDarkBtn: React.CSSProperties = {
  padding: "13px 24px", borderRadius: "999px", background: "transparent", border: "1px solid rgba(255,255,255,0.35)",
  color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "0.95rem", fontWeight: 500, cursor: "pointer",
};
