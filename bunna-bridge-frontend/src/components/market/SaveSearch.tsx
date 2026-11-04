import { useState } from "react";
import { BellPlus, Check, X } from "lucide-react";
import { saveSearch } from "../../api/market";
import { apiError } from "../../api/traceability";
import type { LotFilters } from "../../lib/catalog";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** Save the current marketplace filters and get notified when a new lot matches (M-4). */
export default function SaveSearch({ filters }: { filters: LotFilters }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const active = Object.entries(filters).filter(([k, v]) => k !== "sort" && v !== "" && v !== 0);
  if (!open) {
    return (
      <button style={AC.btnSm} onClick={() => { setOpen(true); setMsg(""); }} disabled={active.length === 0}
        title={active.length ? "Get notified when a new lot matches" : "Choose some filters first"}>
        <BellPlus size={13} /> Save search & alert me
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input aria-label="Search name" style={{ ...AC.input, width: 200 }} placeholder="e.g. Sidama naturals 87+" value={name} onChange={(e) => setName(e.target.value)} />
      <button style={AC.btnSm} disabled={!name.trim()} onClick={async () => {
        try {
          const s = await saveSearch(name, { ...filters });
          setMsg(`Saved. ${s.current_matches ?? 0} lot(s) match today; we'll notify you about new ones.`);
          setOpen(false); setName("");
        } catch (e) { setMsg(apiError(e)); }
      }}><Check size={13} /> Save</button>
      <button style={AC.btnSm} aria-label="Cancel" onClick={() => setOpen(false)}><X size={13} /></button>
      {msg && <span style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textMuted }}>{msg}</span>}
    </span>
  );
}
