import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { T } from "../../styles/tokens";
import type { OriginSummary } from "../../lib/catalog";

/** A gradient "cover" card for a coffee origin (art-directed, no photography). */
export default function OriginCard({ origin }: { origin: OriginSummary; key?: string | number }) {
  return (
    <Link
      to={`/marketplace?origin=${origin.region}`}
      style={{
        display: "block", position: "relative", overflow: "hidden",
        borderRadius: T.radius.lg, minHeight: "200px", textDecoration: "none",
        background: origin.gradient, border: `1px solid ${T.color.border}`,
        boxShadow: T.shadow.card, transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadow.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow.card; }}
    >
      {/* botanical motif */}
      <svg viewBox="0 0 200 200" style={{ position: "absolute", right: "-30px", top: "-20px", width: "180px", height: "180px", opacity: 0.16 }}>
        <path d="M100 20c40-8 64 16 60 56-36 0-64-20-60-56Z" fill="#FFFFFF" />
        <path d="M110 52 160 24" stroke="#FFFFFF" strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,20,15,0.55), transparent 60%)" }} />
      <div style={{ position: "absolute", left: "18px", bottom: "16px", right: "18px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: T.font.mono, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
          <MapPin size={11} /> Ethiopia
        </span>
        <h3 style={{ fontFamily: T.font.display, fontSize: "1.6rem", fontWeight: 500, color: "#FFFFFF", margin: "4px 0 0", lineHeight: 1.05 }}>
          {origin.label}
        </h3>
        {origin.count != null && (
          <p style={{ fontFamily: T.font.mono, fontSize: "0.66rem", color: "rgba(255,255,255,0.75)", margin: "4px 0 0" }}>
            {origin.count} {origin.count === 1 ? "lot" : "lots"}
          </p>
        )}
      </div>
    </Link>
  );
}
