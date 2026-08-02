import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoastBatches, createRoastBatch, updateRoastBatch, updateRoastBatchStatus,
  getRoastEquipment, getAvailableLots,
} from "../api/roasting";
import type { RoastBatch, RoastBatchInput, RoastBatchStatus, RoastLevel } from "../api/roasting";
import AdminShell from "../components/admin/AdminShell";
import { ArrowRight, Lock, Check, X, Plus, Trash2, Package, Scale } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const PIPELINE: { key: RoastBatchStatus; label: string; color: string; bg: string }[] = [
  { key: "queued", label: "Queued", color: AT.color.textMuted, bg: AT.color.surfaceSecondary },
  { key: "roasting", label: "Roasting", color: "#b45309", bg: AT.color.yellowLight },
  { key: "resting", label: "Resting", color: AT.color.blue, bg: AT.color.blueLight },
  { key: "qc", label: "QC", color: AT.color.blue, bg: AT.color.blueLight },
  { key: "packaged", label: "Packaged", color: AT.color.primaryDark, bg: AT.color.primaryLight },
  { key: "shipped", label: "Shipped", color: AT.color.primaryDark, bg: AT.color.primaryLight },
];

const NEXT_STATUS: Record<string, RoastBatchStatus> = {
  queued: "roasting", roasting: "resting", resting: "qc", qc: "packaged", packaged: "shipped",
};

const ROAST_LEVELS: { value: RoastLevel; label: string }[] = [
  { value: "", label: "— Not set —" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "medium_dark", label: "Medium-Dark" },
  { value: "dark", label: "Dark" },
];

const EMPTY_FORM: RoastBatchInput = {
  batch_code: "", equipment: "", roast_level: "", roast_date: "",
  charge_temp_c: undefined, drop_temp_c: undefined,
  first_crack_time_s: undefined, development_time_s: undefined,
  output_weight_kg: undefined, qc_score: undefined, qc_notes: "", notes: "",
  lot_inputs: [],
};

