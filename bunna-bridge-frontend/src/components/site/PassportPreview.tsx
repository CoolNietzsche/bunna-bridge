import { useState, type ReactNode } from "react";
import {
  MapPin, Leaf, FileCheck2, ScanLine, ShieldCheck, Landmark, BadgeCheck, CheckCircle2, Coffee, QrCode,
} from "lucide-react";

interface Gate {
  label: string;
  icon: ReactNode;
  evidence: string;
  detail: string;
}

// An illustrative lot. The structure matches what the platform records for every real lot;
// the values are an example, and the card says so.
const GATES: Gate[] = [
  { label: "GPS boundary", icon: <MapPin size={17} />, evidence: "4 plots · 9.6 ha · mapped in the field",
    detail: "Every contributing plot is mapped with the field app, as a boundary or a GPS point. A plot over 4 ha must have a full boundary — a single point is not accepted, as EUDR requires." },
  { label: "Deforestation-free", icon: <Leaf size={17} />, evidence: "No tree-cover loss after 2020",
    detail: "Each plot is checked against satellite tree-cover-loss data (Hansen Global Forest Change) for any loss after the EUDR cut-off of 31 December 2020." },
  { label: "EUDR evidence package", icon: <FileCheck2 size={17} />, evidence: "GeoJSON + risk register, ready for the importer",
    detail: "The EU importer files the due diligence statement. Beersheba hands them the plot GeoJSON, the risk register with its mitigation and sign-off, and the supporting evidence." },
  { label: "Phytosanitary certificate", icon: <ScanLine size={17} />, evidence: "Valid certificate on file",
    detail: "The export health certificate is uploaded against the lot, and the gate closes again if it expires." },
  { label: "ECTA licence", icon: <ShieldCheck size={17} />, evidence: "Active exporter licence verified",
    detail: "The exporter's ECTA licence is reviewed by the Beersheba team before the lot can list." },
  { label: "NBE FX declaration", icon: <Landmark size={17} />, evidence: "Declaration filed",
    detail: "The foreign-exchange declaration required by the National Bank of Ethiopia is recorded." },
  { label: "ECTA floor price", icon: <BadgeCheck size={17} />, evidence: "Price at or above the minimum",
    detail: "The contract price is checked against ECTA's minimum export price for the grade and region." },
];

/** Interactive example of a Green Passport: click a gate to see the evidence behind it. */
export default function PassportPreview() {
  const [active, setActive] = useState(0);
  const gate = GATES[active];

  return (
    <div className="mk-card mk-passport">
      <div className="mk-passport-side">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
          <span className="mk-tag">Example lot · illustrative</span>
          <span className="mk-mono">BSH-YRG-2627-0142</span>
        </div>
        <h3 className="mk-h3" style={{ fontSize: "1.5rem", marginTop: 16, letterSpacing: "-0.025em" }}>Yirgacheffe Washed, Grade 1</h3>
        <p className="mk-body" style={{ marginTop: 4 }}>Gedeb · 2,050 m · Heirloom · 64 bags of 60 kg</p>

        <div role="group" aria-label="Compliance gates" style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
          {GATES.map((g, i) => (
            <button key={g.label} type="button" className="mk-gate-btn" aria-pressed={i === active} onClick={() => setActive(i)}>
              <span className="mk-icon" style={{ width: 32, height: 32, borderRadius: 10 }} aria-hidden>{g.icon}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: "0.92rem", fontWeight: 600, letterSpacing: "-0.01em" }}>{g.label}</span>
                <span style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.evidence}</span>
              </span>
              <CheckCircle2 size={18} className="mk-gate-ok" aria-label="passed" />
            </button>
          ))}
        </div>
      </div>

      <div className="mk-passport-map">
        <div style={{ padding: "clamp(24px, 3.4vw, 36px)", paddingBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="mk-icon mk-icon-solid" style={{ width: 40, height: 40 }} aria-hidden><CheckCircle2 size={20} /></span>
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: "1.05rem", color: "var(--color-ink)", letterSpacing: "-0.015em" }}>Green Passport</p>
              <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>7 of 7 gates passed · export ready</p>
            </div>
          </div>
        </div>

        <PlotMap />

        <div style={{ padding: "0 clamp(24px, 3.4vw, 36px) clamp(24px, 3.4vw, 36px)" }} aria-live="polite">
          <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "0.95rem", color: "var(--color-ink)" }}>{gate.label}</p>
          <p className="mk-body" style={{ marginTop: 6, fontSize: "0.9rem" }}>{gate.detail}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            <span className="mk-tag"><Coffee size={13} aria-hidden /> Cup score 87.25</span>
            <span className="mk-tag"><QrCode size={13} aria-hidden /> Public lot story</span>
            <span className="mk-tag">Tamper-evident audit trail</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Four smallholder plots drawn as polygons over contour lines. */
function PlotMap() {
  const plots = [
    "M70,62 L150,48 L178,104 L120,138 L64,118 Z",
    "M188,60 L262,74 L254,140 L196,128 Z",
    "M84,152 L150,148 L170,214 L96,226 L70,190 Z",
    "M184,150 L268,160 L276,222 L198,232 Z",
  ];
  return (
    <svg viewBox="0 0 340 270" role="img" aria-label="Map of four mapped coffee plots" style={{ width: "100%", height: "auto", display: "block", padding: "8px 12px" }}>
      {[40, 75, 110, 145, 180].map((r) => (
        <ellipse key={r} cx="170" cy="140" rx={r * 1.45} ry={r} fill="none" stroke="var(--color-border-strong)" strokeWidth="0.8" opacity="0.6" />
      ))}
      {plots.map((d, i) => (
        <g key={d}>
          <path d={d} fill="color-mix(in srgb, var(--color-forest) 16%, transparent)" stroke="none" />
          <path d={d} className="mk-plot-line" fill="none" stroke="var(--color-forest)" strokeWidth="2" strokeLinejoin="round" style={{ animationDelay: `${i * 0.35}s` }} />
        </g>
      ))}
      {[[121, 96], [225, 102], [120, 188], [231, 192]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="var(--color-forest)" />
          <text x={x + 8} y={y + 4} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-text-muted)">P{i + 1}</text>
        </g>
      ))}
      <text x="16" y="258" fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--color-text-faint)">5.9061° N, 38.2449° E · Gedeb, Gedeo zone</text>
    </svg>
  );
}
