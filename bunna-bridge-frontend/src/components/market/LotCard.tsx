import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, ShieldCheck, Sprout, Heart, ArrowRight, Mountain, BadgeCheck, Lock } from "lucide-react";
import { T } from "../../styles/tokens";
import { originGradient, titleCase, formatUsd, formatKg } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import type { CoffeeLot } from "../../api/lots";

interface LotCardProps {
  lot: CoffeeLot;
  showWatch?: boolean;
  isWatched?: boolean;
  onToggleWatch?: (id: string) => void;
}

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  listed:     { label: "Available",  bg: "rgba(255,255,255,0.94)", fg: "#123A2E" },
  contracted: { label: "Contracted", bg: "rgba(214,137,44,0.95)",  fg: "#1A1613" },
  exported:   { label: "Shipped",    bg: "rgba(26,22,19,0.75)",    fg: "#F8F5EF" },
};

/** Editorial marketplace card: farm photo (or origin gradient) cover, provenance, trust badges, price. */
export default function LotCard({ lot, showWatch = false, isWatched = false, onToggleWatch }: LotCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const rawScore = lot.latest_sca_score ?? lot.sca_score;
  const score = rawScore != null && rawScore !== "" ? Number(rawScore) : null;
  const cover = lot.farm_photos?.[0];
  const status = STATUS_LABEL[lot.status];
  const open = () => navigate(`/marketplace/${lot.id}`);

  const handleToggleWatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      const next = `${location.pathname}${location.search ? location.search + "&" : "?"}watchlist=${lot.id}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    onToggleWatch?.(lot.id);
  };

  return (
    <article
      className="bb-lot-card"
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter") open(); }}
      tabIndex={0}
      style={{
        display: "flex", flexDirection: "column", cursor: "pointer", overflow: "hidden",
        background: T.color.surface, border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.lg, boxShadow: T.shadow.card,
      }}
    >
      {/* Cover */}
      <div style={{ position: "relative", height: "180px", background: originGradient(lot.region), overflow: "hidden" }}>
        {cover ? (
          <img
            src={cover} alt={`${lot.name} — farm`} loading="lazy" className="bb-lot-card-img"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <svg viewBox="0 0 200 200" aria-hidden style={{ position: "absolute", right: "-24px", top: "-20px", width: "150px", opacity: 0.16 }}>
            <path d="M100 20c40-8 64 16 60 56-36 0-64-20-60-56Z" fill="#FFFFFF" />
          </svg>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,20,15,0.72), rgba(10,20,15,0.05) 62%)" }} />
        <div style={{ position: "absolute", top: "12px", left: "12px", right: "12px", display: "flex", justifyContent: "space-between", gap: "8px" }}>
          {status && (
            <span style={{ fontFamily: T.font.sans, fontSize: "0.74rem", fontWeight: 600, color: status.fg, background: status.bg, padding: "4px 10px", borderRadius: "999px" }}>
              {status.label}
            </span>
          )}
          {score != null && !Number.isNaN(score) && (
            <span title={lot.sca_verified ? "Confirmed by a licensed Q-grader" : "Exporter-reported score"} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(255,255,255,0.95)", color: "#123A2E", fontFamily: T.font.mono, fontSize: "0.74rem", fontWeight: 500, padding: "4px 10px", borderRadius: "999px" }}>
              {lot.sca_verified && <BadgeCheck size={12} />}
              {score.toFixed(1)} <span style={{ fontSize: "0.52rem", opacity: 0.7 }}>SCA</span>
            </span>
          )}
        </div>
        <div style={{ position: "absolute", left: "16px", right: showWatch ? "60px" : "16px", bottom: "14px" }}>
          <p style={{ fontFamily: T.font.mono, fontSize: "0.6rem", letterSpacing: "0.06em", color: "rgba(255,255,255,0.78)", margin: "0 0 4px" }}>{lot.lot_id}</p>
          <h3 style={{ fontFamily: T.font.display, fontSize: "1.45rem", fontWeight: 700, color: "#FFFFFF", margin: 0, lineHeight: 1.1, letterSpacing: "-0.025em" }}>
            {lot.name}
          </h3>
        </div>
        {showWatch && (
          <button
            aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
            onClick={handleToggleWatch}
            style={{ position: "absolute", bottom: "14px", right: "14px", width: "36px", height: "36px", borderRadius: "999px", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.94)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Heart size={15} color={isWatched ? "#B23A2E" : "#6B6357"} fill={isWatched ? "#B23A2E" : "none"} />
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontFamily: T.font.sans, fontSize: "0.74rem", fontWeight: 600, color: T.color.textFaint }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <MapPin size={11} /> {titleCase(lot.region === "other" ? lot.kebele || "Ethiopia" : lot.region)}
          </span>
          <span>{lot.processing} · {lot.grade}</span>
          {lot.altitude_m ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><Mountain size={11} /> {Number(lot.altitude_m).toLocaleString()} m</span>
          ) : null}
        </div>

        {lot.flavor_tags?.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {lot.flavor_tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ padding: "3px 10px", borderRadius: "999px", background: T.color.stone, border: `1px solid ${T.color.border}`, fontFamily: T.font.sans, fontSize: "0.74rem", color: T.color.ink }}>{tag}</span>
            ))}
          </div>
        )}

        {lot.tasting_notes && (
          <p style={{ fontFamily: T.font.sans, fontSize: "0.86rem", lineHeight: 1.5, color: T.color.textMuted, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {lot.tasting_notes}
          </p>
        )}

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {lot.deforestation_free && lot.gps_verified && <Badge icon={<ShieldCheck size={10} />} label="Deforestation-free" />}
          {lot.eudr_dds_ready && <Badge icon={<ShieldCheck size={10} />} label="EUDR DDS" />}
          {lot.is_organic && <Badge icon={<Sprout size={10} />} label="Organic" tone="matcha" />}
          {lot.is_fair_trade && <Badge label="Fair Trade" tone="matcha" />}
          <Badge label={`${lot.compliance_score ?? 0}/7 gates`} tone="neutral" />
        </div>

        <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: `1px solid ${T.color.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px" }}>
          <div>
            <p style={{ fontFamily: T.font.sans, fontSize: "0.7rem", fontWeight: 500, color: T.color.textFaint, margin: "0 0 3px" }}>FOB per kg</p>
            {isAuthenticated ? (
              <p style={{ fontFamily: T.font.display, fontSize: "1.55rem", fontWeight: 700, color: T.color.ink, margin: 0, lineHeight: 1, letterSpacing: "-0.03em" }}>
                {lot.fob_price_usd ? formatUsd(lot.fob_price_usd) : "On request"}
              </p>
            ) : (
              <p style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: T.font.sans, fontSize: "0.86rem", fontWeight: 600, color: T.color.forest, margin: 0 }}>
                <Lock size={13} /> Sign in for price
              </p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontFamily: T.font.sans, fontSize: "0.7rem", fontWeight: 500, color: T.color.textFaint, margin: "0 0 3px" }}>Available</p>
            <p style={{ fontFamily: T.font.mono, fontSize: "0.8rem", color: T.color.ink, margin: 0, fontWeight: 500 }}>
              {formatKg(lot.available_qty_kg || lot.volume_kg)}
            </p>
          </div>
        </div>

        <span className="bb-lot-card-cta" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: T.font.sans, fontSize: "0.86rem", fontWeight: 600, color: T.color.forest }}>
          View lot <ArrowRight size={15} />
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "999px", background: map.bg, border: `1px solid ${T.color.border}`, fontFamily: T.font.mono, fontSize: "0.56rem", letterSpacing: "0.04em", color: map.fg, whiteSpace: "nowrap" }}>
      {icon} {label}
    </span>
  );
}
