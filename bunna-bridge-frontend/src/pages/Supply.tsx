import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, ChevronRight, Send, X } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import {
  cancelTransfer, createTransfer, formatEtb, getDeliveries, getExporterChoices, getTransfers, respondTransfer,
} from "../api/supply";
import type { Transfer } from "../api/supply";
import { apiError } from "../api/traceability";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const STATUS_TONE = { offered: "yellow", accepted: "green", rejected: "red", cancelled: "muted" } as const;

/** Coffee moving between organisations with its farm-level traceability attached. */
export default function Supply() {
  const { user } = useAuth();
  const isCoop = user?.role === "cooperative";
  const [params] = useSearchParams();
  const preselected = (params.get("deliveries") ?? "").split(",").filter(Boolean);
  const [tab, setTab] = useState<"incoming" | "outgoing">(isCoop ? "outgoing" : "incoming");
  const { data: transfers = [], isLoading } = useQuery({ queryKey: ["transfers", tab], queryFn: () => getTransfers(tab) });

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>Supply chain</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>{isCoop ? "Sales to exporters" : "Coffee from cooperatives"}</h1>
        <p style={AC.pageSubtitle}>
          {isCoop
            ? "Offer members' deliveries to an exporter. Each farmer's plot and consent travel with the coffee, so the exporter can prove EUDR origin."
            : "Cooperatives and unions offer you coffee with each farmer's plot attached. Accept, then use those plots as lot sources or allocate the deliveries to a lot."}
        </p>
      </div>
      <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
        {(["incoming", "outgoing"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...AC.btnSm, background: tab === t ? AT.color.primaryLight : "transparent", color: tab === t ? AT.color.primaryDark : AT.color.textSecondary }}>
            {t === "incoming" ? <><ArrowDownLeft size={13} /> Received</> : <><ArrowUpRight size={13} /> Sold</>}
          </button>
        ))}
      </div>
      {tab === "outgoing" && <NewSale preselected={preselected} />}
      <div style={{ display: "grid", gap: "12px" }}>
        {isLoading && <Muted>Loading…</Muted>}
        {!isLoading && transfers.length === 0 && (
          <div style={{ ...AC.card, ...AC.cardPad }}><Muted>{tab === "incoming" ? "No coffee offered to you yet." : "No sales yet."}</Muted></div>
        )}
        {transfers.map((t) => <TransferCard key={t.id} t={t} incoming={tab === "incoming"} />)}
      </div>
    </AdminShell>
  );
}

