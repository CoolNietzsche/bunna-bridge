import { Link } from "react-router-dom";
import {
  MapPinned, FileCheck2, Coffee, PackageSearch, Gavel, Warehouse, Gauge, Bell, MessagesSquare,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { usePageMeta } from "../hooks/usePageMeta";
import Reveal from "../components/Reveal";
import LeadForm from "../components/site/LeadForm";
import PassportPreview from "../components/site/PassportPreview";
import EudrDeadline from "../components/site/EudrDeadline";
import { CheckList, Faq, Feature, SectionHead, TextLink } from "../components/site/marketing";
import heroImage from "../assets/landing/cupping-detail.webp";

export default function Buyers() {
  usePageMeta(
    "For importers and roasters",
    "Buy traceable Ethiopian specialty coffee with plot-level geolocation, quality data and EUDR evidence for every lot.",
  );

  return (
    <AppShell footer>
      <section className="container-editorial mk-hero">
        <Reveal>
          <span className="mk-pill"><Coffee size={14} aria-hidden /> For EU importers and roasters</span>
          <h1 className="mk-h1">Ethiopian coffee you can <span className="mk-gradient">put your name to.</span></h1>
          <p className="mk-lead">
            Every lot on Beersheba comes with the plots it was grown on, its cupping and green-analysis data, and the evidence you need
            for your EUDR due diligence statement. Buy direct from verified Ethiopian exporters.
          </p>
          <div className="mk-actions">
            <Link to="/marketplace" className="mk-btn mk-btn-primary">Browse the coffees</Link>
            <a href="#contact" className="mk-link">Talk to our team</a>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="mk-hero-media">
            <img src={heroImage} alt="A Q-grader arranging cupping bowls at a wooden cupping table" loading="eager" decoding="async" />
          </div>
        </Reveal>
      </section>

      <section className="container-editorial mk-section">
        <Reveal><EudrDeadline /></Reveal>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="Why buy here" title="Less risk, more coffee you'd want anyway." />
        </Reveal>
        <div className="mk-grid mk-grid-3">
          {[
            { icon: <MapPinned size={20} />, t: "Plot-level geolocation", d: "Each lot lists the plots behind it, mapped in the field and checked against satellite tree-cover-loss data." },
            { icon: <FileCheck2 size={20} />, t: "Evidence for your DDS", d: "Geolocation, risk checks and supporting documents in one package, ready for the due diligence statement you file." },
            { icon: <Coffee size={20} />, t: "Quality you can compare", d: "SCA cupping scores, green analysis, and pre-shipment versus arrival results on the same page as the compliance data." },
            { icon: <PackageSearch size={20} />, t: "Samples on request", d: "Request samples straight from the lot page and track them until they arrive." },
            { icon: <Gavel size={20} />, t: "Beersheba Select", d: "A curated programme of jury-cupped lots, sold by catalogue or timed auction." },
            { icon: <Warehouse size={20} />, t: "EU warehouse stock", d: "Coffee already in Europe, sold in bag lots, for roasters who don't buy by the container." },
            { icon: <Gauge size={20} />, t: "Exporter track record", d: "Reliability and impact scores built from real deliveries, so you know who you're buying from." },
            { icon: <Bell size={20} />, t: "Alerts and watchlist", d: "Save a search and get told when a matching lot lists. Follow lots you're considering." },
            { icon: <MessagesSquare size={20} />, t: "Talk to the exporter", d: "Message exporters directly, make offers and agree contracts on the platform." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 70}><Feature icon={f.icon} title={f.t}>{f.d}</Feature></Reveal>
          ))}
        </div>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="The Green Passport" title="Look behind any lot." sub="Seven gates, the plots, the quality data and a tamper-evident audit trail. Click a gate to see the evidence behind it." />
        </Reveal>
        <Reveal delay={100}><div style={{ marginTop: 36 }}><PassportPreview /></div></Reveal>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="How buying works" title="Four steps, no surprises." />
        </Reveal>
        <div className="mk-steps mk-grid-2" style={{ display: "grid" }}>
          {[
            ["Find a lot", "Filter by origin, process, score, certification or EUDR readiness. Browsing is open to everyone."],
            ["Taste it", "Request a sample from the lot page, where the cupping and green-analysis data already sit."],
            ["Agree the deal", "Make an offer, agree terms and sign the contract on the platform."],
            ["Receive the evidence", "The EUDR evidence package travels with the contract. Record your DDS reference and pass it to your customers."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 70}>
              <div className="mk-card mk-step">
                <h3 className="mk-h3">{t}</h3>
                <p className="mk-body" style={{ marginTop: 6 }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mk-actions"><TextLink to="/marketplace">Browse the marketplace</TextLink></div>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="Questions" title="Buyers ask us." />
          <Faq items={[
            { q: "Who files the due diligence statement?", a: "The operator who first places the coffee on the EU market, usually the importer. Roasters and traders further down the chain keep the reference number of that statement. Beersheba gives the importer the evidence and carries the reference number to their customers." },
            { q: "Does Beersheba take on my EUDR liability?", a: <>No. EUDR keeps the responsibility with the operator. What we give you is complete, checkable evidence and an audit trail, so your due diligence is fast and defensible. Read the <Link to="/eudr" style={{ color: "var(--color-forest)" }}>EUDR guide</Link> for the details.</> },
            { q: "Ethiopia is standard risk. What does that mean for me?", a: "You can't use simplified due diligence for Ethiopian coffee. You need the plot geolocation, a risk assessment and, where needed, risk mitigation for each lot. That's what the Green Passport is built around." },
            { q: "Can I buy less than a container?", a: "Yes. Some lots are offered in smaller quantities, and EU warehouse stock is sold in bag lots, where our partners hold stock." },
            { q: "What does it cost to buy?", a: <>Browsing the marketplace and requesting samples is free. <Link to="/pricing" style={{ color: "var(--color-forest)" }}>See pricing</Link> for the rest.</> },
          ]} />
        </Reveal>
      </section>

      <section className="container-editorial mk-section" id="contact">
        <div className="mk-card" style={{ padding: "clamp(28px, 5vw, 56px)", display: "grid", gap: "clamp(28px, 4vw, 56px)", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)" }}>
          <div>
            <SectionHead kicker="Sourcing" title="Tell us what you're looking for." />
            <CheckList items={[
              "Lots matched to your profile, process and volume",
              "Samples sent to your roastery",
              "Help with the evidence for your due diligence",
            ]} />
          </div>
          <LeadForm defaultRole="importer" cta="Send" messageHint="Origins, processes, scores and volumes you're after, and when you need them." />
        </div>
      </section>
      <style>{`@media (max-width: 880px){ #contact > .mk-card { grid-template-columns: 1fr !important; } }`}</style>
    </AppShell>
  );
}
