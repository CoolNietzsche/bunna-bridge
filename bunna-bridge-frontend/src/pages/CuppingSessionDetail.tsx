import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Eye, Lock, Plus, Trash2, Unlock, Upload } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import CvaForm from "../components/quality/CvaForm";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate } from "../components/trace/styles";
import {
  addSessionGrader, addSessionSample, getSession, label, publishSessionSample, removeSessionGrader, removeSessionSample,
  scoreSessionSample, setSessionStatus,
} from "../api/quality";
import type { SessionDetail } from "../api/quality";
import { getLots } from "../api/lots";
import { apiError } from "../api/traceability";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

export default function CuppingSessionDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { data: s } = useQuery({ queryKey: ["session", id], queryFn: () => getSession(id) });
  const [error, setError] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["session", id] });
  const act = async (fn: () => Promise<unknown>) => { setError(""); try { await fn(); refresh(); } catch (e) { setError(apiError(e)); } };
  if (!s) return <AdminShell><Muted style={{ padding: 48, textAlign: "center" }}>Loading…</Muted></AdminShell>;

  return (
    <AdminShell>
      <Link to="/cupping-sessions" style={{ ...AC.btnGhost, display: "inline-flex", marginBottom: 14, textDecoration: "none" }}><ArrowLeft size={14} /> Sessions</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <p style={AC.eyebrow}>Cupping session{s.blind ? " · blind" : ""}</p>
          <h1 style={{ ...AC.pageTitle, marginTop: 4 }}>{s.name}</h1>
          <p style={AC.pageSubtitle}>{formatDate(s.held_on)}{s.location ? ` · ${s.location}` : ""} · organised by {s.owner_name}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill tone={s.status === "revealed" ? "green" : s.status === "closed" ? "blue" : "yellow"}>{s.status_label}</Pill>
          {s.is_organiser && s.status === "open" && <button style={AC.btnGhost} onClick={() => act(() => setSessionStatus(id, "closed"))}><Lock size={14} /> Close scoring</button>}
          {s.is_organiser && s.status === "closed" && (
            <>
              <button style={AC.btnGhost} onClick={() => act(() => setSessionStatus(id, "open"))}><Unlock size={14} /> Reopen</button>
              <button style={AC.btnPrimary} onClick={() => act(() => setSessionStatus(id, "revealed"))}><Eye size={14} /> Reveal results</button>
            </>
          )}
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {s.is_organiser && s.status === "open" && <Setup s={s} act={act} />}
      {s.is_grader && s.status === "open" && <GraderTable s={s} onSaved={refresh} />}
      {s.results && <Results s={s} act={act} />}
      {!s.is_grader && !s.is_organiser && <Muted>You have no seat in this session.</Muted>}
    </AdminShell>
  );
}

function Setup({ s, act }: { s: SessionDetail; act: (fn: () => Promise<unknown>) => void }) {
  const { data: lots } = useQuery({ queryKey: ["lots", "session-picker"], queryFn: () => getLots({ marketplace: "1", page_size: "200" }) });
  const { data: mine } = useQuery({ queryKey: ["lots", "session-own"], queryFn: () => getLots({ page_size: "200" }) });
  const [lot, setLot] = useState("");
  const [labelText, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const options = [...(mine?.results ?? []), ...(lots?.results ?? [])].filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))", gap: 20, marginBottom: 20 }}>
      <div style={{ ...AC.card, ...AC.cardPad }}>
        <p style={{ ...AC.cardTitle, marginBottom: 8 }}>Cups on the table ({s.samples.length})</p>
        {s.samples.map((x) => (
          <div key={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${AT.color.borderLight}`, fontFamily: AT.font.sans, fontSize: "0.85rem" }}>
            <span><b style={{ fontFamily: AT.font.mono }}>{x.code}</b> · {x.name}</span>
            <button style={AC.btnSm} aria-label={`Remove ${x.code}`} onClick={() => act(() => removeSessionSample(s.id, x.id))}><Trash2 size={12} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <select aria-label="Lot to add" style={{ ...AC.input, flex: 1, minWidth: 180 }} value={lot} onChange={(e) => setLot(e.target.value)}>
            <option value="">Add a lot…</option>
            {options.map((l) => <option key={l.id} value={l.id}>{l.lot_id} — {l.name}</option>)}
          </select>
          <button style={AC.btnSm} disabled={!lot} onClick={() => { act(() => addSessionSample(s.id, { lot })); setLot(""); }}><Plus size={12} /> Add</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input aria-label="Other sample" style={{ ...AC.input, flex: 1 }} placeholder="…or another sample, e.g. 'Guji offer sample 3'" value={labelText} onChange={(e) => setLabel(e.target.value)} />
          <button style={AC.btnSm} disabled={!labelText.trim()} onClick={() => { act(() => addSessionSample(s.id, { label: labelText })); setLabel(""); }}><Plus size={12} /> Add</button>
        </div>
      </div>
      <div style={{ ...AC.card, ...AC.cardPad }}>
        <p style={{ ...AC.cardTitle, marginBottom: 8 }}>Graders ({s.graders.length})</p>
        {s.graders.map((g) => (
          <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${AT.color.borderLight}`, fontFamily: AT.font.sans, fontSize: "0.85rem" }}>
            <span>{g.name} <span style={{ color: AT.color.textMuted }}>{g.email}</span></span>
            <button style={AC.btnSm} aria-label={`Remove ${g.email}`} onClick={() => act(() => removeSessionGrader(s.id, g.id))}><Trash2 size={12} /></button>
          </div>
        ))}
        <Field label="Invite a grader by email">
          <div style={{ display: "flex", gap: 6 }}>
            <input style={{ ...AC.input, flex: 1 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button style={AC.btnSm} disabled={!email} onClick={() => { act(() => addSessionGrader(s.id, email)); setEmail(""); }}><Plus size={12} /> Invite</button>
          </div>
        </Field>
        {s.results && <Muted>Scoring progress: {s.results.progress.done} of {s.results.progress.expected} cups.</Muted>}
      </div>
    </div>
  );
}

