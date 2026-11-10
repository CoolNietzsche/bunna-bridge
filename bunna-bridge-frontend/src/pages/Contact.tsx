import { Mail, MapPin, Clock } from "lucide-react";
import AppShell from "../components/AppShell";
import { usePageMeta } from "../hooks/usePageMeta";
import Reveal from "../components/Reveal";
import LeadForm from "../components/site/LeadForm";

export default function Contact() {
  usePageMeta("Contact", "Talk to the Beersheba team about EUDR-ready Ethiopian coffee, for exporters, importers and roasters.");

  return (
    <AppShell footer>
      <section className="container-editorial mk-hero" style={{ alignItems: "start", gridTemplateColumns: "0.8fr 1.2fr" }}>
        <Reveal>
          <span className="mk-kicker">Contact</span>
          <h1 className="mk-h1">Let's talk <span className="mk-gradient">coffee.</span></h1>
          <p className="mk-lead">
            Exporting from Ethiopia, or buying for Europe? Tell us a little about you and we'll get back to you personally.
          </p>
          <ul className="mk-checks" style={{ marginTop: 32, gap: 18 }}>
            <li><Mail size={18} aria-hidden /> <span><a href="mailto:beersheba@paperless.et" style={{ color: "var(--color-forest)" }}>beersheba@paperless.et</a></span></li>
            <li><MapPin size={18} aria-hidden /> <span>Addis Ababa, Ethiopia</span></li>
            <li><Clock size={18} aria-hidden /> <span>Monday to Friday, East Africa Time (UTC+3)</span></li>
          </ul>
        </Reveal>
        <Reveal delay={100}>
          <div className="mk-card" style={{ padding: "clamp(24px, 4vw, 44px)" }}>
            <LeadForm cta="Send message" />
          </div>
        </Reveal>
      </section>
      <style>{`@media (max-width: 900px){ .mk-hero { grid-template-columns: 1fr !important; } }`}</style>
    </AppShell>
  );
}
