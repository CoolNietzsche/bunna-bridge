import { Link } from "react-router-dom";
import { ShieldCheck, Leaf, BadgeCheck, Sprout, HandHeart, Mountain, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { T } from "../../styles/tokens";
import type { Selection } from "../../lib/catalog";

const ICONS: Record<string, ReactNode> = {
  eudr: <ShieldCheck size={20} />,
  green: <Leaf size={20} />,
  export: <BadgeCheck size={20} />,
  organic: <Sprout size={20} />,
  fairtrade: <HandHeart size={20} />,
  highaltitude: <Mountain size={20} />,
};

/** A curated "browse by selection" card. Count is omitted (not fabricated) when live data isn't available. */
export default function SelectionCard({ selection, count }: { selection: Selection; count?: number; key?: string | number }) {
  return (
    <Link
      to={`/marketplace?${selection.query}`}
      style={{
        display: "flex", flexDirection: "column", gap: "14px", padding: "22px",
        borderRadius: T.radius.lg, background: T.color.surface, border: `1px solid ${T.color.border}`,
        boxShadow: T.shadow.card, textDecoration: "none", transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadow.hover; e.currentTarget.style.borderColor = T.color.borderStrong; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow.card; e.currentTarget.style.borderColor = T.color.border; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ width: "44px", height: "44px", borderRadius: T.radius.md, background: T.color.forestLight, color: T.color.forest, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {ICONS[selection.key] ?? <Leaf size={20} />}
        </span>
        <ArrowUpRight size={16} style={{ color: T.color.textGhost }} />
      </div>
      <div>
        <h3 style={{ fontFamily: T.font.display, fontSize: "1.35rem", fontWeight: 500, color: T.color.ink, margin: "0 0 4px", lineHeight: 1.1 }}>
          {selection.label}
        </h3>
        <p style={{ fontFamily: T.font.sans, fontSize: "0.875rem", color: T.color.textMuted, margin: 0, lineHeight: 1.5 }}>
          {selection.description}
        </p>
      </div>
      {count != null && (
        <span style={{ marginTop: "auto", fontFamily: T.font.mono, fontSize: "0.66rem", letterSpacing: "0.08em", color: T.color.clay }}>
          {count} {count === 1 ? "lot" : "lots"}
        </span>
      )}
    </Link>
  );
}
