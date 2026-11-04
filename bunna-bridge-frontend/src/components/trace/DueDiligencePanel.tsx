import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Download, FileCheck2, FileUp, Package, PenLine, Plus,
  ShieldCheck, X,
} from "lucide-react";
import { ErrorNote, Field, Muted, Pill } from "./ui";
import { formatDate } from "./styles";
import {
  addMitigation, addRisk, apiError, downloadPackage, generatePackage, getDueDiligence, recordDdsReference, signOff,
  updateRisk,
} from "../../api/traceability";
import type { LotRisk } from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

const SEVERITY_TONE = { high: "red", medium: "yellow", low: "muted" } as const;
const STATUS_TONE = { open: "red", mitigated: "green", accepted: "blue", resolved: "muted" } as const;
const STATUS_LABEL = { open: "Open", mitigated: "Mitigated", accepted: "Accepted", resolved: "No longer applies" };
const statusOf = (r: LotRisk) => (r.code === "country_standard_risk" && r.status === "open" ? "Noted" : STATUS_LABEL[r.status]);
const toneOf = (r: LotRisk) => (r.code === "country_standard_risk" && r.status === "open" ? "muted" : STATUS_TONE[r.status]);
const KINDS = [
  ["field_visit", "Field visit"],
  ["satellite_recheck", "Satellite re-check"],
  ["third_party", "Third-party verification"],
  ["document", "Document obtained"],
  ["excluded", "Supplier or plot excluded"],
  ["other", "Other"],
];

/**
 * EUDR due diligence for a lot. The exporter works the risk register,
 * signs off and generates the evidence package; the EU importer (a buyer
 * with an accepted offer) downloads it and records the DDS reference.
 */