function GraderTable({ s, onSaved }: { s: SessionDetail; onSaved: () => void }) {
  const [active, setActive] = useState<number | null>(s.samples.find((x) => !x.my_assessment)?.id ?? s.samples[0]?.id ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sample = s.samples.find((x) => x.id === active);
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: 20 }}>
      <p style={{ ...AC.cardTitle, marginBottom: 10 }}>Your cups</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {s.samples.map((x) => (
          <button key={x.id} onClick={() => { setActive(x.id); setError(""); }} style={{ ...AC.btnSm, gap: 6, background: x.id === active ? AT.color.primaryLight : undefined, color: x.id === active ? AT.color.primaryDark : undefined }}>
            {x.my_assessment ? <CheckCircle2 size={13} color={AT.color.green} /> : null}
            <span style={{ fontFamily: AT.font.mono, fontWeight: 600 }}>{x.code}</span>
            {x.my_assessment && <span>{x.my_assessment.score}</span>}
          </button>
        ))}
      </div>
      {sample && (
        <div key={sample.id}>
          <p style={{ fontFamily: AT.font.sans, fontWeight: 600, margin: "0 0 8px" }}>Cup {sample.code}{sample.name ? ` — ${sample.name}` : ""}</p>
          <CvaForm initial={sample.my_assessment} busy={busy} error={error} submitLabel={sample.my_assessment ? "Update score" : "Save score"} onSubmit={async (v) => {
            setBusy(true); setError("");
            try {
              await scoreSessionSample(s.id, sample.id, v);
              onSaved();
              const next = s.samples.find((x) => x.id !== sample.id && !x.my_assessment);
              if (next) setActive(next.id);
            } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
          }} />
        </div>
      )}
      {s.samples.length === 0 && <Muted>The organiser has not added cups yet.</Muted>}
    </div>
  );
}

function Results({ s, act }: { s: SessionDetail; act: (fn: () => Promise<unknown>) => void }) {
  const r = s.results!;
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ ...AC.card, ...AC.cardPad }}>
        <p style={{ ...AC.cardTitle, marginBottom: 8 }}>{s.status === "revealed" ? "Results" : "Live results (only you can see these)"}</p>
        <div style={{ overflowX: "auto" }}>
          <table style={AC.table}>
            <thead><tr><th style={AC.th}>Cup</th><th style={AC.th}>Sample</th><th style={AC.th}>Panel mean</th><th style={AC.th}>Spread</th><th style={AC.th}>Graders</th><th style={AC.th}>Notes</th><th style={AC.th}></th></tr></thead>
            <tbody>
              {r.samples.map((x) => (
                <tr key={x.id}>
                  <td style={{ ...AC.td, fontFamily: AT.font.mono, fontWeight: 600 }}>{x.code}</td>
                  <td style={AC.td}>{x.name}</td>
                  <td style={{ ...AC.td, fontWeight: 600 }}>{x.mean ?? "—"}</td>
                  <td style={AC.td}>{x.sd !== null ? `±${x.sd} (${x.min}–${x.max})` : "—"}</td>
                  <td style={AC.td}>{x.n}</td>
                  <td style={{ ...AC.td, color: AT.color.textMuted }}>{x.descriptors.join(", ")}</td>
                  <td style={AC.td}>
                    {x.published_score !== null ? <Pill tone="green">On lot: {x.published_score}</Pill>
                      : s.is_organiser && s.status === "revealed" && x.lot && x.n >= 2 ? (
                        <button style={AC.btnSm} onClick={() => act(() => publishSessionSample(s.id, x.id))}><Upload size={12} /> Use as lot score</button>
                      ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ ...AC.card, ...AC.cardPad }}>
        <p style={{ ...AC.cardTitle, marginBottom: 4 }}>Grader calibration</p>
        <Muted style={{ marginBottom: 10 }}>Bias is how far a grader scores above (+) or below (−) the panel on average. A grader is calibrated when bias is within ±1.5 and the average deviation is 2 points or less.</Muted>
        <table style={AC.table}>
          <thead><tr><th style={AC.th}>Grader</th><th style={AC.th}>Cups</th><th style={AC.th}>Bias</th><th style={AC.th}>Avg. deviation</th><th style={AC.th}></th></tr></thead>
          <tbody>
            {r.graders.map((g) => (
              <tr key={g.grader}>
                <td style={AC.td}>{g.grader}</td>
                <td style={AC.td}>{g.cups}</td>
                <td style={AC.td}>{g.bias > 0 ? "+" : ""}{g.bias}</td>
                <td style={AC.td}>{g.mean_abs_deviation}</td>
                <td style={AC.td}><Pill tone={g.calibrated ? "green" : "yellow"}>{g.calibrated ? "Calibrated" : "Review"}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.samples.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table style={AC.table}>
              <thead><tr><th style={AC.th}>Cup</th>{Object.keys(r.samples[0].attributes).map((a) => <th key={a} style={AC.th}>{label(a)}</th>)}</tr></thead>
              <tbody>
                {r.samples.map((x) => (
                  <tr key={x.id}><td style={{ ...AC.td, fontFamily: AT.font.mono }}>{x.code}</td>{Object.values(x.attributes).map((v, i) => <td key={i} style={AC.td}>{v ?? "—"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
