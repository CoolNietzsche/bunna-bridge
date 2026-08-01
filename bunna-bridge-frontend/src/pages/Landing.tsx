import { useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, ShieldCheck, ScanLine, FileCheck2, Sparkles } from "lucide-react";
import AppShell from "../components/AppShell";
import OriginCard from "../components/market/OriginCard";
import SelectionCard from "../components/market/SelectionCard";
import { SELECTIONS, STATIC_ORIGINS } from "../lib/catalog";
import { T } from "../styles/tokens";

// The marketplace list requires auth on this deployment, and this page is
// only ever shown to anonymous visitors (authenticated users are redirected
// to /dashboard before reaching here — see App.tsx's RootRoute). So this
// page intentionally makes no live API calls: no fabricated counts, no
// guaranteed-to-401 requests. "Explore" links to /marketplace, which
// ProtectedRoute naturally bounces to /login?next=/marketplace.
export default function Landing() {
  const navigate = useNavigate();

  return (
    <AppShell footer>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${T.color.border}` }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(1100px 500px at 78% -8%, var(--color-forest-light), transparent 70%)" }} />
        <div className="container-editorial" style={{ position: "relative", paddingTop: "clamp(56px, 9vw, 120px)", paddingBottom: "clamp(56px, 9vw, 120px)" }}>
          <div className="bb-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "56px", alignItems: "center" }}>
            <div className="bb-rise">
              <span style={CS_kicker}><Sparkles size={14} /> Farm boundary → FOB, fully traceable</span>
              <h1 style={{ fontFamily: T.font.display, fontSize: "clamp(2.9rem, 6vw, 5rem)", fontWeight: 400, lineHeight: 1.0, letterSpacing: "-0.02em", color: T.color.ink, margin: "20px 0 0" }}>
                Ethiopian specialty coffee,<br />
                <em style={{ fontStyle: "italic", color: T.color.forest }}>traceable to the tree.</em>
              </h1>
              <p style={{ fontFamily: T.font.sans, fontSize: "clamp(1.05rem, 1.6vw, 1.25rem)", lineHeight: 1.6, color: T.color.textMuted, margin: "24px 0 0", maxWidth: "52ch" }}>
                Beersheba connects farmers, exporters and roasters through a single
                compliance pipeline — EUDR, ECTA and NBE — so every micro-lot carries
                its own verified origin story.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "32px" }}>
                <button onClick={() => navigate("/marketplace")} style={{ ...primaryBtn, padding: "13px 26px", fontSize: "0.95rem" }}>
                  Explore the coffees <ArrowRight size={17} />
                </button>
                <a href="#how" style={{ ...ghostBtn, padding: "13px 24px", fontSize: "0.95rem", textDecoration: "none" }}>How it works</a>
              </div>
            </div>

            {/* Value pillars, in place of live stats we can't legitimately show a logged-out visitor */}
            <div className="bb-fade" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {VALUE_PILLARS.map((v) => (
                <div key={v.title} style={{ ...cardStyle, padding: "20px 22px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <span style={{ width: "40px", height: "40px", borderRadius: T.radius.md, background: T.color.forestLight, color: T.color.forest, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{v.icon}</span>
                  <div>
                    <h3 style={{ fontFamily: T.font.display, fontSize: "1.1rem", fontWeight: 500, color: T.color.ink, margin: "0 0 4px" }}>{v.title}</h3>
                    <p style={{ fontFamily: T.font.sans, fontSize: "0.85rem", color: T.color.textMuted, margin: 0, lineHeight: 1.5 }}>{v.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Browse by selection ──────────────────────────────── */}
      <section className="container-editorial" style={{ paddingTop: "64px" }}>
        <SectionHead kicker="Curated" title="Browse by selection" sub="Discover coffees by what matters — compliance, certification, and terroir." />
        <div className="bb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "28px" }}>
          {SELECTIONS.map((s) => (
            <SelectionCard key={s.key} selection={s} />
          ))}
        </div>
      </section>

      {/* ── Browse by origin ─────────────────────────────────── */}
      <section className="container-editorial" style={{ paddingTop: "64px" }}>
        <SectionHead kicker="Terroir" title="Browse by origin" sub="From the highlands of Yirgacheffe to the dry beds of Harrar." />
        <div className="bb-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginTop: "28px" }}>
          {STATIC_ORIGINS.map((o) => <OriginCard key={o.region} origin={o} />)}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section id="how" className="container-editorial" style={{ paddingTop: "88px", scrollMarginTop: "90px" }}>
        <SectionHead kicker="The pipeline" title="Seven gates to a Green Passport" sub="Every lot is scored on seven independent compliance checks. Pass all seven and it becomes export-ready." />
        <div className="bb-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginTop: "28px" }}>
          {STEPS.map((s, i) => (
            <div key={s.title} style={{ ...cardStyle, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ width: "44px", height: "44px", borderRadius: T.radius.md, background: T.color.forestLight, color: T.color.forest, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</span>
                <span style={{ fontFamily: T.font.display, fontSize: "1.6rem", color: T.color.textGhost }}>0{i + 1}</span>
              </div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.3rem", fontWeight: 500, color: T.color.ink, margin: "0 0 6px" }}>{s.title}</h3>
              <p style={{ fontFamily: T.font.sans, fontSize: "0.875rem", lineHeight: 1.55, color: T.color.textMuted, margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Values + CTA ─────────────────────────────────────── */}
      <section id="values" className="container-editorial" style={{ paddingTop: "88px", scrollMarginTop: "90px" }}>
        <div style={{ position: "relative", overflow: "hidden", borderRadius: T.radius.xl, background: "linear-gradient(135deg, #1C5540 0%, #123A2E 55%, #0C2A21 100%)", padding: "clamp(40px, 6vw, 72px)" }}>
          <svg viewBox="0 0 400 400" aria-hidden style={{ position: "absolute", right: "-60px", bottom: "-80px", width: "360px", opacity: 0.12 }}>
            <path d="M200 40c80-16 128 32 120 112-72 0-128-40-120-112Z" fill="#FFFFFF" />
          </svg>
          <div style={{ position: "relative", maxWidth: "640px" }}>
            <span style={{ ...CS_kicker, color: T.color.mint }}>Why Beersheba</span>
            <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 400, lineHeight: 1.08, color: "#FFFFFF", margin: "16px 0 0" }}>
              Traceability, transparency, and a fair income — built into the trade.
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "20px" }}>
              {["Traceability", "Transparency", "EUDR compliance", "Fair income", "Quality first"].map((v) => (
                <span key={v} style={{ fontFamily: T.font.sans, fontSize: "0.85rem", fontWeight: 500, color: "#FFFFFF", padding: "7px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}>{v}</span>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "32px" }}>
              <button onClick={() => navigate("/marketplace")} style={{ ...primaryBtn, background: T.color.amber, borderColor: T.color.amber, color: "#1A1613", fontWeight: 600, padding: "13px 26px" }}>
                Browse the marketplace <ArrowRight size={17} />
              </button>
              <button onClick={() => navigate("/register")} style={{ padding: "13px 24px", borderRadius: "999px", background: "transparent", border: "1px solid rgba(255,255,255,0.35)", color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "0.95rem", fontWeight: 500, cursor: "pointer" }}>
                Create an account
              </button>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 960px){ .bb-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; } }
        @media (max-width: 820px){ .bb-grid-3, .bb-grid-4 { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px){ .bb-grid-3, .bb-grid-4 { grid-template-columns: 1fr !important; } }
      `}</style>
    </AppShell>
  );
}

