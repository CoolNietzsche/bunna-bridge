import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Anchor, Check, CircleDot, FileText, FileUp, Plus, Ship, X } from "lucide-react";
import { ErrorNote, Field, Muted, Pill } from "../trace/ui";
import { formatDate, grid } from "../trace/styles";
import { addEvent, createShipment, getShipments, openShipDoc, reviewShipDoc, updateShipment, uploadShipDoc } from "../../api/trade";
import type { Contract, ShipDoc, Shipment } from "../../api/trade";
import { apiError } from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

const MILESTONES: [string, string][] = [
  ["booked", "Space booked"], ["stuffed", "Container stuffed"], ["trucked", "Truck left for Djibouti"],
  ["at_port", "At Djibouti port"], ["customs", "Customs cleared"], ["loaded", "Loaded on vessel"],
  ["departed", "Vessel departed"], ["transshipped", "Transshipped"], ["arrived", "Arrived at destination"],
  ["delivered", "Delivered to buyer"], ["delayed", "Delay"],
];
const DOC_TONE = { missing: "red", uploaded: "yellow", approved: "green", rejected: "red", not_needed: "muted" } as const;

/** Shipment details, milestones (T-4) and the export document checklist (T-5). */
export default function ShipmentPanel({ contract: c }: { contract: Contract }) {
  const qc = useQueryClient();
  const { data: shipments = [] } = useQuery({ queryKey: ["shipments", c.id], queryFn: () => getShipments(c.id) });
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ forwarder_email: "", booking_number: "", shipping_line: "", container_number: "", port_of_discharge: c.destination, etd: "", eta: "" });
  const [error, setError] = useState("");
  const seller = c.my_party === "seller" || c.my_party === "admin";
  const refresh = () => { qc.invalidateQueries({ queryKey: ["shipments", c.id] }); qc.invalidateQueries({ queryKey: ["contract", c.id] }); };

  if (!["registered", "shipped", "completed"].includes(c.status) && shipments.length === 0) {
    return (
      <div style={{ ...AC.card, ...AC.cardPad }}>
        <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6 }}><Ship size={15} /> Shipment</p>
        <Muted style={{ marginTop: 6 }}>Booked after the contract is signed and registered with ECTA.</Muted>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {shipments.map((s) => <ShipmentCard key={s.id} s={s} c={c} onChange={refresh} />)}
      {seller && c.status === "registered" && (
        <div style={{ ...AC.card, ...AC.cardPad }}>
          {!creating ? (
            <button style={AC.btnPrimary} onClick={() => setCreating(true)}><Plus size={14} /> {shipments.length ? "Add another shipment" : "Book shipment"}</button>
          ) : (
            <>
              <p style={{ ...AC.cardTitle, marginBottom: 10 }}>New shipment</p>
              <ErrorNote>{error}</ErrorNote>
              <div style={grid(170)}>
                <Field label="Forwarder's email" hint="Their Beersheba freight-forwarder account"><input style={AC.input} type="email" value={f.forwarder_email} onChange={(e) => setF({ ...f, forwarder_email: e.target.value })} /></Field>
                <Field label="Shipping line"><input style={AC.input} value={f.shipping_line} onChange={(e) => setF({ ...f, shipping_line: e.target.value })} /></Field>
                <Field label="Booking no."><input style={AC.input} value={f.booking_number} onChange={(e) => setF({ ...f, booking_number: e.target.value })} /></Field>
                <Field label="Container no."><input style={AC.input} value={f.container_number} onChange={(e) => setF({ ...f, container_number: e.target.value })} /></Field>
                <Field label="Port of discharge"><input style={AC.input} value={f.port_of_discharge} onChange={(e) => setF({ ...f, port_of_discharge: e.target.value })} /></Field>
                <Field label="ETD Djibouti"><input style={AC.input} type="date" value={f.etd} onChange={(e) => setF({ ...f, etd: e.target.value })} /></Field>
                <Field label="ETA"><input style={AC.input} type="date" value={f.eta} onChange={(e) => setF({ ...f, eta: e.target.value })} /></Field>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={AC.btnPrimary} onClick={async () => {
                  setError("");
                  try {
                    await createShipment(c.id, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "")));
                    setCreating(false); refresh();
                  } catch (e) { setError(apiError(e)); }
                }}><Check size={13} /> Create shipment</button>
                <button style={AC.btnGhost} onClick={() => setCreating(false)}><X size={13} /></button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ShipmentCard({ s, c, onChange }: { s: Shipment; c: Contract; onChange: () => void }) {
  const canUpdate = c.my_party === "seller" || c.my_party === "forwarder" || c.my_party === "admin";
  const [ev, setEv] = useState({ kind: "booked", location: "", note: "" });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState({ vessel: s.vessel, voyage: s.voyage, bl_number: s.bl_number, seal_number: s.seal_number, container_number: s.container_number, etd: s.etd ?? "", eta: s.eta ?? "" });
  const done = new Set(s.events.map((e) => e.kind));
  const next = MILESTONES.find(([k]) => !done.has(k) && k !== "transshipped" && k !== "delayed")?.[0] ?? "delayed";

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6 }}><Ship size={15} /> {s.container_number || "Container not set"} {s.vessel ? `· ${s.vessel}` : ""}</p>
          <Muted style={{ marginTop: 2 }}>
            {s.port_of_loading} → {s.port_of_discharge || "—"} · ETD {formatDate(s.etd)} · ETA {formatDate(s.eta)} · {s.bags ?? "—"} bags
            {s.forwarder_name ? ` · forwarder ${s.forwarder_name}` : ""}
          </Muted>
        </div>
        {canUpdate && !editing && <button style={AC.btnSm} onClick={() => setEditing(true)}>Edit details</button>}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {editing && (
        <div style={{ background: AT.color.surfaceSecondary, padding: 12, borderRadius: AT.radius.sm, marginBottom: 12 }}>
          <div style={grid(140)}>
            {(["container_number", "seal_number", "vessel", "voyage", "bl_number"] as const).map((k) => (
              <Field key={k} label={{ container_number: "Container", seal_number: "Seal", vessel: "Vessel", voyage: "Voyage", bl_number: "B/L no." }[k]}>
                <input style={AC.input} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
              </Field>
            ))}
            <Field label="ETD"><input style={AC.input} type="date" value={d.etd} onChange={(e) => setD({ ...d, etd: e.target.value })} /></Field>
            <Field label="ETA"><input style={AC.input} type="date" value={d.eta} onChange={(e) => setD({ ...d, eta: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={AC.btnPrimary} onClick={async () => {
              try { await updateShipment(s.id, { ...d, etd: d.etd || null, eta: d.eta || null }); setEditing(false); onChange(); } catch (e) { setError(apiError(e)); }
            }}><Check size={13} /> Save</button>
            <button style={AC.btnGhost} onClick={() => setEditing(false)}><X size={13} /></button>
          </div>
        </div>
      )}

      <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.82rem", margin: "4px 0 8px" }}>Milestones</p>
      <ol style={{ listStyle: "none", padding: 0, margin: "0 0 12px", borderLeft: `2px solid ${AT.color.border}`, marginLeft: 6 }}>
        {s.events.length === 0 && <li style={{ paddingLeft: 14 }}><Muted>No milestones yet.</Muted></li>}
        {s.events.map((e) => (
          <li key={e.id} style={{ position: "relative", paddingLeft: 16, marginBottom: 8 }}>
            <CircleDot size={12} color={e.kind === "delayed" ? AT.color.red : AT.color.green} style={{ position: "absolute", left: -7, top: 3, background: AT.color.surface }} />
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text }}>{e.kind_label}</span>
            <Muted>{new Date(e.happened_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{e.location ? ` · ${e.location}` : ""}{e.note ? ` · ${e.note}` : ""}</Muted>
          </li>
        ))}
      </ol>
      {canUpdate && c.status !== "completed" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          <select aria-label="Milestone" style={{ ...AC.input, width: "auto" }} value={ev.kind === "booked" && done.has("booked") ? next : ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value })}>
            {MILESTONES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input aria-label="Location" style={{ ...AC.input, width: 140 }} placeholder="Location" value={ev.location} onChange={(e) => setEv({ ...ev, location: e.target.value })} />
          <input aria-label="Note" style={{ ...AC.input, flex: 1, minWidth: 140 }} placeholder="Note" value={ev.note} onChange={(e) => setEv({ ...ev, note: e.target.value })} />
          <button style={AC.btnPrimary} onClick={async () => {
            setError("");
            const kind = ev.kind === "booked" && done.has("booked") ? next : ev.kind;
            try { await addEvent(s.id, { ...ev, kind }); setEv({ kind: "booked", location: "", note: "" }); onChange(); } catch (e) { setError(apiError(e)); }
          }}><Anchor size={13} /> Add milestone</button>
        </div>
      )}

      <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.82rem", margin: "4px 0 8px" }}>Export documents</p>
      <div style={{ display: "grid", gap: 6 }}>
        {s.documents.map((doc) => <DocRow key={doc.id} doc={doc} s={s} c={c} onChange={onChange} onError={setError} />)}
      </div>
    </div>
  );
}

