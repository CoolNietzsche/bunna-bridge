import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight, ChevronRight, MapPin, Leaf, FileCheck2, ScanLine,
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

// This page is only ever shown to anonymous visitors (authenticated users
// are redirected to /dashboard before reaching here — see App.tsx's
// RootRoute). It intentionally makes no live API calls: no fabricated
// counts, no requests that would need auth. /marketplace is public
// browsing (only watchlist/sample/offer actions require login), so
// "Explore" links straight there. The "7 gates / 3 frameworks / 1
// passport" figures below are structural facts about the compliance
// pipeline (see CLAUDE.md), not live metrics.
export default function Landing() {
  const navigate = useNavigate();

  return (
    <AppShell footer>
      {/* ── Hero (Apple product-page composition: centred headline, then a wide image) ── */}
      <section style={{ position: "relative" }}>
        <div className="container-editorial" style={{ textAlign: "center", paddingTop: "clamp(64px, 9vw, 124px)" }}>
          <Reveal>
            <span style={kicker}>Ethiopian specialty coffee</span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="bb-hero-title" style={{ fontFamily: T.font.display, fontSize: "clamp(3rem, 8vw, 5.6rem)", fontWeight: 700, lineHeight: 1.02, letterSpacing: "-0.045em", color: T.color.ink, margin: "14px auto 0" }}>
              Traceable<br /><span className="bb-gradient-text">to the tree.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p style={{ fontFamily: T.font.sans, fontSize: "clamp(1.15rem, 2vw, 1.45rem)", lineHeight: 1.45, letterSpacing: "-0.015em", color: T.color.textMuted, margin: "22px auto 0", maxWidth: "36ch" }}>
              Every lot, from GPS boundary to bill of lading — checked against EUDR, ECTA and NBE before it reaches your roastery.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "22px", marginTop: "32px" }}>
              <button className="bb-cta" onClick={() => navigate("/marketplace")} style={primaryBtn}>
                Explore the coffees
              </button>
              <a href="#pipeline" className="bb-text-link" style={textLink}>
                How it works <ChevronRight size={18} className="bb-cta-icon" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="bb-hero-media" style={{ position: "relative", marginTop: "clamp(44px, 6vw, 72px)", borderRadius: T.radius.xl, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.18)", aspectRatio: "16 / 7" }}>
              <img
                src={heroImage}
                alt="Terraced highland coffee farm in Yirgacheffe, Ethiopia, at dawn"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 60%", display: "block" }}
              />
              {/* Floating glass chip — the product promise, on the photo */}
              <div className="bb-material-bar bb-hero-chip" style={{ position: "absolute", left: "24px", bottom: "24px", display: "flex", alignItems: "center", gap: "12px", padding: "12px 18px 12px 12px", borderRadius: "18px", textAlign: "left", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(180deg, #2E9A66, #1B7A4E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                  <ShieldCheck size={20} />
                </span>
                <span>
                  <span style={{ display: "block", fontFamily: T.font.sans, fontSize: "0.92rem", fontWeight: 600, color: T.color.ink, letterSpacing: "-0.01em" }}>Deforestation-free, verified</span>
                  <span style={{ display: "block", fontFamily: T.font.sans, fontSize: "0.8rem", color: T.color.textMuted }}>Satellite-checked against forest loss since 2020</span>
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={380}>
            <p className="bb-proof-strip" style={{ fontFamily: T.font.sans, fontSize: "0.86rem", color: T.color.textFaint, margin: "28px 0 0", letterSpacing: "-0.005em" }}>
              {["EUDR", "ECTA", "NBE", "SCA Q-grading", "GPS boundaries"].join("  ·  ")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── The pipeline ─────────────────────────────────────── */}
      <section id="pipeline" className="container-editorial" style={{ paddingTop: "clamp(96px, 12vw, 152px)", scrollMarginTop: "90px" }}>
        <div className="bb-pipeline-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "32px" }}>
          <Reveal style={{ flex: 1 }}>
            <SectionHead kicker="The pipeline" title="Seven gates to a Green Passport" sub="Every lot is scored against seven independent compliance checks before it can list. Pass all seven, and it earns a verifiable Green Passport." />
          </Reveal>
          <Reveal delay={100} className="bb-pipeline-image" style={{ flexShrink: 0 }}>
            <div style={{ width: "180px", borderRadius: T.radius.lg, overflow: "hidden", boxShadow: T.shadow.card, aspectRatio: "4 / 3" }}>
              <img
                src={cuppingDetailImage}
                alt="A Q-grader arranging cupping bowls at a wooden cupping table"
                loading="lazy"
                decoding="async"
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
                  width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: g.final ? "linear-gradient(180deg, #2E9A66, #1B7A4E)" : T.color.surface,
                  border: g.final ? "none" : `1px solid ${T.color.border}`,
                  color: g.final ? "#FFFFFF" : T.color.forest,
                  boxShadow: g.final ? "0 10px 24px rgba(27,122,78,0.30)" : T.shadow.card,
                }}>
                  {g.icon}
                </span>
                <div>
                  {!g.final && <span style={{ display: "block", fontFamily: T.font.sans, fontSize: "0.72rem", fontWeight: 600, color: T.color.textFaint, marginBottom: "4px" }}>Gate {i + 1}</span>}
                  <h4 style={{ fontFamily: T.font.sans, fontSize: "0.92rem", fontWeight: 600, letterSpacing: "-0.015em", color: T.color.ink, margin: "0 0 4px", lineHeight: 1.3 }}>{g.label}</h4>
                  <p style={{ fontFamily: T.font.sans, fontSize: "0.8rem", color: T.color.textMuted, margin: 0, lineHeight: 1.45 }}>{g.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Browse by origin (asymmetric bento) ──────────────── */}
      <section className="container-editorial" style={{ paddingTop: "clamp(96px, 12vw, 152px)" }}>
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
      <section className="container-editorial" style={{ paddingTop: "clamp(96px, 12vw, 152px)" }}>
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
      <section className="container-editorial" style={{ paddingTop: "clamp(96px, 12vw, 152px)" }}>
        <Reveal>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: T.radius.xl, padding: "clamp(40px, 6vw, 76px)" }}>
            <img
              src={ctaBandImage}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(8,28,19,0.86) 0%, rgba(4,16,11,0.94) 100%)" }} />
            <TopographicMark
              style={{ position: "absolute", top: "-28%", right: "-16%", width: "460px" }}
              strokeA="rgba(255,255,255,0.12)"
              strokeB="rgba(255,255,255,0.07)"
            />
            <div style={{ position: "relative", maxWidth: "660px" }}>
              <span style={{ ...kicker, color: "#7EE0A8" }}>Why Beersheba</span>
              <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(2rem, 4vw, 3.1rem)", fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.03em", color: "#FFFFFF", margin: "14px 0 0" }}>
                Traceability, transparency, and a fair income — built into the trade.
              </h2>

              <div style={{ display: "flex", flexWrap: "wrap", marginTop: "30px", paddingTop: "22px", borderTop: "1px solid rgba(255,255,255,0.14)" }}>
                {[["7", "compliance gates"], ["3", "government frameworks"], ["1", "green passport"]].map(([n, l], i) => (
                  <div key={l as string} style={{ display: "flex", alignItems: "baseline", paddingRight: "28px", marginRight: "28px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.14)" : "none", marginBottom: "8px" }}>
                    <span style={{ fontFamily: T.font.display, fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "#FFFFFF", lineHeight: 1 }}>{n}</span>
                    <span style={{ fontFamily: T.font.sans, fontSize: "0.86rem", color: "rgba(255,255,255,0.62)", marginLeft: "8px" }}>{l}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "28px" }}>
                <button className="bb-cta" onClick={() => navigate("/marketplace")} style={{ ...primaryBtn, background: "#FFFFFF", color: "#1D1D1F" }}>
                  Browse the marketplace
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
        .bb-gradient-text {
          background: linear-gradient(100deg, #1B7A4E 0%, #2E9A66 45%, #8FBF4A 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .dark .bb-gradient-text { background-image: linear-gradient(100deg, #34C77B 0%, #7EE0A8 60%, #C7E97A 100%); }
        .bb-text-link { transition: opacity .2s; }
        .bb-text-link:hover { text-decoration: underline; text-underline-offset: 4px; }
        @media (max-width: 720px){
          .bb-hero-media { aspect-ratio: 4 / 5 !important; }
          .bb-hero-chip { left: 12px !important; right: 12px; bottom: 12px !important; }
        }
        @media (max-width: 700px){ .bb-pipeline-image { display: none; } .bb-pipeline-head { display: block; } }

        .bb-cta { transition: background .2s, transform .2s; }
        .bb-cta:hover { filter: brightness(1.06); }
        .bb-cta-icon { transition: transform 0.2s cubic-bezier(0.25,0.1,0.25,1); }
        .bb-text-link:hover .bb-cta-icon { transform: translateX(2px); }

        /* Seven-gates connected timeline */
        .bb-gates-line-h { position: absolute; left: 3%; right: 3%; top: 24px; height: 1px; background: var(--color-border); }
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
        .bb-selection-index { font-size: 0.8rem; font-weight: 600; color: var(--color-text-faint); width: 30px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
        .bb-selection-label { font-size: 1.3rem; font-weight: 700; letter-spacing: -0.025em; color: var(--color-ink); width: 220px; flex-shrink: 0; transition: color 0.2s ease; }
        .bb-selection-desc { font-size: 0.98rem; color: var(--color-text-muted); flex: 1; letter-spacing: -0.01em; }
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
      <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(2.1rem, 4vw, 3.4rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.035em", color: T.color.ink, margin: "10px 0 0" }}>{title}</h2>
      {sub && <p style={{ fontFamily: T.font.sans, fontSize: "1rem", color: T.color.textMuted, margin: "10px 0 0", maxWidth: "60ch" }}>{sub}</p>}
    </div>
  );
}

// Apple-style eyebrow: sentence case, semibold, warm accent.
const kicker: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px",
  fontFamily: T.font.sans, fontSize: "1.05rem", fontWeight: 600, letterSpacing: "-0.01em", color: T.color.clay,
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px", padding: "13px 26px", borderRadius: "999px",
  background: T.color.forest, border: "none", color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "1.02rem", fontWeight: 500, letterSpacing: "-0.01em", cursor: "pointer",
};
// "Learn more ›" text link — Apple's secondary call to action.
const textLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "2px", color: T.color.forest,
  fontFamily: T.font.sans, fontSize: "1.02rem", fontWeight: 500, letterSpacing: "-0.01em", textDecoration: "none",
};
const ghostOnDarkBtn: React.CSSProperties = {
  padding: "13px 24px", borderRadius: "999px", background: "transparent", border: "1px solid rgba(255,255,255,0.35)",
  color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "0.95rem", fontWeight: 500, cursor: "pointer",
};
