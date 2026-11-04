import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, Plus, X } from "lucide-react";
import { ErrorNote, Field, Muted, Pill } from "../trace/ui";
import { formatDate, grid } from "../trace/styles";
import { addPayment, getPayments, updatePayment, usd } from "../../api/trade";
import type { Contract, PaymentRow } from "../../api/trade";
import { apiError } from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** Money received and the NBE 50% conversion (T-6). */
export default function PaymentsPanel({ contract: c }: { contract: Contract }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["payments", c.id], queryFn: () => getPayments(c.id) });
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ kind: c.payment_terms.startsWith("advance") ? "advance" : "balance", amount_usd: "", received_on: new Date().toISOString().slice(0, 10), bank: "", reference: "" });
  const [conv, setConv] = useState<{ id: number; converted_usd: string; rate_etb_per_usd: string; converted_on: string } | null>(null);
  const [error, setError] = useState("");
  const seller = c.my_party === "seller" || c.my_party === "admin";
  const s = data?.summary ?? c.money;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["payments", c.id] }); qc.invalidateQueries({ queryKey: ["contract", c.id] }); };
  if (!s) return null;
  const row = (label: string, value: string, strong = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontFamily: AT.font.sans, fontSize: "0.85rem" }}>
      <span style={{ color: AT.color.textMuted }}>{label}</span><span style={{ color: AT.color.text, fontWeight: strong ? 600 : 400 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6 }}><Banknote size={15} /> Payment</p>
        {Number(s.received_usd) > 0 && (s.nbe_conversion_ok ? <Pill tone="green">NBE 50% met</Pill> : <Pill tone="yellow">Convert {usd(s.conversion_shortfall_usd)}</Pill>)}
      </div>
      {row("Contract value", usd(s.contract_value_usd))}
      {Number(s.accepted_claims_usd) > 0 && row("Accepted claims", `− ${usd(s.accepted_claims_usd)}`)}
      {row("Received", usd(s.received_usd), true)}
      {row("Outstanding", usd(s.outstanding_usd), true)}
      {row("Converted to Birr", `${usd(s.converted_usd)}${Number(s.converted_etb) > 0 ? ` → ${Number(s.converted_etb).toLocaleString()} ETB` : ""}`)}
      {s.average_rate && row("Average rate", `${s.average_rate} ETB/USD`)}
      {row("Kept in USD", usd(s.retained_usd))}
      <Muted style={{ margin: "8px 0" }}>NBE requires 50% of export proceeds to be converted to Birr. Record each conversion at the bank's rate.</Muted>
      <ErrorNote>{error}</ErrorNote>
      {(data?.payments ?? []).map((p: PaymentRow) => (
        <div key={p.id} style={{ padding: "8px 0", borderTop: `1px solid ${AT.color.borderLight}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: AT.font.sans, fontSize: "0.84rem" }}>
            <span>{formatDate(p.received_on)} · {p.kind_label} · {p.bank || "—"} {p.reference}</span><strong>{usd(p.amount_usd)}</strong>
          </div>
          <Muted>{p.converted_usd ? `Converted ${usd(p.converted_usd)} at ${p.rate_etb_per_usd} = ${Number(p.converted_etb).toLocaleString()} ETB on ${formatDate(p.converted_on)}` : "Not converted yet"}</Muted>
          {seller && !p.converted_usd && conv?.id !== p.id && (
            <button style={{ ...AC.btnSm, marginTop: 4 }} onClick={() => setConv({ id: p.id, converted_usd: (Number(p.amount_usd) / 2).toFixed(2), rate_etb_per_usd: "", converted_on: new Date().toISOString().slice(0, 10) })}>Record conversion</button>
          )}
          {conv?.id === p.id && (
            <div style={{ marginTop: 6 }}>
              <div style={grid(120)}>
                <Field label="USD converted"><input style={AC.input} type="number" value={conv.converted_usd} onChange={(e) => setConv({ ...conv, converted_usd: e.target.value })} /></Field>
                <Field label="Rate (ETB/USD)"><input style={AC.input} type="number" step="0.0001" value={conv.rate_etb_per_usd} onChange={(e) => setConv({ ...conv, rate_etb_per_usd: e.target.value })} /></Field>
                <Field label="Date"><input style={AC.input} type="date" value={conv.converted_on} onChange={(e) => setConv({ ...conv, converted_on: e.target.value })} /></Field>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={AC.btnPrimary} onClick={async () => { try { await updatePayment(c.id, p.id, conv); setConv(null); refresh(); } catch (e) { setError(apiError(e)); } }}><Check size={13} /> Save</button>
                <button style={AC.btnGhost} onClick={() => setConv(null)}><X size={13} /></button>
              </div>
            </div>
          )}
        </div>
      ))}
      {seller && !adding && c.status !== "cancelled" && <button style={{ ...AC.btnSm, marginTop: 8 }} onClick={() => setAdding(true)}><Plus size={12} /> Payment received</button>}
      {adding && (
        <div style={{ marginTop: 8, background: AT.color.surfaceSecondary, padding: 12, borderRadius: AT.radius.sm }}>
          <div style={grid(130)}>
            <Field label="Type">
              <select style={AC.input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option value="advance">Advance</option><option value="balance">Balance / against documents</option><option value="lc">Letter of credit</option><option value="adjustment">Claim adjustment</option>
              </select>
            </Field>
            <Field label="Amount (USD)"><input style={AC.input} type="number" value={f.amount_usd} onChange={(e) => setF({ ...f, amount_usd: e.target.value })} /></Field>
            <Field label="Received on"><input style={AC.input} type="date" value={f.received_on} onChange={(e) => setF({ ...f, received_on: e.target.value })} /></Field>
            <Field label="Bank"><input style={AC.input} value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} placeholder="CBE" /></Field>
            <Field label="Reference"><input style={AC.input} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={AC.btnPrimary} disabled={!f.amount_usd} onClick={async () => { try { await addPayment(c.id, f); setAdding(false); refresh(); } catch (e) { setError(apiError(e)); } }}><Check size={13} /> Save</button>
            <button style={AC.btnGhost} onClick={() => setAdding(false)}><X size={13} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
