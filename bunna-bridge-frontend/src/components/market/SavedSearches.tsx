import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Muted } from "../trace/ui";
import { formatDate } from "../trace/styles";
import { deleteSavedSearch, getSavedSearches, updateSavedSearch } from "../../api/market";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

const describe = (f: Record<string, string | number>) =>
  Object.entries(f).filter(([k]) => k !== "sort").map(([k, v]) => `${k === "minAltitude" ? "altitude ≥" : k}: ${v}`).join(" · ") || "All lots";

export default function SavedSearches() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["saved-searches"], queryFn: getSavedSearches });
  const refresh = () => qc.invalidateQueries({ queryKey: ["saved-searches"] });
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginTop: 20 }}>
      <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Search size={15} /> Saved searches</p>
      {data.length === 0 ? <Muted>Set filters on the <Link to="/marketplace" style={{ color: AT.color.primary }}>marketplace</Link> and choose “Save search & alert me”.</Muted> : data.map((s) => (
        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 0", borderTop: `1px solid ${AT.color.borderLight}` }}>
          <div>
            <p style={{ fontFamily: AT.font.sans, fontWeight: 500, margin: 0, color: AT.color.text }}>{s.name}</p>
            <Muted>{describe(s.filters)}{s.last_alerted_at ? ` · last alert ${formatDate(s.last_alerted_at)}` : ""}</Muted>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={AC.btnSm} aria-label={s.alert ? "Turn alerts off" : "Turn alerts on"} title={s.alert ? "Alerts on" : "Alerts off"}
              onClick={async () => { await updateSavedSearch(s.id, { alert: !s.alert }); refresh(); }}>
              {s.alert ? <Bell size={13} /> : <BellOff size={13} />}
            </button>
            <button style={AC.btnSm} aria-label="Delete saved search" onClick={async () => { await deleteSavedSearch(s.id); refresh(); }}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
