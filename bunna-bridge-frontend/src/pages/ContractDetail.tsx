import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Circle, Download, FileSignature, Landmark, PenLine, Save, X } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import SamplesClaims from "../components/trade/SamplesClaims";
import ShipmentPanel from "../components/trade/ShipmentPanel";
import PaymentsPanel from "../components/trade/PaymentsPanel";
import ContractMessages from "../components/trade/ContractMessages";
import {
  STATUS_TONE, cancelContract, downloadContractPdf, getContract, registerContract, sendContract, signContract,
  updateContract, usd,
} from "../api/trade";
import type { Contract } from "../api/trade";
import { apiError } from "../api/traceability";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

export default function ContractDetail() {
  const { id = "" } = useParams();
  const { data: c, isLoading, isError } = useQuery({ queryKey: ["contract", id], queryFn: () => getContract(id) });
  if (isLoading) return <AdminShell><Muted style={{ padding: 48, textAlign: "center" }}>Loading…</Muted></AdminShell>;
  if (isError || !c) return <AdminShell><Muted style={{ padding: 48, textAlign: "center" }}>Contract not found.</Muted></AdminShell>;

  return (
    <AdminShell>
      <Link to="/contracts" style={{ ...AC.btnGhost, display: "inline-flex", marginBottom: 14, textDecoration: "none" }}><ArrowLeft size={14} /> Contracts</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <p style={AC.eyebrow}>Contract · {c.my_party === "seller" ? "you are selling" : c.my_party === "buyer" ? "you are buying" : c.my_party === "forwarder" ? "you are the forwarder" : "admin view"}</p>
          <h1 style={{ ...AC.pageTitle, marginTop: 4, fontFamily: AT.font.sans }}>{c.number}</h1>
          <p style={AC.pageSubtitle}>
            Lot {c.lot_code} — {c.lot_name} · {c.seller_name} → {c.buyer_name}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill tone={STATUS_TONE[c.status]}>{c.status_label}</Pill>
          <button style={AC.btnGhost} onClick={() => downloadContractPdf(c.id, c.number)}><Download size={14} /> PDF</button>
        </div>
      </div>

      <Progress c={c} />

      <div className="ct-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 20 }}>
          <TermsCard c={c} />
          {c.status !== "cancelled" && <ShipmentPanel contract={c} />}
          {c.status !== "cancelled" && c.status !== "draft" && <SamplesClaims contract={c} />}
        </div>
        <div style={{ display: "grid", gap: 20 }}>
          {c.status !== "cancelled" && <SignAndRegister c={c} />}
          {c.money && <PaymentsPanel contract={c} />}
          {(c.my_party === "seller" || c.my_party === "buyer") && <ContractMessages contract={c} />}
        </div>
      </div>
      <style>{`@media (max-width: 980px){ .ct-grid { grid-template-columns: 1fr !important; } }`}</style>
    </AdminShell>
  );
}

function Progress({ c }: { c: Contract }) {
  const steps = [
    ["Terms agreed", !!c.buyer_signed_at],
    ["ECTA registered", !!c.ecta_registration_number],
    ["Sample approved", c.pss_approved || !c.pss_required],
    ["Shipped", c.status === "shipped" || c.status === "completed"],
    ["Delivered", c.status === "completed"],
    ["Paid", !!c.money && Number(c.money.outstanding_usd) === 0 && Number(c.money.received_usd) > 0],
  ] as const;
  if (c.status === "cancelled") {
    return <div style={{ ...AC.card, ...AC.cardPad, marginBottom: 20 }}><Pill tone="red">Cancelled</Pill> <Muted style={{ display: "inline" }}>{c.cancelled_reason}</Muted></div>;
  }
  return (
    <div style={{ ...AC.card, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 18, flexWrap: "wrap" }}>
      {steps.map(([label, done]) => (
        <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: AT.font.sans, fontSize: "0.84rem", color: done ? AT.color.text : AT.color.textMuted }}>
          {done ? <CheckCircle2 size={16} color={AT.color.green} /> : <Circle size={16} color={AT.color.textDisabled} />} {label}
        </span>
      ))}
    </div>
  );
}

