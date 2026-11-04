import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, Check, Plus, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import { createProgramme, getProgrammes } from "../api/market";
import { apiError } from "../api/traceability";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const TONE = { nominations: "blue", jury: "yellow", catalogue: "green", auction: "red", closed: "muted" } as const;

/** Beersheba Select — curated, jury-cupped, EUDR-ready lots (M-1). */
export default function Select() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data = [] } = useQuery({ queryKey: ["programmes"], queryFn: getProgrammes });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "Beersheba Select", season: "2026/27", nominations_close: "", min_jury_score: "86", description: "" });
  const [error, setError] = useState("");
  return (
    <AppShell>
      <div className="container-editorial" style={{ paddingBlock: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p style={AC.eyebrow}>Curated programme</p>
            <h1 style={{ ...AC.pageTitle, fontSize: "clamp(2rem, 4vw, 2.6rem)", marginTop: 4 }}>Beersheba Select</h1>
            <p style={AC.pageSubtitle}>The season's best Ethiopian lots: blind-cupped by an independent jury, EUDR-ready, and sold by timed auction.</p>
          </div>
          {user?.role === "admin" && !open && <button style={AC.btnPrimary} onClick={() => setOpen(true)}><Plus size={14} /> New programme</button>}
        </div>
        {open && (
          <div style={{ ...AC.card, ...AC.cardPad, marginBottom: 20 }}>
            <ErrorNote>{error}</ErrorNote>
            <div style={grid(170)}>
              <Field label="Name"><input style={AC.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
              <Field label="Season"><input style={AC.input} value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} /></Field>
              <Field label="Nominations close"><input style={AC.input} type="date" value={f.nominations_close} onChange={(e) => setF({ ...f, nominations_close: e.target.value })} /></Field>
              <Field label="Minimum jury score"><input style={AC.input} type="number" value={f.min_jury_score} onChange={(e) => setF({ ...f, min_jury_score: e.target.value })} /></Field>
            </div>
            <Field label="Description"><textarea style={{ ...AC.input, minHeight: 56 }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={AC.btnPrimary} disabled={!f.nominations_close} onClick={async () => {
                try { const p = await createProgramme(f); navigate(`/select/${p.id}`); } catch (e) { setError(apiError(e)); }
              }}><Check size={13} /> Create</button>
              <button style={AC.btnGhost} onClick={() => setOpen(false)}><X size={13} /></button>
            </div>
          </div>
        )}
        {data.length === 0 && <Muted>No Select programme yet.</Muted>}
        <div style={{ display: "grid", gap: 14 }}>
          {data.map((p) => (
            <button key={p.id} onClick={() => navigate(`/select/${p.id}`)} style={{ all: "unset", cursor: "pointer", ...AC.card, ...AC.cardPad, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Award size={26} color={AT.color.primary} />
                <span>
                  <span style={{ display: "block", fontFamily: AT.font.sans, fontWeight: 600, fontSize: "1.05rem", color: AT.color.text }}>{p.name} {p.season}</span>
                  <Muted>{p.selected_count} selected of {p.entries_count} nominated · minimum jury score {Number(p.min_jury_score)}{p.auction_ends ? ` · auction closes ${formatDate(p.auction_ends)}` : ` · nominations close ${formatDate(p.nominations_close)}`}</Muted>
                </span>
              </span>
              <Pill tone={TONE[p.status]}>{p.status_label}</Pill>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
