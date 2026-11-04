import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Microscope, Plus, X } from "lucide-react";
import { ErrorNote, Field, Muted, Pill } from "../trace/ui";
import { formatDate, grid } from "../trace/styles";
import { createLotPhysical, createSamplePhysical, getLotPhysical, getReference } from "../../api/quality";
import type { Physical } from "../../api/quality";
import { apiError } from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

const GRADE_TONE: Record<string, "green" | "blue" | "yellow" | "red"> = { Specialty: "green", Premium: "blue", Exchange: "yellow", "Below standard": "red" };

/** Green-coffee lab analysis (moisture, water activity, density, screens, defects) — Q-2. */
export default function PhysicalCard({ lotId, canRecord, contractSampleId, title = "Green analysis" }: {
  lotId: string; canRecord: boolean; contractSampleId?: number; title?: string;
}) {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["physical", lotId], queryFn: () => getLotPhysical(lotId), enabled: !contractSampleId });
  const [open, setOpen] = useState(false);
  const latest = rows[0];

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6 }}><Microscope size={15} /> {title}</p>
        {canRecord && !open && <button style={AC.btnSm} onClick={() => setOpen(true)}><Plus size={12} /> Record analysis</button>}
      </div>
      {open && <PhysicalForm onCancel={() => setOpen(false)} onSave={async (input) => {
        if (contractSampleId) await createSamplePhysical(contractSampleId, input);
        else await createLotPhysical(lotId, input);
        setOpen(false);
        qc.invalidateQueries({ queryKey: ["physical", lotId] });
        qc.invalidateQueries({ queryKey: ["comparison"] });
      }} />}
      {!open && !contractSampleId && (latest ? <PhysicalSummary p={latest} /> : <Muted>No lab analysis recorded yet.</Muted>)}
      {!open && rows.length > 1 && <Muted style={{ marginTop: 8 }}>{rows.length - 1} earlier analysis{rows.length > 2 ? "es" : ""} on file.</Muted>}
    </div>
  );
}

function PhysicalSummary({ p }: { p: Physical }) {
  const cells: [string, string][] = [
    ["Moisture", p.moisture_pct ? `${p.moisture_pct}%` : "—"],
    ["Water activity", p.water_activity ?? "—"],
    ["Density", p.density_g_l ? `${p.density_g_l} g/L` : "—"],
    ["Screen 18+", Number(p.screen_18_plus) ? `${Number(p.screen_18_plus).toFixed(0)}%` : "—"],
    ["Full defects", `${p.total_full_defects} (${p.primary_full_defects} primary)`],
    ["ECTA grade", p.ecta_grade || "—"],
  ];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <Pill tone={GRADE_TONE[p.sca_green_grade] ?? "muted"}>SCA green: {p.sca_green_grade}</Pill>
        <Muted>{formatDate(p.analysed_on)}{p.lab ? ` · ${p.lab}` : ""}{p.analysed_by_name ? ` · ${p.analysed_by_name}` : ""}</Muted>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
        {cells.map(([k, v]) => (
          <div key={k}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, margin: 0 }}>{k}</p>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.95rem", fontWeight: 600, color: AT.color.text, margin: "2px 0 0" }}>{v}</p>
          </div>
        ))}
      </div>
      {Object.keys(p.screens).length > 0 && (
        <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginTop: 12 }} aria-label="Screen size distribution">
          {Object.entries(p.screens).map(([k, v], i) => (
            <span key={k} title={`Screen ${k}: ${v}%`} style={{ width: `${v}%`, background: `rgba(27,122,78,${1 - i * 0.11})` }} />
          ))}
        </div>
      )}
      {p.warnings.map((w) => (
        <p key={w} style={{ ...AC.status.base, ...AC.status.yellow, marginTop: 8, display: "flex", gap: 6 }}><AlertTriangle size={13} /> {w}</p>
      ))}
    </div>
  );
}