function TermsCard({ c }: { c: Contract }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState(() => ({
    quantity_kg: c.quantity_kg, price_usd_per_kg: c.price_usd_per_kg, incoterm: c.incoterm, named_place: c.named_place,
    shipment_from: c.shipment_from ?? "", shipment_to: c.shipment_to ?? "", payment_terms: c.payment_terms,
    advance_percent: c.advance_percent, terms_basis: c.terms_basis, quality_spec: c.quality_spec,
    pss_required: c.pss_required, destination: c.destination, notes: c.notes,
  }));
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => updateContract(c.id, { ...f, shipment_from: f.shipment_from || null, shipment_to: f.shipment_to || null }),
    onSuccess: (data) => { qc.setQueryData(["contract", c.id], data); setEdit(false); setError(""); },
    onError: (e) => setError(apiError(e)),
  });
  const rows: [string, string][] = [
    ["Quantity", `${Number(c.quantity_kg).toLocaleString()} kg (${c.bags} bags of 60 kg)`],
    ["Price", `${usd(c.price_usd_per_kg, 4)}/kg ${c.incoterm} ${c.named_place}`],
    ["Contract value", usd(c.value_usd)],
    ["Shipment period", c.shipment_from ? `${formatDate(c.shipment_from)} – ${formatDate(c.shipment_to)}` : "Not set"],
    ["Payment", `${c.payment_terms_label}${Number(c.advance_percent) > 0 ? ` · ${c.advance_percent}% advance` : ""}`],
    ["Terms", c.terms_basis_label],
    ["Destination", c.destination || "—"],
    ["Quality", c.quality_spec || "—"],
    ["Pre-shipment sample", c.pss_required ? "Required before loading" : "Not required"],
    ["Other", c.notes || "—"],
  ];
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={AC.cardTitle}>Terms</p>
        {c.can_edit_terms && !edit && <button style={AC.btnSm} onClick={() => setEdit(true)}><PenLine size={12} /> Edit</button>}
      </div>
      {c.status === "sent" && c.can_edit_terms && <Muted style={{ marginBottom: 10, color: AT.color.yellow }}>Editing now will cancel your signature and the buyer will need to review again.</Muted>}
      <ErrorNote>{error}</ErrorNote>
      {edit ? (
        <>
          <div style={grid(170)}>
            <Field label="Quantity (kg)"><input style={AC.input} type="number" value={f.quantity_kg} onChange={(e) => setF({ ...f, quantity_kg: e.target.value })} /></Field>
            <Field label="Price (USD/kg)"><input style={AC.input} type="number" step="0.0001" value={f.price_usd_per_kg} onChange={(e) => setF({ ...f, price_usd_per_kg: e.target.value })} /></Field>
            <Field label="Incoterm">
              <select style={AC.input} value={f.incoterm} onChange={(e) => setF({ ...f, incoterm: e.target.value })}>
                {["FOB", "FCA", "CFR", "CIF", "DAP"].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Named place"><input style={AC.input} value={f.named_place} onChange={(e) => setF({ ...f, named_place: e.target.value })} /></Field>
            <Field label="Ship from"><input style={AC.input} type="date" value={f.shipment_from} onChange={(e) => setF({ ...f, shipment_from: e.target.value })} /></Field>
            <Field label="Ship by"><input style={AC.input} type="date" value={f.shipment_to} onChange={(e) => setF({ ...f, shipment_to: e.target.value })} /></Field>
            <Field label="Payment">
              <select style={AC.input} value={f.payment_terms} onChange={(e) => setF({ ...f, payment_terms: e.target.value })}>
                <option value="cad">Cash against documents</option><option value="lc">Letter of credit</option>
                <option value="advance">Advance payment</option><option value="advance_cad">Part advance, balance against documents</option>
              </select>
            </Field>
            {(f.payment_terms === "advance" || f.payment_terms === "advance_cad") && (
              <Field label="Advance (%)"><input style={AC.input} type="number" value={f.advance_percent} onChange={(e) => setF({ ...f, advance_percent: e.target.value })} /></Field>
            )}
            <Field label="General terms">
              <select style={AC.input} value={f.terms_basis} onChange={(e) => setF({ ...f, terms_basis: e.target.value })}>
                <option value="ecf">European Coffee Federation (ECF)</option><option value="gca">Green Coffee Association (GCA)</option><option value="custom">Written in this contract</option>
              </select>
            </Field>
            <Field label="Destination"><input style={AC.input} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} /></Field>
          </div>
          <Field label="Quality specification"><textarea style={{ ...AC.input, minHeight: 64 }} value={f.quality_spec} onChange={(e) => setF({ ...f, quality_spec: e.target.value })} /></Field>
          <Field label="Other terms"><textarea style={{ ...AC.input, minHeight: 48 }} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: AT.font.sans, fontSize: "0.85rem", marginBottom: 12 }}>
            <input type="checkbox" checked={f.pss_required} onChange={(e) => setF({ ...f, pss_required: e.target.checked })} /> Buyer must approve a pre-shipment sample
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={AC.btnPrimary} disabled={save.isPending} onClick={() => save.mutate()}><Save size={13} /> Save terms</button>
            <button style={AC.btnGhost} onClick={() => setEdit(false)}><X size={13} /> Cancel</button>
          </div>
        </>
      ) : (
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(120px, auto) 1fr", gap: "8px 16px", fontFamily: AT.font.sans, fontSize: "0.86rem" }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt style={{ color: AT.color.textMuted }}>{k}</dt>
              <dd style={{ margin: 0, color: AT.color.text, whiteSpace: "pre-wrap" }}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function SignAndRegister({ c }: { c: Contract }) {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const [reg, setReg] = useState({ number: "", date: new Date().toISOString().slice(0, 10) });
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const run = async (fn: () => Promise<Contract>) => {
    setError("");
    try { const data = await fn(); qc.setQueryData(["contract", c.id], { ...c, ...data }); qc.invalidateQueries({ queryKey: ["contract", c.id] }); }
    catch (e) { setError(apiError(e)); }
  };
  const seller = c.my_party === "seller" || c.my_party === "admin";
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, marginBottom: 10 }}>Signatures and ECTA</p>
      <ErrorNote>{error}</ErrorNote>
      <div style={{ display: "grid", gap: 6, marginBottom: 14, fontFamily: AT.font.sans, fontSize: "0.84rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{c.seller_signed_at ? <CheckCircle2 size={14} color={AT.color.green} /> : <Circle size={14} color={AT.color.textDisabled} />} Seller {c.seller_signed_at ? `signed ${formatDate(c.seller_signed_at)} · ${c.seller_signed_by_name}` : "not signed"}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{c.buyer_signed_at ? <CheckCircle2 size={14} color={AT.color.green} /> : <Circle size={14} color={AT.color.textDisabled} />} Buyer {c.buyer_signed_at ? `signed ${formatDate(c.buyer_signed_at)} · ${c.buyer_signed_by_name}` : "not signed"}</span>
      </div>
      {c.status === "draft" && seller && c.can_edit_terms && (
        <button style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center" }} onClick={() => run(() => sendContract(c.id))}>
          <FileSignature size={14} /> Sign and send to buyer
        </button>
      )}
      {c.status === "draft" && c.my_party === "buyer" && <Muted>The exporter is preparing the terms.</Muted>}
      {c.status === "sent" && c.my_party === "buyer" && (
        <>
          <Muted style={{ marginBottom: 8 }}>By signing you accept the terms on this page exactly as shown (fingerprint {c.terms_hash.slice(0, 12)}…).</Muted>
          <button style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center" }} onClick={() => run(() => signContract(c.id, c.terms_hash))}>
            <FileSignature size={14} /> Countersign contract
          </button>
        </>
      )}
      {c.status === "sent" && seller && <Muted>Waiting for the buyer to countersign.</Muted>}

      <div style={{ borderTop: `1px solid ${AT.color.borderLight}`, marginTop: 14, paddingTop: 14 }}>
        <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.84rem", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}><Landmark size={14} /> ECTA contract registration</p>
        <p style={{ ...AC.status.base, ...(c.floor_check.ok ? AC.status.green : AC.status.red), fontSize: "0.8rem", marginBottom: 8 }}>{c.floor_check.message}</p>
        {c.ecta_registration_number ? (
          <Muted>Registered as <b>{c.ecta_registration_number}</b> on {formatDate(c.ecta_registered_on)}.</Muted>
        ) : c.status === "signed" && seller ? (
          <>
            <div style={grid(150)}>
              <Field label="ECTA registration no."><input style={AC.input} value={reg.number} onChange={(e) => setReg({ ...reg, number: e.target.value })} /></Field>
              <Field label="Registered on"><input style={AC.input} type="date" value={reg.date} onChange={(e) => setReg({ ...reg, date: e.target.value })} /></Field>
            </div>
            <button style={{ ...AC.btnPrimary, opacity: c.floor_check.ok ? 1 : 0.5 }} disabled={!c.floor_check.ok || !reg.number} onClick={() => run(() => registerContract(c.id, reg.number, reg.date))}>
              <Landmark size={13} /> Record registration
            </button>
          </>
        ) : <Muted>Registered by the exporter after both parties sign.</Muted>}
      </div>

      {["draft", "sent"].includes(c.status) && (c.my_party === "seller" || c.my_party === "buyer") && (
        <div style={{ borderTop: `1px solid ${AT.color.borderLight}`, marginTop: 14, paddingTop: 12 }}>
          {!cancelling ? (
            <button style={{ ...AC.btnSm, color: AT.color.red }} onClick={() => setCancelling(true)}><Ban size={12} /> Cancel contract</button>
          ) : (
            <>
              <Field label="Reason"><input style={AC.input} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...AC.btnGhost, color: AT.color.red }} disabled={!reason.trim()} onClick={() => run(() => cancelContract(c.id, reason))}>Confirm cancellation</button>
                <button style={AC.btnGhost} onClick={() => setCancelling(false)}>Keep</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
