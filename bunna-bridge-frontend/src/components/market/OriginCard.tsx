import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { T } from "../../styles/tokens";
import type { OriginSummary } from "../../lib/catalog";

/** A cover card for a coffee origin — a photo when one exists, otherwise the art-directed gradient. */
export default function OriginCard({ origin, featured = false, image }: { origin: OriginSummary; featured?: boolean; image?: string; key?: string | number }) {
  return (
    <Link
      to={`/marketplace?origin=${origin.region}`}
      className="bb-origin-card"
      style={{
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        position: "relative", overflow: "hidden",
        borderRadius: T.radius.lg, minHeight: featured ? "100%" : "200px", height: "100%", textDecoration: "none",
        background: image ? T.color.forestDark : origin.gradient, border: `1px solid ${T.color.border}`,
        boxShadow: T.shadow.card, transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = T.shadow.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow.card; }}
    >
      {image && (
        <img
          src={image}
          alt={`${origin.label} coffee origin`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {/* Contour-line terrain motif — echoes the hero's topographic mark */}
      <svg viewBox="0 0 240 240" aria-hidden style={{ position: "absolute", right: featured ? "-20px" : "-40px", bottom: featured ? "-30px" : "-46px", width: featured ? "220px" : "170px", opacity: 0.28 }}>
        {[46, 70, 94, 118].map((r) => (
          <circle key={r} cx="120" cy="230" r={r} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, background: image ? "linear-gradient(to top, rgba(8,16,12,0.78), rgba(8,16,12,0.12) 55%, rgba(8,16,12,0.22))" : "linear-gradient(to top, rgba(8,16,12,0.62), transparent 62%)" }} />
      <div style={{ position: "relative", padding: featured ? "0 26px 26px" : "0 18px 16px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: T.font.mono, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
          <MapPin size={11} /> Ethiopia
        </span>
        <h3 style={{ fontFamily: T.font.display, fontSize: featured ? "clamp(1.9rem, 3vw, 2.6rem)" : "1.5rem", fontWeight: 500, color: "#FFFFFF", margin: "6px 0 0", lineHeight: 1.02 }}>
          {origin.label}
        </h3>
        {origin.count != null && (
          <p style={{ fontFamily: T.font.mono, fontSize: "0.66rem", color: "rgba(255,255,255,0.7)", margin: "6px 0 0" }}>
            {origin.count} {origin.count === 1 ? "lot" : "lots"}
          </p>
        )}
      </div>
    </Link>
  );
}