function DocRow({ doc, s, c, onChange, onError }: { doc: ShipDoc; s: Shipment; c: Contract; onChange: () => void; onError: (m: string) => void }) {
  const [comment, setComment] = useState("");
  const canUpload = c.my_party === "seller" || c.my_party === "admin" || (c.my_party === "forwarder" && doc.responsible === "forwarder");
  const buyer = c.my_party === "buyer";
  const act = async (fn: () => Promise<unknown>) => { onError(""); try { await fn(); onChange(); } catch (e) { onError(apiError(e)); } };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "6px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
      <span style={{ flex: 1, minWidth: 180, fontFamily: AT.font.sans, fontSize: "0.84rem", color: AT.color.text }}>
        {doc.kind_label} <span style={{ color: AT.color.textMuted }}>· {doc.responsible_label}{doc.number ? ` · ${doc.number}` : ""}</span>
        {doc.comment && <span style={{ display: "block", fontSize: "0.76rem", color: AT.color.red }}>{doc.comment}</span>}
      </span>
      <Pill tone={DOC_TONE[doc.status]}>{doc.status_label}</Pill>
      {doc.has_file && <button style={AC.btnSm} aria-label={`Open ${doc.kind_label}`} onClick={() => openShipDoc(s.id, doc.id)}><FileText size={12} /></button>}
      {canUpload && doc.status !== "approved" && (
        <label style={{ ...AC.btnSm, cursor: "pointer" }} title="Upload">
          <FileUp size={12} /> Upload
          <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.append("file", file);
            act(() => uploadShipDoc(s.id, doc.id, fd));
          }} />
        </label>
      )}
      {buyer && doc.status === "uploaded" && (
        <>
          <input aria-label="Correction needed" style={{ ...AC.input, width: 150 }} placeholder="Correction needed" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button style={AC.btnSm} onClick={() => act(() => reviewShipDoc(s.id, doc.id, "approved"))}><Check size={12} /> OK</button>
          <button style={AC.btnSm} disabled={!comment.trim()} onClick={() => act(() => reviewShipDoc(s.id, doc.id, "rejected", comment))}><X size={12} /></button>
        </>
      )}
    </div>
  );
}
