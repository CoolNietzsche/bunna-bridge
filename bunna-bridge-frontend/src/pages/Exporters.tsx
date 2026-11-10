import { Link } from "react-router-dom";
import {
  Smartphone, Scale, ShieldCheck, FileCheck2, Store, Ship, Coffee, Landmark, Users,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { usePageMeta } from "../hooks/usePageMeta";
import Reveal from "../components/Reveal";
import LeadForm from "../components/site/LeadForm";
import PassportPreview from "../components/site/PassportPreview";
import EudrDeadline from "../components/site/EudrDeadline";
import { CheckList, Faq, Feature, SectionHead, TextLink } from "../components/site/marketing";
import heroImage from "../assets/landing/origin-sidama.webp";

export default function Exporters() {
  usePageMeta(
    "For Ethiopian exporters",
    "Map your farms, build traceable lots and hand EU buyers a complete EUDR evidence package. Beersheba is the export operating system for Ethiopian coffee.",
  );

  return (
    <AppShell footer>
      <section className="container-editorial mk-hero">
        <Reveal>
          <span className="mk-pill"><Users size={14} aria-hidden /> For exporters, cooperatives and unions</span>
          <h1 className="mk-h1">Sell to Europe with the <span className="mk-gradient">proof already done.</span></h1>
          <p className="mk-lead">
            EU buyers now need plot-level proof for every Ethiopian lot. Beersheba lets you map your farms, trace cherry to the lot,
            and hand importers a complete EUDR evidence package — then sell to them directly.
          </p>
          <div className="mk-actions">
            <a href="#contact" className="mk-btn mk-btn-primary">Talk to us</a>
            <TextLink to="/pricing">See pricing</TextLink>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="mk-hero-media">
            <img src={heroImage} alt="Coffee cherries drying on raised beds in Sidama, Ethiopia" loading="eager" decoding="async" />
          </div>
        </Reveal>
      </section>

      <section className="container-editorial mk-section">
        <Reveal><EudrDeadline /></Reveal>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="The problem" title="Great coffee is losing buyers to missing paperwork." sub="Most Ethiopian coffee comes from smallholders with plots under two hectares, blended into lots of many farms. EUDR needs the location of every one of those plots, a risk assessment, and records kept for years. Spreadsheets and consultants don't scale to that, and buyers who can't get the evidence buy elsewhere." />
        </Reveal>
      </section>

      <section className="container-editorial mk-section" id="features">
        <Reveal>
          <SectionHead kicker="What you get" title="One system from farm to FOB." />
        </Reveal>
        <div className="mk-grid mk-grid-3">
          {[
            { icon: <Smartphone size={20} />, t: "Field mapping app", d: "Field agents register producers, record consent and walk plot boundaries on a phone — even with no signal. Data syncs when they're back online." },
            { icon: <Scale size={20} />, t: "Cherry intake to lot", d: "Record every cherry delivery at the washing station, so each lot knows which plots it came from and in what volume." },
            { icon: <ShieldCheck size={20} />, t: "Seven compliance gates", d: "GPS, deforestation, EUDR, phytosanitary, ECTA licence, NBE FX and floor price — checked automatically, with a tamper-evident log." },
            { icon: <FileCheck2 size={20} />, t: "EUDR evidence package", d: "Geolocation and evidence your EU importer needs to file their due diligence statement, generated from the data you already captured." },
            { icon: <Store size={20} />, t: "A marketplace of EU buyers", d: "List export-ready lots, answer sample requests and receive offers from importers and roasters looking for traceable Ethiopian coffee." },
            { icon: <Ship size={20} />, t: "Contracts and shipments", d: "Contracts, shipment milestones and the export document checklist in one place, shared with your buyer and forwarder." },
            { icon: <Coffee size={20} />, t: "Quality records", d: "SCA cupping (CVA and classic forms), green analysis and cupping sessions, so buyers see quality data next to compliance data." },
            { icon: <Landmark size={20} />, t: "Payments and FX", d: "Track payments and the NBE foreign-exchange rules for every contract, without a separate spreadsheet." },
            { icon: <Users size={20} />, t: "Your whole team", d: "Invite colleagues, field agents and washing-station staff, each with the right level of access." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 70}><Feature icon={f.icon} title={f.t}>{f.d}</Feature></Reveal>
          ))}
        </div>
      </section>

      <section className="container-editorial mk-section" id="how">
        <Reveal>
          <SectionHead kicker="How it works" title="From first plot to first container." />
        </Reveal>
        <div className="mk-steps mk-grid-2" style={{ display: "grid" }}>
          {[
            ["Map your supply", "Register producers and their plots with the field app. Consent is recorded with each farmer."],
            ["Trace cherry into lots", "Log deliveries at the washing station. Every lot carries the plots and volumes behind it."],
            ["Pass the seven gates", "Upload your licence and certificates. The platform checks each gate and shows exactly what's missing."],
            ["Sell and ship", "Export-ready lots earn a Green Passport and list on the marketplace. Buyers get the evidence with the coffee."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 70}>
              <div className="mk-card mk-step">
                <h3 className="mk-h3">{t}</h3>
                <p className="mk-body" style={{ marginTop: 6 }}>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="The Green Passport" title="What your buyers will see." sub="Every export-ready lot carries a passport: seven gates, the plots behind it, quality data and an audit trail. Click a gate to see the evidence." />
        </Reveal>
        <Reveal delay={100}><div style={{ marginTop: 36 }}><PassportPreview /></div></Reveal>
      </section>

      <section className="container-editorial mk-section">
        <Reveal>
          <SectionHead kicker="Questions" title="Exporters ask us." />
          <Faq items={[
            { q: "Do our farmers need smartphones?", a: "No. Your field agents or cooperative staff map plots and register farmers on their behalf with the field app, which also works offline." },
            { q: "Do I file the due diligence statement?", a: <>No. Under EUDR the operator who first places the coffee on the EU market, normally your importer, files it. Your job is to give them complete, accurate evidence. Beersheba produces it from your data. The <Link to="/eudr" style={{ color: "var(--color-forest)" }}>EUDR guide</Link> explains who does what.</> },
            { q: "Can lots bought through ECX get a Green Passport?", a: "Coffee blended at ECX auctions loses the link to its plots, so it can't be traced to them. Direct-trade and vertically integrated lots, where you know the farms, can." },
            { q: "Who owns our data?", a: "You do. Your producers' personal data is only shared with buyers where it's needed for EUDR and where consent is recorded. Plot locations go to the importer who files the statement." },
            { q: "How does this fit with ECTA's national traceability system?", a: "Beersheba works alongside it. ECTA's system registers farms nationally; Beersheba runs your day-to-day export operations and the evidence your buyers need. We plan to exchange data with it as integration opens up." },
            { q: "What does it cost?", a: <>Exporters pay a subscription sized to their volume. <Link to="/pricing" style={{ color: "var(--color-forest)" }}>See pricing</Link> or ask us below.</> },
          ]} />
        </Reveal>
      </section>

      <section className="container-editorial mk-section" id="contact">
        <div className="mk-card" style={{ padding: "clamp(28px, 5vw, 56px)", display: "grid", gap: "clamp(28px, 4vw, 56px)", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 1.2fr)" }}>
          <div>
            <SectionHead kicker="Get started" title="Get your next harvest EUDR-ready." />
            <CheckList items={[
              "A walkthrough with your own lots and farms",
              "A plan for mapping your supply before your buyers' deadline",
              "Pricing for your volume",
            ]} />
          </div>
          <LeadForm defaultRole="exporter" cta="Talk to us" messageHint="How many farmers or plots supply you, and which EU buyers are you selling to?" />
        </div>
      </section>
      <style>{`@media (max-width: 880px){ #contact > .mk-card { grid-template-columns: 1fr !important; } }`}</style>
    </AppShell>
  );
}