export default function RoastBatches() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoastBatchInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: batches, isLoading } = useQuery({ queryKey: ["roast-batches"], queryFn: getRoastBatches });
  const { data: equipment } = useQuery({ queryKey: ["roast-equipment"], queryFn: getRoastEquipment });
  const { data: availableLots } = useQuery({ queryKey: ["roasting-available-lots"], queryFn: getAvailableLots });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["roast-batches"] });

  const createMutation = useMutation({
    mutationFn: (input: RoastBatchInput) => createRoastBatch(input),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err: unknown) => setError(extractError(err)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RoastBatchInput> }) => updateRoastBatch(id, input),
    onSuccess: () => { invalidate(); closeForm(); },
    onError: (err: unknown) => setError(extractError(err)),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RoastBatchStatus }) => updateRoastBatchStatus(id, status),
    onSuccess: () => { invalidate(); setUpdating(null); setError(null); },
    onError: (err: unknown) => { setError(extractError(err)); setUpdating(null); },
  });

  function extractError(err: unknown): string {
    const e = err as { response?: { data?: unknown } };
    const data = e.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      return Object.entries(data as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ");
    }
    return "Something went wrong.";
  }

  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); setError(null); };
  const startAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setError(null); setFormOpen(true); };
  const startEdit = (batch: RoastBatch) => {
    setForm({
      batch_code: batch.batch_code, equipment: batch.equipment || "", roast_level: batch.roast_level,
      roast_date: batch.roast_date || "", charge_temp_c: batch.charge_temp_c ?? undefined,
      drop_temp_c: batch.drop_temp_c ?? undefined, first_crack_time_s: batch.first_crack_time_s ?? undefined,
      development_time_s: batch.development_time_s ?? undefined, output_weight_kg: batch.output_weight_kg ?? undefined,
      qc_score: batch.qc_score ?? undefined, qc_notes: batch.qc_notes, notes: batch.notes,
      lot_inputs: batch.lot_inputs.map((l) => ({ lot: l.lot, quantity_kg: l.quantity_kg })),
    });
    setEditingId(batch.id);
    setError(null);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) updateMutation.mutate({ id: editingId, input: form });
    else createMutation.mutate(form);
  };

  const addLotLine = () => setForm((f) => ({ ...f, lot_inputs: [...f.lot_inputs, { lot: "", quantity_kg: 0 }] }));
  const removeLotLine = (i: number) => setForm((f) => ({ ...f, lot_inputs: f.lot_inputs.filter((_, idx) => idx !== i) }));
  const setLotLine = (i: number, patch: Partial<{ lot: string; quantity_kg: number }>) =>
    setForm((f) => ({ ...f, lot_inputs: f.lot_inputs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));

  const handleAdvance = (batch: RoastBatch) => {
    const next = NEXT_STATUS[batch.status];
    if (!next) return;
    if (next === "packaged" && batch.output_weight_kg == null) {
      setError(`Record ${batch.batch_code}'s output weight before packaging (Edit → Output Weight).`);
      return;
    }
    setUpdating(batch.id); setError(null);
    statusMutation.mutate({ id: batch.id, status: next });
  };

  const byStatus = (status: RoastBatchStatus) => batches?.filter((b) => b.status === status) ?? [];

  const saving = createMutation.isPending || updateMutation.isPending;
  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };
  const flabel: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "block", marginBottom: "4px" };
  const field: React.CSSProperties = { marginBottom: "14px" };
  const usedLotIds = new Set(form.lot_inputs.map((l) => l.lot));

  return (
    <AdminShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div>
          <p style={AC.eyebrow}>Roasting operations</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Roast Batches</h1>
          <p style={AC.pageSubtitle}>Queued → Roasting → Resting → QC → Packaged → Shipped</p>
        </div>
        {!formOpen && (
          <button style={AC.btnPrimary} onClick={startAdd}>
            <Plus size={14} /> New Batch
          </button>
        )}
      </div>

      {formOpen && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
          <p style={cardTitle}>{editingId ? "Edit Batch" : "New Roast Batch"}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div style={field}>
              <label style={flabel}>Batch Code</label>
              <input style={AC.input} placeholder="e.g. RB-2026-014" value={form.batch_code} onChange={(e) => setForm((f) => ({ ...f, batch_code: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Equipment</label>
              <select style={AC.input} value={form.equipment || ""} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}>
                <option value="">— Not set —</option>
                {equipment?.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={flabel}>Roast Date</label>
              <input style={AC.input} type="date" value={form.roast_date || ""} onChange={(e) => setForm((f) => ({ ...f, roast_date: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Roast Level</label>
              <select style={AC.input} value={form.roast_level || ""} onChange={(e) => setForm((f) => ({ ...f, roast_level: e.target.value as RoastLevel }))}>
                {ROAST_LEVELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={flabel}>Charge Temp (°C)</label>
              <input style={AC.input} type="number" value={form.charge_temp_c ?? ""} onChange={(e) => setForm((f) => ({ ...f, charge_temp_c: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Drop Temp (°C)</label>
              <input style={AC.input} type="number" value={form.drop_temp_c ?? ""} onChange={(e) => setForm((f) => ({ ...f, drop_temp_c: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div style={field}>
              <label style={flabel}>First Crack (seconds)</label>
              <input style={AC.input} type="number" value={form.first_crack_time_s ?? ""} onChange={(e) => setForm((f) => ({ ...f, first_crack_time_s: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Development Time (seconds)</label>
              <input style={AC.input} type="number" value={form.development_time_s ?? ""} onChange={(e) => setForm((f) => ({ ...f, development_time_s: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Output Weight (kg)</label>
              <input style={AC.input} type="number" value={form.output_weight_kg ?? ""} onChange={(e) => setForm((f) => ({ ...f, output_weight_kg: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div style={field}>
              <label style={flabel}>QC Score</label>
              <input style={AC.input} type="number" value={form.qc_score ?? ""} onChange={(e) => setForm((f) => ({ ...f, qc_score: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
          </div>

          <div style={field}>
            <label style={flabel}>QC Notes</label>
            <input style={AC.input} value={form.qc_notes || ""} onChange={(e) => setForm((f) => ({ ...f, qc_notes: e.target.value }))} />
          </div>
          <div style={field}>
            <label style={flabel}>Notes</label>
            <input style={AC.input} value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div style={{ borderTop: `1px solid ${AT.color.borderLight}`, margin: "14px 0" }} />

          <p style={{ ...cardTitle, marginBottom: "10px", fontSize: "0.8rem" }}>Green Coffee Input (blend)</p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, marginBottom: "12px" }}>
            Add one or more lots you own or have bought — a batch with multiple lots is a blend.
          </p>

          {form.lot_inputs.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
              <select
                style={{ ...AC.input, flex: 2 }}
                value={line.lot}
                onChange={(e) => setLotLine(i, { lot: e.target.value })}
              >
                <option value="">Select a lot…</option>
                {availableLots?.filter((l) => l.id === line.lot || !usedLotIds.has(l.id)).map((l) => (
                  <option key={l.id} value={l.id}>{l.lot_id} — {l.name} ({l.volume_kg}kg avail.)</option>
                ))}
              </select>
              <input
                style={{ ...AC.input, flex: 1 }} type="number" placeholder="kg"
                value={line.quantity_kg || ""}
                onChange={(e) => setLotLine(i, { quantity_kg: Number(e.target.value) })}
              />
              <button style={AC.btnSm} onClick={() => removeLotLine(i)}><Trash2 size={12} /></button>
            </div>
          ))}
          <button style={AC.btnGhost} onClick={addLotLine}>
            <Plus size={13} /> Add Lot
          </button>

          {error && (
            <div style={{ background: AT.color.redLight, border: `1px solid ${AT.color.red}33`, borderRadius: AT.radius.md, padding: "10px 14px", marginTop: "16px", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.red }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button style={AC.btnPrimary} onClick={handleSubmit} disabled={saving || !form.batch_code}>
              <Check size={13} /> {saving ? "Saving…" : "Save"}
            </button>
            <button style={AC.btnGhost} onClick={closeForm}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {batches && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          {PIPELINE.map((stage) => {
            const count = byStatus(stage.key).length;
            return (
              <div key={stage.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: AT.radius.md, background: stage.bg, border: `1px solid ${AT.color.border}` }}>
                <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 600, color: stage.color }}>{stage.label}</span>
                <span style={{ fontFamily: AT.font.sans, fontSize: "1.2rem", fontWeight: 700, color: stage.color, lineHeight: 1 }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && !formOpen && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: AT.color.redLight, border: `1px solid ${AT.color.red}33`, borderRadius: AT.radius.md, padding: "10px 14px", marginBottom: "16px", fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.red }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: AT.color.red, cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}

      {isLoading && <div style={{ textAlign: "center", padding: "64px 0" }}><p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading batches…</p></div>}

      {!isLoading && !batches?.length && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <Package size={32} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>No roast batches yet.</p>
        </div>
      )}

      {!isLoading && !!batches?.length && (
        <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
          {PIPELINE.map((stage) => {
            const stageBatches = byStatus(stage.key);
            return (
              <div key={stage.key} style={{ background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.lg, padding: "14px", minHeight: "280px", flex: "0 0 240px", width: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "10px", borderBottom: `1px solid ${AT.color.border}` }}>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 600, color: stage.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{stage.label}</span>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 700, color: stage.color, lineHeight: 1 }}>{stageBatches.length}</span>
                </div>

                {stageBatches.length === 0 && <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textDisabled, textAlign: "center", padding: "24px 0" }}>No batches</p>}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {stageBatches.map((batch) => {
                    const next = NEXT_STATUS[batch.status];
                    const isLast = !next;
                    const locked = next === "packaged" && batch.output_weight_kg == null;
                    const isBusy = updating === batch.id;

                    return (
                      <div key={batch.id} style={{ ...AC.card, padding: "12px" }}>
                        <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>{batch.batch_code}</p>
                        <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", fontWeight: 600, color: AT.color.text, margin: "0 0 5px", textTransform: "capitalize" }}>
                          {batch.roast_level ? batch.roast_level.replace("_", "-") : "Roast level not set"}
                        </p>
                        <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, margin: "0 0 8px" }}>
                          {batch.lot_inputs.length} lot{batch.lot_inputs.length !== 1 ? "s" : ""} · {batch.input_weight_kg}kg in
                          {batch.output_weight_kg != null && ` → ${batch.output_weight_kg}kg out`}
                        </p>

                        {(batch.weight_loss_pct != null || batch.qc_score != null) && (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
                            {batch.weight_loss_pct != null && <span style={{ ...AC.pill.base, ...AC.pill.blue }}><Scale size={9} /> {batch.weight_loss_pct}% loss</span>}
                            {batch.qc_score != null && <span style={{ ...AC.pill.base, ...AC.pill.green }}>{batch.qc_score} pts</span>}
                          </div>
                        )}

                        <div style={{ borderTop: `1px solid ${AT.color.borderLight}`, margin: "8px 0" }} />

                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {!isLast && (
                            <button
                              onClick={() => handleAdvance(batch)}
                              disabled={isBusy || locked}
                              style={{
                                ...AC.btnPrimary, width: "100%", justifyContent: "center", fontSize: "0.72rem", padding: "7px 8px",
                                background: locked ? AT.color.surfaceSecondary : AT.color.primary,
                                borderColor: locked ? AT.color.border : AT.color.primaryDark,
                                color: locked ? AT.color.textDisabled : "#fff",
                                cursor: isBusy || locked ? "not-allowed" : "pointer",
                              }}
                            >
                              {isBusy ? "Updating…" : locked ? <><Lock size={11} /> Locked</> : <>{next.toUpperCase()} <ArrowRight size={11} /></>}
                            </button>
                          )}
                          <button onClick={() => startEdit(batch)} style={{ ...AC.btnGhost, width: "100%", justifyContent: "center", fontSize: "0.72rem", padding: "6px 8px" }}>
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