function PhysicalForm({ onSave, onCancel }: { onSave: (input: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const { data: ref } = useQuery({ queryKey: ["quality-reference"], queryFn: getReference });
  const [f, setF] = useState({ analysed_on: new Date().toISOString().slice(0, 10), lab: "", moisture_pct: "", water_activity: "", density_g_l: "", ecta_grade: "", ecta_certificate: "", quakers: "0", notes: "" });
  const [screens, setScreens] = useState<Record<string, string>>({});
  const [defects, setDefects] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const screenTotal = Object.values(screens).reduce((s, v) => s + Number(v || 0), 0);
  const fullDefects = useMemo(() => {
    if (!ref) return { primary: 0, secondary: 0 };
    let primary = 0; let secondary = 0;
    for (const d of ref.defects) {
      const full = Math.floor(Number(defects[d.key] || 0) / d.per_full_defect);
      if (d.category === 1) primary += full; else secondary += full;
    }
    return { primary, secondary };
  }, [defects, ref]);

  return (
    <div>
      <div style={grid(140)}>
        <Field label="Date"><input style={AC.input} type="date" value={f.analysed_on} onChange={(e) => setF({ ...f, analysed_on: e.target.value })} /></Field>
        <Field label="Lab"><input style={AC.input} value={f.lab} onChange={(e) => setF({ ...f, lab: e.target.value })} /></Field>
        <Field label="Moisture %"><input style={AC.input} type="number" step="0.1" value={f.moisture_pct} onChange={(e) => setF({ ...f, moisture_pct: e.target.value })} /></Field>
        <Field label="Water activity"><input style={AC.input} type="number" step="0.001" value={f.water_activity} onChange={(e) => setF({ ...f, water_activity: e.target.value })} placeholder="0.55" /></Field>
        <Field label="Density (g/L)"><input style={AC.input} type="number" value={f.density_g_l} onChange={(e) => setF({ ...f, density_g_l: e.target.value })} /></Field>
        <Field label="ECTA grade"><input style={AC.input} value={f.ecta_grade} onChange={(e) => setF({ ...f, ecta_grade: e.target.value })} placeholder="G1" /></Field>
      </div>
      <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 600, margin: "6px 0" }}>Screen sizes (% retained) — total {screenTotal}%</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 6, marginBottom: 10 }}>
        {(ref?.screens ?? []).map((sz) => (
          <label key={sz} style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted }}>
            {sz === "below_14" ? "<14" : sz}
            <input style={{ ...AC.input, padding: "6px 8px" }} type="number" min={0} max={100} value={screens[sz] ?? ""} onChange={(e) => setScreens({ ...screens, [sz]: e.target.value })} />
          </label>
        ))}
      </div>
      <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 600, margin: "6px 0" }}>
        Defects in 350 g (counts) — {fullDefects.primary} primary + {fullDefects.secondary} secondary full defects
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 6, marginBottom: 10 }}>
        {(ref?.defects ?? []).map((d) => (
          <label key={d.key} style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: d.category === 1 ? AT.color.red : AT.color.textMuted }}>
            {d.label} <span style={{ color: AT.color.textDisabled }}>({d.per_full_defect}=1)</span>
            <input style={{ ...AC.input, padding: "6px 8px" }} type="number" min={0} value={defects[d.key] ?? ""} onChange={(e) => setDefects({ ...defects, [d.key]: e.target.value })} />
          </label>
        ))}
      </div>
      <Field label="Quakers (in 100 g roasted)"><input style={AC.input} type="number" min={0} value={f.quakers} onChange={(e) => setF({ ...f, quakers: e.target.value })} /></Field>
      <ErrorNote>{error}</ErrorNote>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={AC.btnPrimary} disabled={busy} onClick={async () => {
          setBusy(true); setError("");
          const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ""));
          try {
            await onSave({ ...clean, screens: Object.fromEntries(Object.entries(screens).filter(([, v]) => v !== "")), defects: Object.fromEntries(Object.entries(defects).filter(([, v]) => v !== "")) });
          } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
        }}><Check size={13} /> Save analysis</button>
        <button style={AC.btnGhost} onClick={onCancel}><X size={13} /></button>
      </div>
    </div>
  );
}
