import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FlaskConical, Plus, X } from "lucide-react";
import { ErrorNote, Field, Muted, Pill } from "../trace/ui";
import { formatDate, grid } from "../trace/styles";
import { decideSample, getClaims, getSamples, raiseClaim, respondClaim, sendSample, usd } from "../../api/trade";
import type { Contract } from "../../api/trade";
import { apiError } from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

const SAMPLE_TONE = { sent: "yellow", received: "blue", approved: "green", rejected: "red" } as const;
const CLAIM_TONE = { open: "yellow", accepted: "blue", rejected: "red", settled: "green" } as const;

/** Pre-shipment / arrival samples and arrival claims (T-3). */
export default function SamplesClaims({ contract: c }: { contract: Contract }) {
  const qc = useQueryClient();
  const { data: samples = [] } = useQuery({ queryKey: ["samples", c.id], queryFn: () => getSamples(c.id) });
  const { data: claims = [] } = useQuery({ queryKey: ["claims", c.id], queryFn: () => getClaims(c.id) });
  const [error, setError] = useState("");
  const [newSample, setNewSample] = useState<{ kind: string; courier: string; tracking_number: string; sent_on: string } | null>(null);
  const [decide, setDecide] = useState<{ id: number; cup_score: string; moisture_pct: string; notes: string } | null>(null);
  const [claim, setClaim] = useState<{ reason: string; description: string; amount_usd: string; file: File | null } | null>(null);
  const seller = c.my_party === "seller" || c.my_party === "admin";
  const buyer = c.my_party === "buyer" || c.my_party === "admin";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["samples", c.id] }); qc.invalidateQueries({ queryKey: ["claims", c.id] }); qc.invalidateQueries({ queryKey: ["contract", c.id] }); };
  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError("");
    try { await fn(); after?.(); refresh(); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6 }}><FlaskConical size={15} /> Samples and claims</p>
        {seller && !newSample && <button style={AC.btnSm} onClick={() => setNewSample({ kind: "pss", courier: "", tracking_number: "", sent_on: new Date().toISOString().slice(0, 10) })}><Plus size={12} /> Sample sent</button>}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {newSample && (
        <div style={{ background: AT.color.surfaceSecondary, padding: 12, borderRadius: AT.radius.sm, marginBottom: 12 }}>
          <div style={grid(150)}>
            <Field label="Sample">
              <select style={AC.input} value={newSample.kind} onChange={(e) => setNewSample({ ...newSample, kind: e.target.value })}>
                <option value="pss">Pre-shipment sample</option><option value="arrival">Arrival sample</option><option value="type">Type sample</option>
              </select>
            </Field>
            <Field label="Courier"><input style={AC.input} value={newSample.courier} onChange={(e) => setNewSample({ ...newSample, courier: e.target.value })} placeholder="DHL" /></Field>
            <Field label="Tracking no."><input style={AC.input} value={newSample.tracking_number} onChange={(e) => setNewSample({ ...newSample, tracking_number: e.target.value })} /></Field>
            <Field label="Sent on"><input style={AC.input} type="date" value={newSample.sent_on} onChange={(e) => setNewSample({ ...newSample, sent_on: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={AC.btnPrimary} onClick={() => run(() => sendSample(c.id, newSample), () => setNewSample(null))}><Check size={13} /> Save</button>
            <button style={AC.btnGhost} onClick={() => setNewSample(null)}><X size={13} /></button>
          </div>
        </div>
      )}
      {samples.length === 0 && !newSample && <Muted style={{ marginBottom: 10 }}>{c.pss_required ? "No pre-shipment sample sent yet — the buyer must approve one before loading." : "No samples."}</Muted>}
      {samples.map((s) => (
        <div key={s.id} style={{ padding: "10px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.86rem", color: AT.color.text }}>
              {s.kind_label} · {s.courier || "—"} {s.tracking_number} · {formatDate(s.sent_on)}
              {s.cup_score ? ` · cup ${s.cup_score}` : ""}{s.moisture_pct ? ` · ${s.moisture_pct}% moisture` : ""}
            </span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Pill tone={SAMPLE_TONE[s.status]}>{s.status_label}</Pill>
              {buyer && ["sent", "received"].includes(s.status) && !decide && (
                <button style={AC.btnSm} onClick={() => setDecide({ id: s.id, cup_score: "", moisture_pct: "", notes: "" })}>Evaluate</button>
              )}
            </span>
          </div>
          {s.buyer_notes && <Muted style={{ marginTop: 4 }}>{s.buyer_notes}</Muted>}
          {decide?.id === s.id && (
            <div style={{ marginTop: 8 }}>
              <div style={grid(130)}>
                <Field label="Cup score"><input style={AC.input} type="number" step="0.25" value={decide.cup_score} onChange={(e) => setDecide({ ...decide, cup_score: e.target.value })} /></Field>
                <Field label="Moisture %"><input style={AC.input} type="number" step="0.1" value={decide.moisture_pct} onChange={(e) => setDecide({ ...decide, moisture_pct: e.target.value })} /></Field>
              </div>
              <Field label="Notes"><input style={AC.input} value={decide.notes} onChange={(e) => setDecide({ ...decide, notes: e.target.value })} /></Field>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={AC.btnPrimary} onClick={() => run(() => decideSample(c.id, s.id, { ...decide, decision: "approved" }), () => setDecide(null))}><Check size={13} /> Approve</button>
                <button style={AC.btnGhost} onClick={() => run(() => decideSample(c.id, s.id, { ...decide, decision: "rejected" }), () => setDecide(null))}><X size={13} /> Reject</button>
                <button style={AC.btnGhost} onClick={() => run(() => decideSample(c.id, s.id, { ...decide, decision: "received" }), () => setDecide(null))}>Mark received</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {(c.status === "shipped" || c.status === "completed" || claims.length > 0) && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.84rem", margin: 0 }}>Claims</p>
            {buyer && !claim && ["shipped", "completed"].includes(c.status) && <button style={AC.btnSm} onClick={() => setClaim({ reason: "quality", description: "", amount_usd: "", file: null })}><Plus size={12} /> Raise claim</button>}
          </div>
          {claim && (
            <div style={{ background: AT.color.surfaceSecondary, padding: 12, borderRadius: AT.radius.sm, marginBottom: 10 }}>
              <div style={grid(150)}>
                <Field label="Reason">
                  <select style={AC.input} value={claim.reason} onChange={(e) => setClaim({ ...claim, reason: e.target.value })}>
                    <option value="quality">Quality below contract</option><option value="weight">Weight shortfall</option>
                    <option value="moisture">Moisture or damage</option><option value="delay">Late shipment</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Amount claimed (USD)"><input style={AC.input} type="number" value={claim.amount_usd} onChange={(e) => setClaim({ ...claim, amount_usd: e.target.value })} /></Field>
              </div>
              <Field label="What happened"><textarea style={{ ...AC.input, minHeight: 56 }} value={claim.description} onChange={(e) => setClaim({ ...claim, description: e.target.value })} /></Field>
              <label style={{ ...AC.btnGhost, cursor: "pointer", marginBottom: 8 }}>{claim.file ? claim.file.name : "Attach evidence"}
                <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setClaim({ ...claim, file: e.target.files?.[0] ?? null })} />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={AC.btnPrimary} disabled={!claim.description.trim()} onClick={() => {
                  const fd = new FormData();
                  fd.append("reason", claim.reason); fd.append("description", claim.description);
                  if (claim.amount_usd) fd.append("amount_usd", claim.amount_usd);
                  if (claim.file) fd.append("evidence", claim.file);
                  run(() => raiseClaim(c.id, fd), () => setClaim(null));
                }}><Check size={13} /> Submit claim</button>
                <button style={AC.btnGhost} onClick={() => setClaim(null)}><X size={13} /></button>
              </div>
            </div>
          )}
          {claims.length === 0 && !claim && <Muted>No claims.</Muted>}
          {claims.map((cl) => (
            <div key={cl.id} style={{ padding: "8px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: AT.font.sans, fontSize: "0.86rem", color: AT.color.text }}>{cl.reason_label} · {usd(cl.amount_usd)}</span>
                <Pill tone={CLAIM_TONE[cl.status]}>{cl.status_label}</Pill>
              </div>
              <Muted style={{ marginTop: 2 }}>{cl.description}</Muted>
              {cl.resolution && <Muted style={{ marginTop: 2, color: AT.color.textSecondary }}>Answer: {cl.resolution}</Muted>}
              {seller && cl.status === "open" && <ClaimAnswer onAnswer={(action, resolution) => run(() => respondClaim(c.id, cl.id, { action, resolution }))} />}
              {cl.status === "accepted" && <button style={{ ...AC.btnSm, marginTop: 6 }} onClick={() => run(() => respondClaim(c.id, cl.id, { action: "settle" }))}>Mark settled</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimAnswer({ onAnswer }: { onAnswer: (action: "accept" | "reject", resolution: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
      <input style={{ ...AC.input, flex: 1, minWidth: 160 }} placeholder="Your answer" value={text} onChange={(e) => setText(e.target.value)} aria-label="Answer to claim" />
      <button style={AC.btnSm} onClick={() => onAnswer("accept", text)}>Accept</button>
      <button style={AC.btnSm} onClick={() => onAnswer("reject", text)}>Reject</button>
    </div>
  );
}