const VALUE_PILLARS = [
  { title: "GPS-verified boundaries", body: "Every farm plot mapped and checked against real forest-cover data.", icon: <MapPin size={19} /> },
  { title: "EUDR due diligence", body: "Deforestation-free declarations, lodged and ready for EU customs.", icon: <ShieldCheck size={19} /> },
  { title: "Independent Q-grading", body: "SCA cupping scores from certified graders, not self-reported.", icon: <ScanLine size={19} /> },
];

const STEPS = [
  { title: "Origin & GPS", body: "Farm boundaries are captured as GPS polygons and verified against forest baselines.", icon: <MapPin size={20} /> },
  { title: "Deforestation-free", body: "Each lot is checked for overlap with December 2020 forest cover for EUDR.", icon: <ScanLine size={20} /> },
  { title: "Due diligence", body: "The EUDR DDS is generated and lodged, ready for EU customs.", icon: <FileCheck2 size={20} /> },
  { title: "Licensing & FX", body: "ECTA licensing and NBE foreign-exchange declarations are confirmed active.", icon: <ShieldCheck size={20} /> },
];

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div>
      <span style={CS_kicker}>{kicker}</span>
      <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(1.9rem, 3.2vw, 2.75rem)", fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.01em", color: T.color.ink, margin: "12px 0 0" }}>{title}</h2>
      {sub && <p style={{ fontFamily: T.font.sans, fontSize: "1rem", color: T.color.textMuted, margin: "10px 0 0", maxWidth: "60ch" }}>{sub}</p>}
    </div>
  );
}

const CS_kicker: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px",
  fontFamily: T.font.mono, fontSize: "0.68rem", letterSpacing: "0.22em",
  textTransform: "uppercase", color: T.color.clay,
};
const cardStyle: React.CSSProperties = {
  background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, boxShadow: T.shadow.card,
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 22px", borderRadius: "999px",
  background: T.color.forest, border: `1px solid ${T.color.forest}`, color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "0.9rem", fontWeight: 500, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "8px", padding: "11px 22px", borderRadius: "999px",
  background: "transparent", border: `1px solid ${T.color.borderStrong}`, color: T.color.ink, fontFamily: T.font.sans, fontSize: "0.9rem", fontWeight: 500, cursor: "pointer",
};
