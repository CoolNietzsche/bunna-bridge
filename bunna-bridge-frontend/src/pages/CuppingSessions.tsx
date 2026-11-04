import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Coffee, Plus, X } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import { createSession, getSessions } from "../api/quality";
import { apiError } from "../api/traceability";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const TONE = { open: "yellow", closed: "blue", revealed: "green" } as const;

export default function CuppingSessions() {
  const navigate = useNavigate();
  const { data = [] } = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", held_on: new Date().toISOString().slice(0, 10), location: "", blind: true });
  const [error, setError] = useState("");
  return (
    <AdminShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <p style={AC.eyebrow}>Quality</p>
          <h1 style={{ ...AC.pageTitle, marginTop: 4 }}>Cupping sessions</h1>
          <p style={AC.pageSubtitle}>Blind tables with several graders. Cups get random codes; lots are revealed after scoring, with each grader's calibration against the panel.</p>
        </div>
        {!open && <button style={AC.btnPrimary} onClick={() => setOpen(true)}><Plus size={14} /> New session</button>}
      </div>
      {open && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: 20 }}>
          <ErrorNote>{error}</ErrorNote>
          <div style={grid(180)}>
            <Field label="Name"><input style={AC.input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Sidama harvest calibration" /></Field>
            <Field label="Date"><input style={AC.input} type="date" value={f.held_on} onChange={(e) => setF({ ...f, held_on: e.target.value })} /></Field>
            <Field label="Location"><input style={AC.input} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: AT.font.sans, fontSize: "0.85rem", marginBottom: 12 }}>
            <input type="checkbox" checked={f.blind} onChange={(e) => setF({ ...f, blind: e.target.checked })} /> Blind — graders see codes only until results are revealed
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={AC.btnPrimary} disabled={!f.name} onClick={async () => {
              try { const s = await createSession(f); navigate(`/cupping-sessions/${s.id}`); } catch (e) { setError(apiError(e)); }
            }}><Check size={13} /> Create</button>
            <button style={AC.btnGhost} onClick={() => setOpen(false)}><X size={13} /></button>
          </div>
        </div>
      )}
      <div style={AC.card}>
        {data.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center" }}><Coffee size={26} color={AT.color.textDisabled} /><Muted style={{ marginTop: 8 }}>No sessions yet.</Muted></div>
        ) : (
          <table style={AC.table}>
            <thead><tr><th style={AC.th}>Session</th><th style={AC.th}>Date</th><th style={AC.th}>Organiser</th><th style={AC.th}>Cups</th><th style={AC.th}>Graders</th><th style={AC.th}>Status</th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} onClick={() => navigate(`/cupping-sessions/${s.id}`)} style={{ cursor: "pointer" }}>
                  <td style={{ ...AC.td, fontWeight: 500 }}>{s.name}{s.blind ? <span style={{ color: AT.color.textMuted }}> · blind</span> : ""}</td>
                  <td style={AC.td}>{formatDate(s.held_on)}</td>
                  <td style={AC.td}>{s.owner_name}</td>
                  <td style={AC.td}>{s.samples_count}</td>
                  <td style={AC.td}>{s.graders_count}</td>
                  <td style={AC.td}><Pill tone={TONE[s.status]}>{s.status_label}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
