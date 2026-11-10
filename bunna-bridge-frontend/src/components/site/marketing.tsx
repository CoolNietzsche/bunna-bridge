// Shared building blocks for the public marketing pages.
// Styles live in src/styles/marketing.css (imported once here).
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronRight, Plus } from "lucide-react";
import "../../styles/marketing.css";

export function SectionHead({ kicker, title, sub, center = false }: { kicker?: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mk-center" : undefined}>
      {kicker && <span className="mk-kicker">{kicker}</span>}
      <h2 className="mk-h2">{title}</h2>
      {sub && <p className="mk-sub">{sub}</p>}
    </div>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="mk-link">
      {children} <ChevronRight size={18} />
    </Link>
  );
}

export function CheckList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mk-checks">
      {items.map((it, i) => (
        <li key={i}><CheckCircle2 size={18} aria-hidden /> <span>{it}</span></li>
      ))}
    </ul>
  );
}

export function Feature({ icon, title, children, solid = false }: { icon: ReactNode; title: string; children: ReactNode; solid?: boolean }) {
  return (
    <div className="mk-card mk-feature">
      <span className={`mk-icon${solid ? " mk-icon-solid" : ""}`} aria-hidden>{icon}</span>
      <h3 className="mk-h3">{title}</h3>
      <p className="mk-body">{children}</p>
    </div>
  );
}

export interface FaqItem { q: string; a: ReactNode }

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mk-faq">
      {items.map((it) => (
        <details key={it.q}>
          <summary>{it.q}<Plus size={20} aria-hidden /></summary>
          <div className="mk-faq-a mk-body">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

/** Concentric contour lines: highland terrain motif for dark bands. */
export function Contours({ style }: { style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 700 700" style={{ position: "absolute", pointerEvents: "none", ...style }}>
      {[110, 165, 220, 275, 330].map((r, i) => (
        <circle key={r} cx="440" cy="470" r={r} fill="none" stroke={i % 2 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.12)"} strokeWidth="1.2" />
      ))}
    </svg>
  );
}
