import { useNavigate } from "react-router-dom";
import { MapPin, ShieldCheck, Leaf, Sprout, Heart, ArrowRight } from "lucide-react";
import { T } from "../../styles/tokens";
import { originGradient, titleCase, formatUsd, formatKg } from "../../lib/utils";
import type { CoffeeLot } from "../../api/lots";

interface LotCardProps {
  lot: CoffeeLot;
  isBuyer?: boolean;
  isWatched?: boolean;
  onToggleWatch?: (id: string) => void;
  key?: string | number;
}

/** Art-directed marketplace lot card (per-origin gradient cover, no photos). */
export default function LotCard({ lot, isBuyer = false, isWatched = false, onToggleWatch }: LotCardProps) {
  const navigate = useNavigate();
  const score = lot.latest_sca_score ?? (typeof lot.sca_score === "number" ? lot.sca_score : null);
  const open = () => navigate(`/marketplace/${lot.id}`);

  return (
    <article
      onClick={open}
      style={{
        display: "flex", flexDirection: "column", cursor: "pointer", overflow: "hidden",
        background: T.color.surface, border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg, boxShadow: T.shadow.card,
        transition: "transform 0.18s, box-shadow 0.18s, border-color 0.18s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = T.shadow.hover; e.currentTarget.style.borderColor = T.color.borderStrong; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = T.shadow.card; e.currentTarget.style.borderColor = T.color.border; }}
    >
      {/* Cover */}
      <div style={{ position: "relative", height: "156px", background: originGradient(lot.region) }}>
        <svg viewBox="0 0 200 200" aria-hidden style={{ position: "absolute", right: "-24px", top: "-20px", width: "150px", opacity: 0.16 }}>
          <path d="M100 20c40-8 64 16 60 56-36 0-64-20-60-56Z" fill="#FFFFFF" />
        </svg>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,20,15,0.55), transparent 58%)" }} />
        <span style={{ position: "absolute", top: "12px", left: "12px", fontFamily: T.font.mono, fontSize: "0.58rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.28)", padding: "3px 9px", borderRadius: "999px" }}>
          {lot.lot_id}
        </span>
        {score != null && (
          <span style={{ position: "absolute", top: "12px", right: "12px", display: "inline-flex", alignItems: "baseline", gap: "3px", background: "rgba(255,255,255,0.94)", color: "#123A2E", fontFamily: T.font.mono, fontSize: "0.72rem", fontWeight: 500, padding: "4px 10px", borderRadius: "999px" }}>
            {score.toFixed(1)} <span style={{ fontSize: "0.5rem", opacity: 0.75 }}>SCA</span>
          </span>
        )}
        {isBuyer && onToggleWatch && (
          <button
            aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            onClick={(e) => { e.stopPropagation(); onToggleWatch(lot.id); }}
            style={{ position: "absolute", bottom: "12px", right: "12px", width: "34px", height: "34px", borderRadius: "999px", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Heart size={15} color={isWatched ? "#B23A2E" : "#6B6357"} fill={isWatched ? "#B23A2E" : "none"} />
          </button>
        )}
        <h3 style={{ position: "absolute", left: "14px", bottom: "12px", right: "58px", fontFamily: T.font.display, fontSize: "1.35rem", fontWeight: 500, color: "#FFFFFF", margin: 0, lineHeight: 1.08 }}>
          {lot.name}
        </h3>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: T.font.mono, fontSize: "0.6rem", letterSpacing: "0.06em", textTransform: "uppercase", color: T.color.textFaint }}>
          <MapPin size={11} /> {titleCase(lot.region)} · {lot.processing} · {lot.grade}
        </span>

        {lot.flavor_tags?.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {lot.flavor_tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ padding: "3px 10px", borderRadius: "999px", background: T.color.stone, border: `1px solid ${T.color.border}`, fontFamily: T.font.sans, fontSize: "0.72rem", color: T.color.ink }}>{tag}</span>
            ))}
          </div>
        )}

        {lot.tasting_notes && (
          <p style={{ fontFamily: T.font.sans, fontSize: "0.85rem", lineHeight: 1.5, color: T.color.textMuted, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {lot.tasting_notes}
          </p>
        )}

        {/* Compliance badges */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {lot.is_eudr_ready && <Badge icon={<ShieldCheck size={10} />} label="EUDR" />}
          {lot.green_passport_ready && <Badge icon={<Leaf size={10} />} label="Passport" />}
          {lot.is_organic && <Badge icon={<Sprout size={10} />} label="Organic" tone="matcha" />}
          <Badge label={`${lot.compliance_score ?? 0}/7 gates`} tone="neutral" />
        </div>

        {/* Price + availability */}
        <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: `1px solid ${T.color.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontFamily: T.font.mono, fontSize: "0.52rem", letterSpacing: "0.08em", color: T.color.textGhost, margin: "0 0 2px" }}>FOB / KG</p>
            <p style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 500, color: T.color.ink, margin: 0, lineHeight: 1 }}>
              {lot.fob_price_usd ? formatUsd(lot.fob_price_usd) : "On request"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: T.font.mono, fontSize: "0.52rem", letterSpacing: "0.08em", color: T.color.textGhost, margin: "0 0 2px" }}>AVAILABLE</p>
            <p style={{ fontFamily: T.font.mono, fontSize: "0.78rem", color: T.color.ink, margin: 0, fontWeight: 500 }}>
              {formatKg(lot.available_qty_kg || lot.volume_kg)}
            </p>
          </div>
        </div>

        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: T.font.sans, fontSize: "0.85rem", fontWeight: 600, color: T.color.forest }}>
          View lot story <ArrowRight size={15} />
        </span>
      </div>
    </article>
  );
}

function Badge({ icon, label, tone = "forest" }: { icon?: React.ReactNode; label: string; tone?: "forest" | "matcha" | "neutral" }) {
  const map = {
    forest: { bg: T.color.forestLight, fg: T.color.forest },
    matcha: { bg: T.color.forestLight, fg: T.color.matcha },
    neutral: { bg: T.color.stone, fg: T.color.slate },
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", background: map.bg, border: `1px solid ${T.color.border}`, fontFamily: T.font.mono, fontSize: "0.54rem", letterSpacing: "0.04em", color: map.fg, whiteSpace: "nowrap" }}>
      {icon} {label}
    </span>
  );
}
