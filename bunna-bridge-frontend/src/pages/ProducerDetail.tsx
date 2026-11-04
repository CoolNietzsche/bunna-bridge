import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Archive, Check, FileUp, MapPin, Pentagon, Plus, RefreshCw, ShieldCheck, ShieldOff, Undo2, X,
} from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import PlotMap from "../components/PlotMap";
import { DeforestationPill, ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import {
  apiError, archivePlot, archiveProducer, createPlot, getConsents, getPlots, getProducer, recheckPlot, recordConsent,
  updateProducer,
} from "../api/traceability";
import type { Plot, Producer } from "../api/traceability";
import { formatEtb, getDeliveries, getProducerSms } from "../api/supply";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const TENURE = [
  ["owned", "Owned / holding certificate"],
  ["rented", "Rented / sharecropped"],
  ["communal", "Communal / customary"],
  ["other", "Other / unknown"],
];
const METHODS = [
  ["witnessed", "Verbal, witnessed by field agent"],
  ["paper", "Signed paper form (attach photo)"],
  ["sms", "SMS confirmation"],
  ["in_app", "In the app by the producer"],
];

export default function ProducerDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: producer, isLoading } = useQuery({ queryKey: ["producer", id], queryFn: () => getProducer(id) });
  const { data: plots = [] } = useQuery({ queryKey: ["plots", id], queryFn: () => getPlots({ producer: id }) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["producer", id] });
    qc.invalidateQueries({ queryKey: ["plots"] });
    qc.invalidateQueries({ queryKey: ["producers"] });
  };

  if (isLoading || !producer) {
    return <AdminShell><Muted style={{ padding: "48px", textAlign: "center" }}>{isLoading ? "Loading…" : "Producer not found."}</Muted></AdminShell>;
  }

  return (
    <AdminShell>
      <Link to="/producers" style={{ ...AC.btnGhost, display: "inline-flex", marginBottom: "14px", textDecoration: "none" }}>
        <ArrowLeft size={14} /> Producers
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>{producer.external_ref || "Producer"}</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>{producer.name}</h1>
          <p style={AC.pageSubtitle}>
            {[producer.kebele, producer.woreda, producer.zone, producer.region].filter(Boolean).join(", ") || "Location not set"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {producer.eudr_consent
            ? <Pill tone="green" icon={<ShieldCheck size={12} />}>EUDR consent given</Pill>
            : <Pill tone="red" icon={<ShieldOff size={12} />}>No EUDR consent</Pill>}
          <button
            style={AC.btnGhost}
            onClick={async () => {
              if (!window.confirm(`Archive ${producer.name} and their plots? Records are kept for 5 years.`)) return;
              await archiveProducer(producer.id);
              refresh();
              navigate("/producers");
            }}
          ><Archive size={14} /> Archive</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: "20px", alignItems: "start" }}>
        <PlotsCard producer={producer} plots={plots} onChange={refresh} />
        <div style={{ display: "grid", gap: "20px" }}>
          <ConsentCard producer={producer} onChange={refresh} />
          <ProfileCard producer={producer} onChange={refresh} />
          <ActivityCard producerId={producer.id} />
        </div>
      </div>
    </AdminShell>
  );
}