export default function DueDiligencePanel({ lotId, onChanged }: { lotId: string; onChanged?: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["due-diligence", lotId],
    queryFn: () => getDueDiligence(lotId),
    retry: false,
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [conclusion, setConclusion] = useState(
    "Risk of non-compliance is negligible: every plot is mapped, clear of post-2020 forest loss and covered by producer consent.",
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["due-diligence", lotId] });
    onChanged?.();
  };
  const act = (fn: () => Promise<unknown>, ok: string) => async () => {
    setError(""); setNotice("");
    try { await fn(); setNotice(ok); refresh(); } catch (e) { setError(apiError(e)); }
  };

  if (isLoading) return <div style={{ ...AC.card, ...AC.cardPad }}><Muted>Loading due diligence…</Muted></div>;
  if (isError || !data) return null; // not owner and not a contracted buyer

  const { summary } = data;
  const active = data.risks.filter((r) => r.status !== "resolved");
  const resolved = data.risks.filter((r) => r.status === "resolved");
  const openCount = active.filter((r) => r.status === "open" && r.code !== "country_standard_risk").length;
  const current = data.packages.find((p) => p.is_current);

  const steps = [
    { label: "Plots mapped & clear", done: summary.has_sources && summary.plots > 0 && summary.plots_clear === summary.plots },
    { label: "Risks handled", done: summary.has_sources && summary.open_high_risks === 0 && openCount === 0 },
    { label: "Assessment signed", done: data.signoff_current },
    { label: "Evidence package", done: !!current },
    { label: "DDS filed by importer", done: data.dds_references.length > 0 },
  ];

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
        <p style={AC.cardTitle}>EUDR due diligence</p>
        {current ? <Pill tone="green" icon={<ShieldCheck size={12} />}>Evidence ready</Pill> : <Pill tone="yellow">In progress</Pill>}
      </div>
      <Muted style={{ marginBottom: "14px" }}>
        {data.is_owner
          ? "Your EU importer files the Due Diligence Statement. You hand over the evidence: plot locations, risk assessment and legality documents."
          : "Evidence from the exporter for your Due Diligence Statement. File the DDS in the EU Information System, then record its reference here."}
      </Muted>

      <ol style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: "6px" }}>
        {steps.map((s, i) => (
          <li key={s.label} style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: AT.font.sans, fontSize: "0.82rem", color: s.done ? AT.color.text : AT.color.textMuted }}>
            {s.done
              ? <CheckCircle2 size={15} color={AT.color.green} />
              : <span style={{ width: 15, height: 15, borderRadius: "50%", border: `1.5px solid ${AT.color.textDisabled}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem" }}>{i + 1}</span>}
            {s.label}
          </li>
        ))}
      </ol>

      <ErrorNote>{error}</ErrorNote>
      {notice && <p role="status" style={{ ...AC.status.base, ...AC.status.green, marginBottom: "10px" }}>{notice}</p>}

      {/* Risk register */}
      {data.is_owner && (
        <section style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
            <p style={sectionTitle}>Risk register</p>
            <AddRiskButton lotId={lotId} onDone={refresh} />
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {active.map((r) => <RiskRow key={r.id} lotId={lotId} risk={r} onDone={refresh} />)}
          </div>
          {resolved.length > 0 && (
            <button style={{ ...AC.btnSm, marginTop: "8px" }} onClick={() => setShowResolved(!showResolved)}>
              {showResolved ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {resolved.length} resolved
            </button>
          )}
          {showResolved && (
            <div style={{ display: "grid", gap: "8px", marginTop: "8px", opacity: 0.7 }}>
              {resolved.map((r) => <RiskRow key={r.id} lotId={lotId} risk={r} onDone={refresh} />)}
            </div>
          )}
        </section>
      )}

      {/* Sign-off */}
      {data.is_owner && (
        <section style={{ marginBottom: "18px" }}>
          <p style={sectionTitle}>Conclusion</p>
          {data.signoff && (
            <Muted style={{ marginBottom: "8px", color: data.signoff_current ? AT.color.green : AT.color.yellow }}>
              {data.signoff_current ? "Signed" : "Previous sign-off is out of date (the register changed)"} — {formatDate(data.signoff.signed_at)} by {data.signoff.signed_by_email}
            </Muted>
          )}
          {!data.signoff_current && summary.has_sources && (
            <>
              <textarea style={{ ...AC.input, minHeight: "64px", resize: "vertical" }} value={conclusion} onChange={(e) => setConclusion(e.target.value)} aria-label="Risk assessment conclusion" />
              <button style={{ ...AC.btnGhost, marginTop: "8px" }} disabled={!conclusion.trim()} onClick={act(() => signOff(lotId, conclusion), "Risk assessment signed off.")}>
                <PenLine size={13} /> Sign off risk assessment
              </button>
            </>
          )}
        </section>
      )}

      {/* Evidence package */}
      <section style={{ marginBottom: "18px" }}>
        <p style={sectionTitle}>Evidence package</p>
        {data.is_owner && !current && data.package_blockers.length > 0 && (
          <ul style={{ margin: "0 0 8px", paddingLeft: "18px", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textSecondary }}>
            {data.package_blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
        {data.is_owner && (
          <button
            style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center", marginBottom: "8px", opacity: data.package_blockers.length ? 0.5 : 1 }}
            disabled={data.package_blockers.length > 0}
            onClick={act(() => generatePackage(lotId), "Evidence package generated. Your contracted importer has been notified.")}
          >
            <Package size={14} /> {current ? "Regenerate evidence package" : "Generate evidence package"}
          </button>
        )}
        {data.packages.length === 0 ? <Muted>No package yet.</Muted> : (
          <div style={{ display: "grid", gap: "6px" }}>
            {data.packages.slice(0, 3).map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", fontFamily: AT.font.sans, fontSize: "0.8rem" }}>
                <span style={{ color: p.is_current ? AT.color.text : AT.color.textMuted }}>
                  {formatDate(p.generated_at)} · {p.producers_count} producers · {p.plots_count} plots · {Number(p.total_kg).toLocaleString()} kg
                  {!p.is_current && " (superseded)"}
                </span>
                <button style={AC.btnSm} onClick={() => downloadPackage(lotId, p.id)} aria-label="Download package"><Download size={12} /> ZIP</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* DDS references */}
      <section>
        <p style={sectionTitle}>DDS reference</p>
        {data.dds_references.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: "8px", alignItems: "center", fontFamily: AT.font.sans, fontSize: "0.82rem", marginBottom: "6px" }}>
            <FileCheck2 size={14} color={AT.color.green} />
            <span style={{ fontFamily: AT.font.mono, color: AT.color.text }}>{r.reference_number}</span>
            <span style={{ color: AT.color.textMuted }}>{r.verification_number && `· ${r.verification_number}`} · {r.recorded_by_company || r.recorded_by_email}</span>
          </div>
        ))}
        {data.dds_references.length === 0 && !data.can_record_reference && <Muted>Not filed by the importer yet.</Muted>}
        {data.can_record_reference && <RecordReference lotId={lotId} onDone={refresh} collapsed={data.dds_references.length > 0} />}
      </section>
    </div>
  );
}

const sectionTitle = {
  fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.8rem", color: AT.color.text, margin: "0 0 8px",
} as const;

function RiskRow({ lotId, risk, onDone }: { lotId: string; risk: LotRisk; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"mitigate" | "accept" | null>(null);
  const [kind, setKind] = useState("field_visit");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [justification, setJustification] = useState(risk.justification);
  const [error, setError] = useState("");

  const mitigate = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("notes", notes);
      form.append("mark_mitigated", "1");
      if (file) form.append("evidence", file);
      return addMitigation(lotId, risk.id, form);
    },
    onSuccess: () => { setMode(null); onDone(); },
    onError: (e) => setError(apiError(e)),
  });
  const accept = useMutation({
    mutationFn: () => updateRisk(lotId, risk.id, { status: "accepted", justification }),
    onSuccess: () => { setMode(null); onDone(); },
    onError: (e) => setError(apiError(e)),
  });

  const actionable = risk.status === "open" && risk.code !== "country_standard_risk";

  return (
    <div style={{ border: `1px solid ${risk.status === "open" && risk.severity === "high" ? "rgba(215,0,21,0.25)" : AT.color.borderLight}`, borderRadius: AT.radius.md, padding: "10px 12px" }}>
      <button onClick={() => setOpen(!open)} style={{ all: "unset", cursor: "pointer", display: "flex", gap: "8px", alignItems: "flex-start", width: "100%" }} aria-expanded={open}>
        {risk.severity === "high" && risk.status === "open"
          ? <AlertTriangle size={15} color={AT.color.red} style={{ flexShrink: 0, marginTop: "2px" }} />
          : <ShieldCheck size={15} color={risk.status === "open" ? AT.color.textMuted : AT.color.green} style={{ flexShrink: 0, marginTop: "2px" }} />}
        <span style={{ flex: 1, fontFamily: AT.font.sans, fontSize: "0.84rem", color: AT.color.text, fontWeight: 500 }}>{risk.title}</span>
        <span style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <Pill tone={SEVERITY_TONE[risk.severity]}>{risk.severity}</Pill>
          <Pill tone={toneOf(risk)}>{statusOf(risk)}</Pill>
        </span>
      </button>
      {open && (
        <div style={{ marginTop: "8px", paddingLeft: "23px" }}>
          <Muted style={{ marginBottom: "8px" }}>{risk.detail}</Muted>
          {risk.justification && <Muted style={{ marginBottom: "6px", color: AT.color.textSecondary }}>Justification: {risk.justification}</Muted>}
          {risk.mitigations.map((m) => (
            <Muted key={m.id} style={{ marginBottom: "4px", color: AT.color.textSecondary }}>
              {m.kind_label}: {m.notes} {m.evidence ? "· evidence attached" : ""} · {formatDate(m.performed_at)}
            </Muted>
          ))}
          <ErrorNote>{error}</ErrorNote>
          {actionable && !mode && (
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <button style={AC.btnSm} onClick={() => setMode("mitigate")}>Record mitigation</button>
              {risk.severity !== "high" && <button style={AC.btnSm} onClick={() => setMode("accept")}>Accept as negligible</button>}
            </div>
          )}
          {mode === "mitigate" && (
            <div style={{ marginTop: "8px" }}>
              <Field label="What was done">
                <select style={AC.input} value={kind} onChange={(e) => setKind(e.target.value)}>
                  {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Notes"><textarea style={{ ...AC.input, minHeight: "56px" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Visited on 2 Nov with photos; canopy intact, loss polygon is a neighbouring eucalyptus harvest." /></Field>
              <label style={{ ...AC.btnGhost, cursor: "pointer", marginBottom: "8px" }}>
                <FileUp size={13} /> {file ? file.name : "Attach evidence (photo, report)"}
                <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button style={AC.btnPrimary} disabled={!notes.trim() || mitigate.isPending} onClick={() => mitigate.mutate()}>Save, mark mitigated</button>
                <button style={AC.btnGhost} onClick={() => setMode(null)}><X size={13} /></button>
              </div>
            </div>
          )}
          {mode === "accept" && (
            <div style={{ marginTop: "8px" }}>
              <Field label="Why is this risk negligible?"><textarea style={{ ...AC.input, minHeight: "56px" }} value={justification} onChange={(e) => setJustification(e.target.value)} /></Field>
              <div style={{ display: "flex", gap: "6px" }}>
                <button style={AC.btnPrimary} disabled={justification.trim().length < 20 || accept.isPending} onClick={() => accept.mutate()}>Accept</button>
                <button style={AC.btnGhost} onClick={() => setMode(null)}><X size={13} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddRiskButton({ lotId, onDone }: { lotId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ severity: "medium", title: "", detail: "" });
  const [error, setError] = useState("");
  if (!open) return <button style={AC.btnSm} onClick={() => setOpen(true)}><Plus size={12} /> Add risk</button>;
  return (
    <div style={{ width: "100%", marginTop: "8px", padding: "14px", background: AT.color.surfaceSecondary, borderRadius: AT.radius.md }}>
      <ErrorNote>{error}</ErrorNote>
      <Field label="Risk"><input style={AC.input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New supplier with no delivery history" /></Field>
      <Field label="Detail"><textarea style={{ ...AC.input, minHeight: "50px" }} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></Field>
      <Field label="Severity">
        <select style={AC.input} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </Field>
      <div style={{ display: "flex", gap: "6px" }}>
        <button style={AC.btnPrimary} disabled={!form.title.trim()} onClick={async () => {
          try { await addRisk(lotId, form); setOpen(false); setForm({ severity: "medium", title: "", detail: "" }); onDone(); } catch (e) { setError(apiError(e)); }
        }}>Add</button>
        <button style={AC.btnGhost} onClick={() => setOpen(false)}><X size={13} /></button>
      </div>
    </div>
  );
}

function RecordReference({ lotId, onDone, collapsed }: { lotId: string; onDone: () => void; collapsed: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  const [ref, setRef] = useState("");
  const [verification, setVerification] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () => recordDdsReference(lotId, { reference_number: ref, verification_number: verification, submitted_on: date || null }),
    onSuccess: () => { setRef(""); setVerification(""); setDate(""); setOpen(false); onDone(); },
    onError: (e) => setError(apiError(e)),
  });
  if (!open) {
    return <button style={{ ...AC.btnSm, marginTop: "4px" }} onClick={() => setOpen(true)}><Plus size={12} /> Record another reference</button>;
  }
  return (
    <div style={{ marginTop: "8px" }}>
      <ErrorNote>{error}</ErrorNote>
      <Field label="DDS reference number"><input style={AC.input} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="From the EU Information System" /></Field>
      <Field label="Verification number"><input style={AC.input} value={verification} onChange={(e) => setVerification(e.target.value)} /></Field>
      <Field label="Submitted on"><input style={AC.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <button style={AC.btnPrimary} disabled={ref.trim().length < 6 || save.isPending} onClick={() => save.mutate()}>
        <FileCheck2 size={13} /> Record DDS reference
      </button>
    </div>
  );
}