function TransferCard({ t, incoming }: { t: Transfer; incoming: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const act = async (fn: () => Promise<unknown>) => {
    setError("");
    try { await fn(); qc.invalidateQueries({ queryKey: ["transfers"] }); qc.invalidateQueries({ queryKey: ["deliveries"] }); }
    catch (e) { setError(apiError(e)); }
  };
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.95rem", color: AT.color.text, margin: 0 }}>
            {t.reference} · {Number(t.quantity_kg).toLocaleString()} kg {t.form}
          </p>
          <Muted style={{ marginTop: "2px" }}>
            {incoming ? `From ${t.seller_name}` : `To ${t.buyer_name}`} · {formatDate(t.created_at)} · {t.producers_count} farmers · {t.plots_count} mapped plots
            {t.price_per_kg_etb ? ` · ${formatEtb(t.price_per_kg_etb)}/kg` : ""}
          </Muted>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Pill tone={STATUS_TONE[t.status]}>{t.status_label}</Pill>
          {incoming && t.status === "offered" && (
            <>
              <button style={AC.btnPrimary} onClick={() => act(() => respondTransfer(t.id, "accept"))}><Check size={13} /> Accept</button>
              <button style={AC.btnGhost} onClick={() => act(() => respondTransfer(t.id, "reject"))}><X size={13} /> Reject</button>
            </>
          )}
          {!incoming && t.status === "offered" && (
            <button style={AC.btnGhost} onClick={() => act(() => cancelTransfer(t.id))}>Withdraw</button>
          )}
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      {t.notes && <Muted style={{ marginTop: "8px" }}>{t.notes}</Muted>}
      <button style={{ ...AC.btnSm, marginTop: "8px" }} onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {t.deliveries.length} deliveries · {Number(t.delivered_kg).toLocaleString()} kg
      </button>
      {open && (
        <div style={{ overflowX: "auto", marginTop: "8px" }}>
          <table style={AC.table}>
            <thead><tr><th style={AC.th}>Receipt</th><th style={AC.th}>Farmer</th><th style={AC.th}>Plot</th><th style={AC.th}>Weight</th><th style={AC.th}>In lot</th></tr></thead>
            <tbody>
              {t.deliveries.map((d) => (
                <tr key={d.id}>
                  <td style={{ ...AC.td, fontFamily: AT.font.mono }}>{d.receipt_number}</td>
                  <td style={AC.td}>{d.producer_name}</td>
                  <td style={AC.td}>{d.plot_name || (d.plot ? "Mapped" : "—")}</td>
                  <td style={AC.td}>{Number(d.weight_kg).toLocaleString()} kg</td>
                  <td style={AC.td}>{d.lot_code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {incoming && t.status === "accepted" && (
            <Muted style={{ marginTop: "8px" }}>Allocate these deliveries to a lot from Cherry intake, or add the plots under a lot's Supply sources.</Muted>
          )}
        </div>
      )}
    </div>
  );
}

function NewSale({ preselected }: { preselected: string[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(preselected.length > 0);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [form, setForm] = useState({ buyer: "", reference: "", form: "parchment", quantity_kg: "", price_per_kg_etb: "", notes: "" });
  const [picked, setPicked] = useState<Set<string>>(new Set(preselected));
  const [error, setError] = useState("");
  const { data: exporters = [] } = useQuery({ queryKey: ["exporter-choices", buyerSearch], queryFn: () => getExporterChoices(buyerSearch), enabled: open });
  const { data: stock } = useQuery({ queryKey: ["deliveries", "for-sale"], queryFn: () => getDeliveries({ unallocated: "1", available: "1" }), enabled: open });
  const available = useMemo(() => (stock?.results ?? []).filter((d) => d.plot && !d.transferred_to), [stock]);
  const pickedKg = available.filter((d) => picked.has(d.id)).reduce((s, d) => s + Number(d.weight_kg), 0);

  const save = useMutation({
    mutationFn: () => createTransfer({ ...form, buyer: Number(form.buyer), quantity_kg: form.quantity_kg || String(pickedKg), price_per_kg_etb: form.price_per_kg_etb || null, delivery_ids: [...picked] }),
    onSuccess: () => { setOpen(false); setPicked(new Set()); setError(""); qc.invalidateQueries({ queryKey: ["transfers"] }); qc.invalidateQueries({ queryKey: ["deliveries"] }); },
    onError: (e) => setError(apiError(e)),
  });

  if (!open) return <button style={{ ...AC.btnPrimary, marginBottom: "16px" }} onClick={() => setOpen(true)}><Send size={14} /> New sale</button>;
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "16px" }}>
      <p style={{ ...AC.cardTitle, marginBottom: "12px" }}>Offer coffee to an exporter</p>
      <ErrorNote>{error}</ErrorNote>
      <div style={grid(180)}>
        <Field label="Find exporter"><input style={AC.input} value={buyerSearch} onChange={(e) => setBuyerSearch(e.target.value)} placeholder="Company name" /></Field>
        <Field label="Exporter">
          <select style={AC.input} value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })}>
            <option value="">Choose…</option>
            {exporters.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Your reference"><input style={AC.input} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. BU-2026-014" /></Field>
        <Field label="Form">
          <select style={AC.input} value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })}>
            <option value="parchment">Parchment</option><option value="cherry">Red cherry</option><option value="dry_cherry">Dried cherry</option>
          </select>
        </Field>
        <Field label="Quantity sold (kg)" hint={`Selected deliveries: ${pickedKg.toLocaleString()} kg`}><input style={AC.input} type="number" value={form.quantity_kg} onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })} placeholder={String(pickedKg || "")} /></Field>
        <Field label="Price (ETB/kg)"><input style={AC.input} type="number" value={form.price_per_kg_etb} onChange={(e) => setForm({ ...form, price_per_kg_etb: e.target.value })} /></Field>
      </div>
      <Field label="Note"><input style={AC.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.82rem", margin: "4px 0 8px" }}>Deliveries in this sale</p>
      {available.length === 0 ? <Muted>No unsold deliveries with a mapped plot.</Muted> : (
        <div style={{ maxHeight: "240px", overflowY: "auto", border: `1px solid ${AT.color.borderLight}`, borderRadius: AT.radius.sm, marginBottom: "12px" }}>
          {available.map((d) => (
            <label key={d.id} style={{ display: "flex", gap: "8px", alignItems: "center", padding: "8px 10px", borderBottom: `1px solid ${AT.color.borderLight}`, fontFamily: AT.font.sans, fontSize: "0.82rem", cursor: "pointer" }}>
              <input type="checkbox" checked={picked.has(d.id)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; })} />
              <span style={{ fontFamily: AT.font.mono }}>{d.receipt_number}</span> {d.producer_name} · {Number(d.weight_kg).toLocaleString()} kg · {formatDate(d.delivered_on)}
            </label>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <button style={AC.btnPrimary} disabled={!form.buyer || !form.reference || picked.size === 0 || save.isPending} onClick={() => save.mutate()}>
          <Send size={13} /> Send offer
        </button>
        <button style={AC.btnGhost} onClick={() => setOpen(false)}><X size={13} /> Cancel</button>
      </div>
    </div>
  );
}
