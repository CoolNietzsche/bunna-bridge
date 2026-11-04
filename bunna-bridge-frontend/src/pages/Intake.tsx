import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, PackagePlus, Plus, Scale, X } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import { allocateDeliveries, createDelivery, formatEtb, getDeliveries, updateDelivery } from "../api/supply";
import type { Delivery } from "../api/supply";
import { apiError, getPlots, getProducers } from "../api/traceability";
import { getWashingStations } from "../api/washingStations";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { producer: "", plot: "", station: "", form: "cherry", receipt_number: "", delivered_on: today(), weight_kg: "", price_per_kg_etb: "", amount_paid_etb: "", payment_reference: "" };

export default function Intake() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isCoop = user?.role === "cooperative";
  const [filter, setFilter] = useState<"all" | "unallocated" | "unpaid">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payFor, setPayFor] = useState<Delivery | null>(null);

  const params = filter === "all" ? {} : { [filter]: "1" };
  const { data, isLoading } = useQuery({ queryKey: ["deliveries", filter], queryFn: () => getDeliveries(params) });
  const { data: producers = [] } = useQuery({ queryKey: ["producers", ""], queryFn: () => getProducers(""), enabled: open });
  const { data: plots = [] } = useQuery({ queryKey: ["plots", form.producer], queryFn: () => getPlots({ producer: form.producer }), enabled: !!form.producer });
  const { data: stations = [] } = useQuery({ queryKey: ["washing-stations"], queryFn: getWashingStations, enabled: open });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["deliveries"] }); setSelected(new Set()); };
  const save = useMutation({
    mutationFn: () => createDelivery(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ""))),
    onSuccess: () => { setForm({ ...EMPTY, station: form.station, delivered_on: form.delivered_on, price_per_kg_etb: form.price_per_kg_etb }); setError(""); refresh(); },
    onError: (e) => setError(apiError(e)),
  });

  const rows = data?.results ?? [];
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectable = (d: Delivery) => !d.lot && !d.transferred_to && !!d.plot;
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const due = Number(form.weight_kg || 0) * Number(form.price_per_kg_etb || 0);

  return (
    <AdminShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>Origin operations</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Cherry intake</h1>
          <p style={AC.pageSubtitle}>Every delivery, from which farmer and plot, and what they were paid. Producers get an SMS receipt.</p>
        </div>
        {!open && <button style={AC.btnPrimary} onClick={() => setOpen(true)}><Plus size={14} /> Record delivery</button>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          ["Deliveries", rows.length.toLocaleString()],
          ["Weight received", `${Number(data?.summary.weight_kg ?? 0).toLocaleString()} kg`],
          ["Owed to farmers", formatEtb(data?.summary.due_etb)],
          ["Paid", formatEtb(data?.summary.paid_etb)],
        ].map(([l, v]) => (
          <div key={l} style={{ ...AC.card, ...AC.cardPad }}><p style={{ ...AC.metricValue, fontSize: "1.4rem" }}>{v}</p><p style={AC.metricLabel}>{l}</p></div>
        ))}
      </div>

      {open && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
          <p style={{ ...AC.cardTitle, marginBottom: "12px" }}>New delivery</p>
          <ErrorNote>{error}</ErrorNote>
          <div style={grid(170)}>
            <Field label="Producer">
              <select style={AC.input} value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value, plot: "" })}>
                <option value="">Choose…</option>
                {producers.map((p) => <option key={p.id} value={p.id}>{p.name}{p.external_ref ? ` (${p.external_ref})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Plot">
              <select style={AC.input} value={form.plot} onChange={(e) => set("plot", e.target.value)} disabled={!form.producer}>
                <option value="">{plots.length === 1 ? "Their only plot" : "Choose…"}</option>
                {plots.map((p) => <option key={p.id} value={p.id}>{p.name || p.geometry_type || "Plot"}</option>)}
              </select>
            </Field>
            <Field label="Station">
              <select style={AC.input} value={form.station} onChange={(e) => set("station", e.target.value)}>
                <option value="">—</option>
                {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Coffee form">
              <select style={AC.input} value={form.form} onChange={(e) => set("form", e.target.value)}>
                <option value="cherry">Red cherry</option><option value="parchment">Parchment</option><option value="dry_cherry">Dried cherry</option>
              </select>
            </Field>
            <Field label="Receipt no."><input style={AC.input} value={form.receipt_number} onChange={(e) => set("receipt_number", e.target.value)} /></Field>
            <Field label="Date"><input style={AC.input} type="date" value={form.delivered_on} onChange={(e) => set("delivered_on", e.target.value)} /></Field>
            <Field label="Weight (kg)"><input style={AC.input} type="number" min="0" step="0.1" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} /></Field>
            <Field label="Price (ETB/kg)"><input style={AC.input} type="number" min="0" step="0.01" value={form.price_per_kg_etb} onChange={(e) => set("price_per_kg_etb", e.target.value)} /></Field>
            <Field label="Paid now (ETB)" hint={due ? `Due: ${formatEtb(due)}` : undefined}><input style={AC.input} type="number" min="0" value={form.amount_paid_etb} onChange={(e) => set("amount_paid_etb", e.target.value)} /></Field>
            <Field label="Payment reference"><input style={AC.input} value={form.payment_reference} onChange={(e) => set("payment_reference", e.target.value)} placeholder="telebirr / bank ref" /></Field>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={AC.btnPrimary} disabled={!form.producer || !form.receipt_number || !form.weight_kg || save.isPending} onClick={() => save.mutate()}>
              <Check size={13} /> {save.isPending ? "Saving…" : "Save and next"}
            </button>
            <button style={AC.btnGhost} onClick={() => setOpen(false)}><X size={13} /> Close</button>
          </div>
        </div>
      )}

      {payFor && <PaymentDialog delivery={payFor} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); refresh(); }} />}
      {selected.size > 0 && !isCoop && <AllocateBar ids={[...selected]} onDone={refresh} />}
      {selected.size > 0 && isCoop && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Muted>{selected.size} deliveries selected.</Muted>
          <a href={`/supply?deliveries=${[...selected].join(",")}`} style={{ ...AC.btnPrimary, textDecoration: "none" }}><PackagePlus size={14} /> Sell to an exporter</a>
        </div>
      )}

      <div style={AC.card}>
        <div style={{ ...AC.cardHeader, flexWrap: "wrap", gap: "8px" }}>
          <p style={AC.cardTitle}>Deliveries</p>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["all", "unallocated", "unpaid"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...AC.btnSm, background: filter === f ? AT.color.primaryLight : "transparent", color: filter === f ? AT.color.primaryDark : AT.color.textSecondary }}>
                {f === "all" ? "All" : f === "unallocated" ? (isCoop ? "Not sold" : "Not in a lot") : "Unpaid"}
              </button>
            ))}
          </div>
        </div>
        {isLoading && <Muted style={{ padding: "32px", textAlign: "center" }}>Loading…</Muted>}
        {!isLoading && rows.length === 0 && <Muted style={{ padding: "40px", textAlign: "center" }}>No deliveries yet.</Muted>}
        {rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  <th style={AC.th}><span className="sr-only">Select</span></th>
                  <th style={AC.th}>Receipt</th><th style={AC.th}>Date</th><th style={AC.th}>Producer</th>
                  <th style={AC.th}>Weight</th><th style={AC.th}>Due</th><th style={AC.th}>Paid</th><th style={AC.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td style={AC.td}>
                      <input type="checkbox" aria-label={`Select ${d.receipt_number}`} disabled={!selectable(d)} checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                    </td>
                    <td style={{ ...AC.td, fontFamily: AT.font.mono }}>{d.receipt_number}</td>
                    <td style={AC.td}>{formatDate(d.delivered_on)}</td>
                    <td style={AC.td}>{d.producer_name}{d.plot_name ? <span style={{ color: AT.color.textMuted }}> · {d.plot_name}</span> : ""}</td>
                    <td style={AC.td}>{Number(d.weight_kg).toLocaleString()} kg <span style={{ color: AT.color.textMuted }}>{d.form_label.toLowerCase()}</span></td>
                    <td style={AC.td}>{formatEtb(d.amount_due_etb)}</td>
                    <td style={AC.td}>
                      {Number(d.amount_paid_etb || 0) > 0
                        ? <Pill tone="green">{formatEtb(d.amount_paid_etb)}</Pill>
                        : <button style={AC.btnSm} onClick={() => setPayFor(d)}><Banknote size={12} /> Record payment</button>}
                    </td>
                    <td style={AC.td}>
                      {d.lot_code ? <Pill tone="blue">Lot {d.lot_code}</Pill>
                        : d.transferred_to ? <Pill tone={d.transferred_to.status === "accepted" ? "green" : "yellow"}>{d.transferred_to.status === "accepted" ? "Sold" : "Offered"} to {d.transferred_to.buyer}</Pill>
                        : !d.plot ? <Pill tone="red">No plot</Pill> : <Pill tone="muted">In stock</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function PaymentDialog({ delivery, onClose, onDone }: { delivery: Delivery; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(delivery.amount_due_etb ?? "");
  const [ref, setRef] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "16px" }}>
      <p style={{ ...AC.cardTitle, marginBottom: "10px" }}>Payment for {delivery.receipt_number} — {delivery.producer_name}</p>
      <ErrorNote>{error}</ErrorNote>
      <div style={grid(160)}>
        <Field label="Amount (ETB)"><input style={AC.input} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Paid on"><input style={AC.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Reference"><input style={AC.input} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="telebirr / bank ref" /></Field>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button style={AC.btnPrimary} disabled={!amount} onClick={async () => {
          try { await updateDelivery(delivery.id, { amount_paid_etb: amount, paid_on: date, payment_reference: ref }); onDone(); }
          catch (e) { setError(apiError(e)); }
        }}><Check size={13} /> Save payment</button>
        <button style={AC.btnGhost} onClick={onClose}><X size={13} /> Cancel</button>
      </div>
    </div>
  );
}

function AllocateBar({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { data: lots } = useQuery({ queryKey: ["lots", "mine-open"], queryFn: () => getLots({}) });
  const [lot, setLot] = useState("");
  const [ratio, setRatio] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const options = useMemo(() => (lots?.results ?? []).filter((l) => l.status !== "exported"), [lots]);
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "16px" }}>
      <p style={{ ...AC.cardTitle, marginBottom: "6px" }}><Scale size={15} style={{ verticalAlign: "-2px" }} /> Process {ids.length} deliveries into a lot</p>
      <Muted style={{ marginBottom: "10px" }}>
        Each plot is credited with its green-coffee equivalent. Default yields: cherry 5:1, dried cherry 2:1, parchment 1.25:1 — override with your measured out-turn.
      </Muted>
      <ErrorNote>{error}</ErrorNote>
      {msg && <p style={{ ...AC.status.base, ...AC.status.green, marginBottom: "8px" }}>{msg}</p>}
      <div style={grid(180)}>
        <Field label="Lot">
          <select style={AC.input} value={lot} onChange={(e) => setLot(e.target.value)}>
            <option value="">Choose a lot…</option>
            {options.map((l) => <option key={l.id} value={l.id}>{l.lot_id} — {l.name}</option>)}
          </select>
        </Field>
        <Field label="Green yield (optional)" hint="e.g. 0.19 = 19% of delivered weight"><input style={AC.input} type="number" step="0.01" min="0" max="1" value={ratio} onChange={(e) => setRatio(e.target.value)} /></Field>
      </div>
      <button style={AC.btnPrimary} disabled={!lot} onClick={async () => {
        setError(""); setMsg("");
        try { const r = await allocateDeliveries(lot, ids, ratio); setMsg(`${r.detail} ${r.green_kg} kg green credited.`); onDone(); }
        catch (e) { setError(apiError(e)); }
      }}><Check size={13} /> Allocate</button>
    </div>
  );
}
