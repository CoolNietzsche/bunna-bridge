import { Link } from "react-router-dom";
import { Building2, Coffee, Handshake } from "lucide-react";
import AppShell from "../components/AppShell";
import { usePageMeta } from "../hooks/usePageMeta";
import Reveal from "../components/Reveal";
import LeadForm from "../components/site/LeadForm";
import { CheckList, Faq, SectionHead } from "../components/site/marketing";

const PLANS = [
  {
    icon: <Building2 size={20} />,
    name: "Exporters",
    who: "Exporters, cooperatives and unions",
    price: "Subscription",
    note: "Sized to your volume and number of producers.",
    items: [
      "Field mapping app for your agents, with offline mode",
      "Producers, plots, consent and cherry intake",
      "Seven compliance gates and the Green Passport",
      "EUDR evidence packages for your importers",
      "Marketplace listing, samples, offers and contracts",
      "Shipments, export documents, payments and FX",
      "Quality records and cupping sessions",
      "Your whole team, with role-based access",
    ],
    cta: "Talk to us",
    featured: true,
  },
  {
    icon: <Coffee size={20} />,
    name: "Importers and roasters",
    who: "EU importers, roasters and traders",
    price: "Free to browse",
    note: "Browsing the marketplace is free.",
    items: [
      "Full marketplace with compliance and quality data",
      "Sample requests and messaging with exporters",
      "EUDR evidence packages with every contract",
      "DDS reference records for your customers",
      "Saved searches, alerts and watchlist",
      "Beersheba Select and EU warehouse stock",
    ],
    cta: "Ask about buying",
  },
  {
    icon: <Handshake size={20} />,
    name: "Marketplace trades",
    who: "Deals agreed on Beersheba",
    price: "Small trade fee",
    note: "Charged on trades completed through Beersheba.",
    items: [
      "Applies to deals agreed on the marketplace",
      "Covers the evidence package and contract records",
      "Discussed with you before you trade",
    ],
    cta: "Ask about fees",
  },
];

export default function Pricing() {
  usePageMeta("Pricing", "Beersheba pricing for Ethiopian exporters, EU importers and roasters. Talk to us for a quote sized to your volume.");

  return (
    <AppShell footer>
      <section className="container-editorial mk-hero mk-hero-solo mk-center" style={{ marginInline: "auto" }}>
        <Reveal>
          <span className="mk-kicker">Pricing</span>
          <h1 className="mk-h1">Priced for your volume. <span className="mk-gradient">Talk to us.</span></h1>
          <p className="mk-lead">
            We're onboarding our first exporters and buyers now. Tell us about your business and we'll send you a quote that fits it.
          </p>
          <div className="mk-actions"><a href="#contact" className="mk-btn mk-btn-primary">Get a quote</a></div>
        </Reveal>
      </section>

      <section className="container-editorial mk-section" style={{ paddingTop: 64 }}>
        <div className="mk-grid mk-grid-3" style={{ alignItems: "stretch", marginTop: 0 }}>
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 80} style={{ height: "100%" }}>
              <div className="mk-card" style={{ padding: 30, height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box",
                ...(p.featured ? { borderColor: "var(--color-forest)", boxShadow: "0 0 0 1px var(--color-forest), 0 22px 48px rgba(27,122,78,0.14)" } : {}) }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span className={`mk-icon${p.featured ? " mk-icon-solid" : ""}`} aria-hidden>{p.icon}</span>
                  {p.featured && <span className="mk-pill">Most teams start here</span>}
                </div>
                <h2 className="mk-h3" style={{ fontSize: "1.35rem", marginTop: 18 }}>{p.name}</h2>
                <p className="mk-body" style={{ fontSize: "0.88rem", marginTop: 2 }}>{p.who}</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--color-ink)", margin: "20px 0 0" }}>{p.price}</p>
                <p className="mk-body" style={{ fontSize: "0.88rem", marginTop: 4 }}>{p.note}</p>
                <div style={{ flex: 1 }}><CheckList items={p.items} /></div>
                <a href="#contact" className={`mk-btn ${p.featured ? "mk-btn-primary" : ""}`} style={{ marginTop: 26,
                  ...(p.featured ? {} : { background: "var(--color-forest-light)", color: "var(--color-forest)" }) }}>{p.cta}</a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="Questions" title="About pricing." />
          <Faq items={[
            { q: "Why isn't there a price list yet?", a: "Exporters differ a lot — from a single washing station to unions with thousands of members. While we onboard our first customers, we price each one to fit. A public price list will follow." },
            { q: "Is there a setup cost?", a: "We'll tell you up front. For most exporters the work is mapping your producers' plots, and we'll help you plan it." },
            { q: "Can I try it first?", a: "Yes. Ask for a walkthrough and we'll show you the platform with your own lots and farms." },
            { q: "What currency do you charge in?", a: "Tell us what works for you. Ethiopian exporters and EU buyers have different needs, and we'll quote accordingly." },
          ]} />
        </Reveal>
      </section>

      <section className="container-editorial mk-section" id="contact">
        <div className="mk-card" style={{ padding: "clamp(28px, 5vw, 56px)", display: "grid", gap: "clamp(28px, 4vw, 56px)", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)" }}>
          <div>
            <SectionHead kicker="Get a quote" title="Tell us about your business." sub={<>Prefer to read first? Start with the <Link to="/eudr" style={{ color: "var(--color-forest)" }}>EUDR guide</Link>.</>} />
          </div>
          <LeadForm cta="Get a quote" messageHint="Your volume, number of producers or plots, and when you need to be ready." />
        </div>
      </section>
      <style>{`@media (max-width: 880px){ #contact > .mk-card { grid-template-columns: 1fr !important; } }`}</style>
    </AppShell>
  );
}