function PlotsCard({ producer, plots, onChange }: { producer: Producer; plots: Plot[]; onChange: () => void }) {
  const [mode, setMode] = useState<"point" | "polygon" | null>(null);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [form, setForm] = useState({ name: "", declared_area_ha: "", land_tenure: "owned", ectms_farm_id: "", lat: "", lng: "" });
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const mapPlots = useMemo(() => plots.map((p) => ({
    id: p.id, label: p.name || "Plot", geometry: p.boundary ?? p.location, status: p.deforestation_status,
  })), [plots]);

  const save = useMutation({
    mutationFn: () => {
      const point: [number, number] | null = mode === "point"
        ? (draft[0] ?? (form.lat && form.lng ? [Number(form.lng), Number(form.lat)] : null))
        : null;
      const ring = mode === "polygon" && draft.length >= 3 ? [...draft, draft[0]] : null;
      return createPlot({
        producer: producer.id,
        name: form.name,
        ectms_farm_id: form.ectms_farm_id,
        land_tenure: form.land_tenure as Plot["land_tenure"],
        declared_area_ha: form.declared_area_ha || null,
        location: point ? { type: "Point", coordinates: point } : null,
        boundary: ring ? { type: "Polygon", coordinates: [ring] } : null,
      });
    },
    onSuccess: () => { setMode(null); setDraft([]); setForm({ name: "", declared_area_ha: "", land_tenure: "owned", ectms_farm_id: "", lat: "", lng: "" }); setError(""); onChange(); },
    onError: (e) => setError(apiError(e)),
  });

  const start = (m: "point" | "polygon") => { setMode(m); setDraft([]); setError(""); };
  const canSave = mode === "point" ? (draft.length === 1 || (form.lat && form.lng)) : draft.length >= 4;
  const needsPolygon = mode === "point" && Number(form.declared_area_ha) > 4;

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
        <p style={AC.cardTitle}>Plots</p>
        {!mode && (
          <div style={{ display: "flex", gap: "6px" }}>
            <button style={AC.btnSm} onClick={() => start("point")}><MapPin size={13} /> Add point</button>
            <button style={AC.btnSm} onClick={() => start("polygon")}><Pentagon size={13} /> Draw polygon</button>
          </div>
        )}
      </div>

      <PlotMap plots={mapPlots} drawMode={mode} draft={draft} onDraftChange={setDraft} height={300} />
      {mode && (
        <div style={{ marginTop: "14px" }}>
          <Muted style={{ marginBottom: "12px" }}>
            {mode === "point"
              ? "Click the map where the plot is, or type the GPS reading. A single point is only allowed for plots of 4 ha or less."
              : `Click each corner of the plot in order (${draft.length} so far, at least 4). The shape closes automatically.`}
          </Muted>
          <ErrorNote>{error}</ErrorNote>
          {needsPolygon && <ErrorNote>This plot is over 4 ha — EUDR needs its boundary. Draw a polygon instead.</ErrorNote>}
          <div style={grid(160)}>
            <Field label="Plot name"><input style={AC.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Upper garden" /></Field>
            <Field label="Area stated (ha)"><input style={AC.input} type="number" step="0.01" min="0" value={form.declared_area_ha} onChange={(e) => setForm({ ...form, declared_area_ha: e.target.value })} /></Field>
            <Field label="Land tenure">
              <select style={AC.input} value={form.land_tenure} onChange={(e) => setForm({ ...form, land_tenure: e.target.value })}>
                {TENURE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="ECTMS farm ID"><input style={AC.input} value={form.ectms_farm_id} onChange={(e) => setForm({ ...form, ectms_farm_id: e.target.value })} /></Field>
            {mode === "point" && draft.length === 0 && (
              <>
                <Field label="Latitude"><input style={AC.input} inputMode="decimal" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="6.324512" /></Field>
                <Field label="Longitude"><input style={AC.input} inputMode="decimal" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="38.215033" /></Field>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button style={AC.btnPrimary} disabled={!canSave || needsPolygon || save.isPending} onClick={() => save.mutate()}>
              <Check size={13} /> {save.isPending ? "Saving…" : "Save plot"}
            </button>
            {mode === "polygon" && draft.length > 0 && (
              <button style={AC.btnGhost} onClick={() => setDraft(draft.slice(0, -1))}><Undo2 size={13} /> Undo corner</button>
            )}
            <button style={AC.btnGhost} onClick={() => { setMode(null); setDraft([]); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
        {plots.length === 0 && !mode && <Muted>No plots yet. Add a GPS point or draw the plot boundary.</Muted>}
        {plots.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${AT.color.borderLight}`, borderRadius: AT.radius.md, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.9rem", margin: 0, color: AT.color.text }}>
                  {p.name || "Plot"} <span style={{ fontWeight: 400, color: AT.color.textMuted }}>· {p.geometry_type ?? "no location"}{p.area_ha ? ` · ${Number(p.area_ha).toFixed(2)} ha` : ""}</span>
                </p>
                <Muted style={{ marginTop: "2px" }}>
                  {p.lots.length ? `In lots: ${p.lots.map((l) => l.lot_id).join(", ")}` : "Not in any lot yet"}
                  {p.deforestation_checked_at ? ` · checked ${formatDate(p.deforestation_checked_at)}` : ""}
                  {p.forest_2020_overlap_pct !== null ? ` · ${p.forest_2020_overlap_pct}% in 2020 forest` : ""}
                </Muted>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <DeforestationPill status={p.deforestation_status} />
                <button style={AC.btnSm} title="Re-run the forest-loss check" aria-label="Re-run check" disabled={busyId === p.id}
                  onClick={async () => { setBusyId(p.id); try { await recheckPlot(p.id); onChange(); } finally { setBusyId(null); } }}>
                  <RefreshCw size={12} />
                </button>
                <button style={AC.btnSm} title="Archive plot" aria-label="Archive plot"
                  onClick={async () => { if (window.confirm("Archive this plot?")) { await archivePlot(p.id); onChange(); } }}>
                  <Archive size={12} />
                </button>
              </div>
            </div>
            {p.geolocation_problem && <p style={{ ...AC.status.base, ...AC.status.red, marginTop: "8px" }}>{p.geolocation_problem}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsentCard({ producer, onChange }: { producer: Producer; onChange: () => void }) {
  const qc = useQueryClient();
  const { data: consents = [] } = useQuery({ queryKey: ["consents", producer.id], queryFn: () => getConsents(producer.id) });
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("eudr_sharing");
  const [method, setMethod] = useState("witnessed");
  const [granted, setGranted] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append("purpose", purpose);
      form.append("method", method);
      form.append("granted", granted ? "true" : "false");
      if (file) form.append("evidence", file);
      return recordConsent(producer.id, form);
    },
    onSuccess: () => { setOpen(false); setFile(null); setError(""); qc.invalidateQueries({ queryKey: ["consents", producer.id] }); onChange(); },
    onError: (e) => setError(apiError(e)),
  });

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <p style={AC.cardTitle}>Consent</p>
        {!open && <button style={AC.btnSm} onClick={() => setOpen(true)}><Plus size={13} /> Record</button>}
      </div>
      <Muted style={{ marginBottom: "12px" }}>
        Ethiopia's data-protection law (Proclamation 1321/2024) needs the producer's consent before their name and plot
        location go to an EU buyer.
      </Muted>
      {open && (
        <div style={{ marginBottom: "14px" }}>
          <ErrorNote>{error}</ErrorNote>
          <Field label="Purpose">
            <select style={AC.input} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option value="eudr_sharing">Share plot location and name with EU buyers (EUDR)</option>
              <option value="story">Show farm story and photos publicly</option>
            </select>
          </Field>
          <Field label="How it was given">
            <select style={AC.input} value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", fontFamily: AT.font.sans, fontSize: "0.85rem", marginBottom: "12px" }}>
            <input type="checkbox" checked={granted} onChange={(e) => setGranted(e.target.checked)} /> Consent given (untick to record a withdrawal)
          </label>
          <label style={{ ...AC.btnGhost, cursor: "pointer", marginBottom: "12px" }}>
            <FileUp size={13} /> {file ? file.name : "Attach signed form / photo"}
            <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={AC.btnPrimary} disabled={save.isPending} onClick={() => save.mutate()}><Check size={13} /> Save</button>
            <button style={AC.btnGhost} onClick={() => setOpen(false)}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}
      {consents.length === 0 ? <Muted>No consent recorded yet.</Muted> : (
        <div style={{ display: "grid", gap: "8px" }}>
          {consents.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontFamily: AT.font.sans, fontSize: "0.8rem", opacity: c.revoked_at ? 0.55 : 1 }}>
              <span style={{ color: AT.color.text }}>{c.purpose === "eudr_sharing" ? "EUDR sharing" : "Public story"} · {c.method_label}</span>
              <span style={{ color: c.granted ? AT.color.green : AT.color.red, whiteSpace: "nowrap" }}>
                {c.revoked_at ? "Superseded" : c.granted ? "Given" : "Withdrawn"} · {formatDate(c.captured_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCard({ producer, onChange }: { producer: Producer; onChange: () => void }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<Producer>>(producer);
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => updateProducer(producer.id, {
      name: form.name, external_ref: form.external_ref, phone: form.phone, region: form.region, zone: form.zone,
      woreda: form.woreda, kebele: form.kebele, cooperative: form.cooperative, ectms_farmer_id: form.ectms_farmer_id,
      language: form.language, gender: form.gender,
    }),
    onSuccess: () => { setEdit(false); onChange(); },
    onError: (e) => setError(apiError(e)),
  });
  const fields: [keyof Producer, string][] = [
    ["name", "Name"], ["external_ref", "Your reference"], ["phone", "Phone"], ["region", "Region"], ["zone", "Zone"],
    ["woreda", "Woreda"], ["kebele", "Kebele"], ["cooperative", "Cooperative / station"], ["ectms_farmer_id", "ECTMS farmer ID"],
  ];
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <p style={AC.cardTitle}>Details</p>
        {!edit && <button style={AC.btnSm} onClick={() => { setForm(producer); setEdit(true); }}>Edit</button>}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {edit ? (
        <>
          <div style={grid(160)}>
            {fields.map(([k, label]) => (
              <Field key={k} label={label}>
                <input style={AC.input} value={(form[k] as string) ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </Field>
            ))}
            <Field label="SMS language">
              <select style={AC.input} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Producer["language"] })}>
                <option value="am">Amharic</option><option value="om">Afaan Oromo</option><option value="en">English</option>
              </select>
            </Field>
            <Field label="Gender" hint="Optional. Used only for the lot impact score.">
              <select style={AC.input} value={form.gender ?? ""} onChange={(e) => setForm({ ...form, gender: e.target.value as Producer["gender"] })}>
                <option value="">Not recorded</option><option value="female">Woman</option><option value="male">Man</option><option value="undisclosed">Prefer not to say</option>
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={AC.btnPrimary} onClick={() => save.mutate()} disabled={save.isPending}><Check size={13} /> Save</button>
            <button style={AC.btnGhost} onClick={() => setEdit(false)}><X size={13} /> Cancel</button>
          </div>
        </>
      ) : (
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", fontFamily: AT.font.sans, fontSize: "0.82rem" }}>
          {fields.slice(1).map(([k, label]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt style={{ color: AT.color.textMuted }}>{label}</dt>
              <dd style={{ margin: 0, color: AT.color.text }}>{(producer[k] as string) || "—"}</dd>
            </div>
          ))}
          <dt style={{ color: AT.color.textMuted }}>SMS language</dt>
          <dd style={{ margin: 0, color: AT.color.text }}>{{ am: "Amharic", om: "Afaan Oromo", en: "English" }[producer.language] ?? "—"}</dd>
          <dt style={{ color: AT.color.textMuted }}>Gender</dt>
          <dd style={{ margin: 0, color: AT.color.text }}>{({ female: "Woman", male: "Man", undisclosed: "Prefer not to say" } as Record<string, string>)[producer.gender ?? ""] ?? "Not recorded"}</dd>
        </dl>
      )}
    </div>
  );
}

function ActivityCard({ producerId }: { producerId: string }) {
  const { data: deliveries } = useQuery({ queryKey: ["deliveries", "producer", producerId], queryFn: () => getDeliveries({ producer: producerId }) });
  const { data: sms = [] } = useQuery({ queryKey: ["sms", producerId], queryFn: () => getProducerSms(producerId) });
  const rows = deliveries?.results ?? [];
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, marginBottom: "6px" }}>Deliveries and messages</p>
      {rows.length === 0 ? <Muted style={{ marginBottom: "10px" }}>No deliveries recorded.</Muted> : (
        <>
          <Muted style={{ marginBottom: "8px" }}>
            {Number(deliveries?.summary.weight_kg ?? 0).toLocaleString()} kg delivered · {formatEtb(deliveries?.summary.paid_etb)} paid of {formatEtb(deliveries?.summary.due_etb)}
          </Muted>
          {rows.slice(0, 6).map((d) => (
            <p key={d.id} style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textSecondary, margin: "0 0 4px" }}>
              {formatDate(d.delivered_on)} · {d.receipt_number} · {Number(d.weight_kg).toLocaleString()} kg · {Number(d.amount_paid_etb || 0) > 0 ? `paid ${formatEtb(d.amount_paid_etb)}` : "unpaid"}
            </p>
          ))}
        </>
      )}
      <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.8rem", margin: "12px 0 6px", color: AT.color.text }}>SMS sent</p>
      {sms.length === 0 ? <Muted>None yet. Receipts, payments and consent confirmations are sent automatically when a phone number is on file.</Muted> : sms.slice(0, 5).map((m) => (
        <div key={m.id} style={{ marginBottom: "8px" }}>
          <Muted>{formatDate(m.created_at)} · {m.kind_label} · {m.status === "sent" ? "sent" : m.status === "skipped" ? "not sent (no valid mobile number)" : m.status}</Muted>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text, margin: "2px 0 0" }}>{m.body}</p>
        </div>
      ))}
    </div>
  );
}
