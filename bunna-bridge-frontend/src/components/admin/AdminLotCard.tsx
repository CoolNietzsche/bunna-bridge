import { useNavigate } from "react-router-dom";
import { MapPin, ShieldCheck, Heart } from "lucide-react";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";
import { titleCase, formatUsd, formatKg } from "../../lib/utils";
import { LotStatusBadge } from "./AdminStatusBadge";
import type { CoffeeLot } from "../../api/lots";

interface AdminLotCardProps {
  lot: CoffeeLot;
  isBuyer?: boolean;
  isWatched?: boolean;
  onToggleWatch?: (id: string) => void;
  key?: string | number;
}

/** Product-catalog card, Gentelella e-commerce style: flat surface, top accent, no photography. */
export default function AdminLotCard({ lot, isBuyer = false, isWatched = false, onToggleWatch }: AdminLotCardProps) {
  const navigate = useNavigate();
  const score = lot.latest_sca_score ?? (typeof lot.sca_score === "number" ? lot.sca_score : null);

  return (
    <article
      onClick={() => navigate(`/marketplace/${lot.id}`)}
      style={{ ...AC.card, cursor: "pointer", display: "flex", flexDirection: "column", overflow: "hidden", transition: "box-shadow 0.15s, transform 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = AT.shadow.hover; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = AT.shadow.card; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ height: "4px", background: lot.export_ready ? AT.color.primary : lot.eudr_dds_ready ? AT.color.yellow : AT.color.border }} />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: AT.font.mono, fontSize: "0.7rem", color: AT.color.textMuted }}>{lot.lot_id}</p>
            <h3 style={{ margin: "2px 0 0", fontFamily: AT.font.sans, fontSize: "1rem", fontWeight: 600, color: AT.color.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.name}</h3>
          </div>
          {score != null && (
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: "3px", background: AT.color.primaryLight, color: AT.color.primaryDark, fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 700, padding: "3px 9px", borderRadius: AT.radius.pill, flexShrink: 0 }}>
              {score.toFixed(1)}
            </span>
          )}
        </div>

        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textSecondary }}>
          <MapPin size={12} /> {titleCase(lot.region)} · {lot.processing} · {lot.grade}
        </span>

        {lot.flavor_tags?.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {lot.flavor_tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ padding: "2px 9px", borderRadius: AT.radius.pill, background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, fontFamily: AT.font.sans, fontSize: "0.7rem", color: AT.color.textSecondary }}>{tag}</span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {lot.is_eudr_ready && <span style={{ ...AC.status.base, ...AC.status.green }}><ShieldCheck size={11} /> EUDR</span>}
          <LotStatusBadge status={lot.status} />
        </div>

        <div style={{ marginTop: "auto", paddingTop: "10px", borderTop: `1px solid ${AT.color.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ margin: 0, fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textDisabled }}>FOB / KG</p>
            <p style={{ margin: 0, fontFamily: AT.font.sans, fontSize: "1.15rem", fontWeight: 700, color: AT.color.text }}>
              {lot.fob_price_usd ? formatUsd(lot.fob_price_usd) : "On request"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textDisabled }}>AVAILABLE</p>
            <p style={{ margin: 0, fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textSecondary, fontWeight: 500 }}>
              {formatKg(lot.available_qty_kg || lot.volume_kg)}
            </p>
          </div>
          {isBuyer && onToggleWatch && (
            <button
              aria-label={isWatched ? "Remove from watchlist" : "Add to watchlist"}
              onClick={(e) => { e.stopPropagation(); onToggleWatch(lot.id); }}
              style={{ width: "30px", height: "30px", borderRadius: AT.radius.md, border: `1px solid ${AT.color.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <Heart size={14} color={isWatched ? AT.color.red : AT.color.textMuted} fill={isWatched ? AT.color.red : "none"} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
