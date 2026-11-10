import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import AppShell from "../components/AppShell";
import { usePageMeta } from "../hooks/usePageMeta";
import Reveal from "../components/Reveal";
import EudrDeadline from "../components/site/EudrDeadline";
import { Contours } from "../components/site/marketing";

const TOC = [
  ["what", "What EUDR is"],
  ["dates", "Key dates"],
  ["who", "Who does what"],
  ["data", "What the importer needs"],
  ["ethiopia", "Ethiopia: standard risk"],
  ["origin", "The challenge at origin"],
  ["penalties", "Checks and penalties"],
  ["help", "How Beersheba helps"],
  ["sources", "Sources"],
] as const;

export default function Eudr() {
  usePageMeta(
    "EUDR guide for Ethiopian coffee",
    "What the EU Deforestation Regulation means for Ethiopian coffee: dates, who files the due diligence statement, geolocation rules, standard-risk status and penalties.",
  );

  return (
    <AppShell footer>
      <section className="container-editorial mk-hero mk-hero-solo">
        <Reveal>
          <span className="mk-pill"><BookOpen size={14} aria-hidden /> Guide · updated November 2026</span>
          <h1 className="mk-h1">EUDR and Ethiopian coffee, <span className="mk-gradient">in plain words.</span></h1>
          <p className="mk-lead" style={{ maxWidth: "56ch" }}>
            What the EU Deforestation Regulation asks for, who has to do what, and what it means for coffee grown on Ethiopia's smallholder farms.
          </p>
        </Reveal>
      </section>

      <section className="container-editorial" style={{ paddingTop: 48 }}>
        <Reveal><EudrDeadline /></Reveal>
      </section>

      <section className="container-editorial mk-section" style={{ paddingTop: 72 }}>
        <div className="mk-guide">
          <nav className="mk-toc" aria-label="On this page">
            <p className="mk-legend" style={{ margin: "0 0 8px" }}>On this page</p>
            {TOC.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>

          <article className="mk-prose">
            <h2 id="what" style={{ marginTop: 0 }}>What EUDR is</h2>
            <p>
              The EU Deforestation Regulation, <strong>Regulation (EU) 2023/1115</strong>, bans placing coffee (and cocoa, cattle, palm oil, rubber, soy and wood)
              on the EU market, or exporting it from the EU, unless it is:
            </p>
            <ul>
              <li><strong>deforestation-free</strong> — grown on land that was not deforested after <strong>31 December 2020</strong>;</li>
              <li><strong>legal</strong> — produced in line with the laws of the producing country, such as land use, labour, tax and environmental rules;</li>
              <li><strong>covered by a due diligence statement</strong> filed in the EU information system before the coffee is placed on the market.</li>
            </ul>
            <p>Green coffee and roasted coffee (HS 0901) are covered. Soluble coffee follows later.</p>

            <h2 id="dates">Key dates</h2>
            <div className="mk-timeline">
              <div><p style={{ margin: 0 }}><strong>31 December 2020</strong> — cut-off date. Coffee from land deforested after this date can't be sold in the EU.</p></div>
              <div className="mk-now"><p style={{ margin: 0 }}><strong>30 December 2026</strong> — the rules apply to large and medium operators and traders.</p></div>
              <div><p style={{ margin: 0 }}><strong>30 June 2027</strong> — the rules apply to micro and small operators.</p></div>
            </div>
            <p>
              The dates were moved twice, most recently by <strong>Regulation (EU) 2025/2650</strong>. The European Commission has said it does not plan another delay.
            </p>

            <h2 id="who">Who does what</h2>
            <p>
              Since the 2025 amendment, the <strong>due diligence statement is filed by the operator who first places the coffee on the EU market</strong> — normally the EU importer.
            </p>
            <ul>
              <li><strong>Ethiopian exporters</strong> are outside the EU, so they don't file. But an importer can't file without their data, so in practice <strong>no evidence means no sale</strong>.</li>
              <li><strong>EU importers</strong> collect the information, assess and mitigate the risk, file the statement and get a reference number.</li>
              <li><strong>Roasters and traders further down the chain</strong> keep the reference number of the statement and records of who they bought from and sold to.</li>
            </ul>
            <p>Everyone in the chain keeps their records for <strong>five years</strong>.</p>

            <h2 id="data">What the importer needs from origin</h2>
            <ul>
              <li><strong>Geolocation of every plot</strong> that contributed to the lot, in GeoJSON (WGS-84, at least six decimal places).</li>
              <li><strong>Plots of up to 4 hectares</strong> may be given as a single point. <strong>Plots over 4 hectares need a full boundary</strong> (a polygon).</li>
              <li>The <strong>quantity</strong>, the <strong>country of production</strong> and the <strong>dates or period of harvest</strong>.</li>
              <li>Evidence that the coffee is <strong>deforestation-free</strong> and was <strong>produced legally</strong>.</li>
              <li>Supplier and customer details, to keep the chain unbroken.</li>
            </ul>
            <div className="mk-note">
              A typical Ethiopian export lot blends coffee from many smallholders. The importer needs the location of <strong>every</strong> plot in it — not one point for the washing station.
            </div>

            <h2 id="ethiopia">Ethiopia: standard risk</h2>
            <p>
              The EU rates each country as low, standard or high risk (<strong>Implementing Regulation (EU) 2025/1093</strong>). <strong>Ethiopia is standard risk.</strong>
            </p>
            <p>
              That means importers <strong>can't use the simplified due diligence</strong> allowed for low-risk countries. For each Ethiopian lot they must collect the information
              above, <strong>assess the risk</strong> and, where the risk isn't negligible, <strong>mitigate it</strong> before filing — for example with satellite checks, field
              verification or supplier audits.
            </p>

            <h2 id="origin">The challenge at origin</h2>
            <ul>
              <li><strong>Millions of small farms.</strong> Most Ethiopian coffee comes from smallholders, most with under two hectares, often without formal maps.</li>
              <li><strong>Blending.</strong> Cherry from many farms is mixed at washing stations, and coffee sold through ECX auctions loses its link to the farms.</li>
              <li><strong>Forest coffee.</strong> Much Ethiopian coffee grows under forest canopy, which needs careful handling in deforestation checks.</li>
              <li><strong>Records over time.</strong> Plots, deliveries and consents need to be recorded each season and kept for years.</li>
            </ul>
            <p>
              ECTA's national traceability system registers farms and batches across the country. Exporters still need their own records of which plots went into which lot,
              in a form their EU buyers can use.
            </p>

            <h2 id="penalties">Checks and penalties</h2>
            <p>
              EU member states must check a share of operators every year — <strong>at least 3% of operators</strong> placing products from standard-risk countries on the market.
              Penalties are set nationally but must include:
            </p>
            <ul>
              <li>fines with a maximum of <strong>at least 4% of the operator's total annual EU turnover</strong>;</li>
              <li><strong>confiscation</strong> of the products and of the revenue from them;</li>
              <li>temporary <strong>exclusion from public procurement</strong> and public funding.</li>
            </ul>
            <p>This is why EU buyers increasingly prefer origins and suppliers that can show the evidence up front.</p>

            <h2 id="help">How Beersheba helps</h2>
            <ul>
              <li><strong>Exporters</strong> map plots offline, record consent and cherry deliveries, and build lots that know exactly which plots they came from.</li>
              <li>Every plot is <strong>validated</strong> (format, area, the 4-hectare polygon rule) and <strong>checked against satellite tree-cover-loss data</strong> for loss after 2020.</li>
              <li>A <strong>risk register</strong> flags issues automatically and records how each one was mitigated and who signed it off.</li>
              <li><strong>Importers</strong> download a complete evidence package with the plot GeoJSON, then record their statement's reference number for roasters downstream.</li>
            </ul>
            <div className="mk-actions">
              <Link to="/exporters" className="mk-btn mk-btn-primary">For exporters</Link>
              <Link to="/buyers" className="mk-link">For importers and roasters</Link>
            </div>

            <h2 id="sources">Sources</h2>
            <ul>
              <li>Regulation (EU) 2023/1115 on deforestation-free products (EUDR).</li>
              <li>Regulation (EU) 2025/2650, amending the application dates and simplifying obligations downstream.</li>
              <li>Commission Implementing Regulation (EU) 2025/1093, country benchmarking.</li>
              <li>European Commission EUDR guidance and FAQ.</li>
            </ul>
            <p style={{ fontSize: "0.88rem" }}>
              This guide is a plain-language summary for orientation, not legal advice. Check the regulation and your own legal advisers before acting on it.
            </p>
          </article>
        </div>
      </section>

      <section className="container-editorial mk-section">
        <div className="mk-band">
          <Contours style={{ top: "-28%", right: "-16%", width: 460 }} />
          <div style={{ position: "relative", maxWidth: 640 }}>
            <span className="mk-kicker">Ready before the deadline</span>
            <h2 className="mk-h2">Questions about your own supply chain?</h2>
            <p className="mk-sub">Tell us where your coffee comes from and who you sell to. We'll show you what's needed and how fast you can get there.</p>
            <div className="mk-actions">
              <Link to="/contact" className="mk-btn mk-btn-light">Talk to us</Link>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
