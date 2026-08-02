import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoastEquipment, createRoastEquipment, updateRoastEquipment, deleteRoastEquipment,
} from "../api/roasting";
import type { RoastEquipment, RoastEquipmentInput, MachineType } from "../api/roasting";
import AdminShell from "../components/admin/AdminShell";
import { Flame, Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const MACHINE_TYPES: { value: MachineType; label: string }[] = [
  { value: "drum", label: "Drum Roaster" },
  { value: "fluid_bed", label: "Fluid Bed Roaster" },
  { value: "hybrid", label: "Hybrid" },
  { value: "other", label: "Other" },
];

const machineTypeLabel = (t: string) => MACHINE_TYPES.find((m) => m.value === t)?.label || t;

const EMPTY_FORM: Partial<RoastEquipmentInput> = { name: "", machine_type: "drum", brand: "", batch_capacity_kg: undefined, installed_date: "" };

export default function RoastEquipmentPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RoastEquipmentInput>>(EMPTY_FORM);

  const { data: equipment, isLoading } = useQuery({ queryKey: ["roast-equipment"], queryFn: getRoastEquipment });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["roast-equipment"] });

  const createMutation = useMutation({
    mutationFn: (input: Partial<RoastEquipmentInput>) => createRoastEquipment(input),
    onSuccess: () => { invalidate(); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RoastEquipmentInput> }) => updateRoastEquipment(id, input),
    onSuccess: () => { invalidate(); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoastEquipment(id),
    onSuccess: invalidate,
  });

  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); };
  const startAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setFormOpen(true); };
  const startEdit = (item: RoastEquipment) => {
    setForm({ name: item.name, machine_type: item.machine_type, brand: item.brand, batch_capacity_kg: item.batch_capacity_kg ?? undefined, installed_date: item.installed_date || "" });
    setEditingId(item.id);
    setFormOpen(true);
  };
  const handleSubmit = () => {
    if (editingId) updateMutation.mutate({ id: editingId, input: form });
    else createMutation.mutate(form);
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };
  const flabel: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "block", marginBottom: "4px" };
  const field: React.CSSProperties = { marginBottom: "14px" };

  return (
    <AdminShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>Roastery setup</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Roast Equipment</h1>
          <p style={AC.pageSubtitle}>Machines you roast on — link a batch to one to track what it was roasted on.</p>
        </div>
        {!formOpen && (
          <button style={AC.btnPrimary} onClick={startAdd}>
            <Plus size={14} /> Add Equipment
          </button>
        )}
      </div>

      {formOpen && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
          <p style={cardTitle}>{editingId ? "Edit Equipment" : "New Equipment"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div style={field}>
              <label style={flabel}>Name</label>
              <input style={AC.input} placeholder="e.g. Probat 12kg" value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Machine Type</label>
              <select style={AC.input} value={form.machine_type || "drum"} onChange={(e) => setForm((f) => ({ ...f, machine_type: e.target.value as MachineType }))}>
                {MACHINE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={flabel}>Brand</label>
              <input style={AC.input} placeholder="e.g. Probat" value={form.brand || ""} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Batch Capacity (kg)</label>
              <input style={AC.input} type="number" placeholder="e.g. 12" value={form.batch_capacity_kg ?? ""} onChange={(e) => setForm((f) => ({ ...f, batch_capacity_kg: e.target.value ? Number(e.target.value) : undefined }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Installed Date</label>
              <input style={AC.input} type="date" value={form.installed_date || ""} onChange={(e) => setForm((f) => ({ ...f, installed_date: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={AC.btnPrimary} onClick={handleSubmit} disabled={saving || !form.name}>
              <Check size={13} /> {saving ? "Saving…" : "Save"}
            </button>
            <button style={AC.btnGhost} onClick={closeForm}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ ...AC.card }}>
        {isLoading && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading equipment…</p>
          </div>
        )}
        {!isLoading && !equipment?.length && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Flame size={28} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>No roast equipment on file yet.</p>
          </div>
        )}
        {!isLoading && !!equipment?.length && (
          <div style={{ overflowX: "auto" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  <th style={AC.th}>Name</th>
                  <th style={AC.th}>Type</th>
                  <th style={AC.th}>Brand</th>
                  <th style={AC.th}>Capacity</th>
                  <th style={AC.th}>Installed</th>
                  <th style={AC.th}></th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id}>
                    <td style={AC.td}>{item.name}</td>
                    <td style={AC.td}>{machineTypeLabel(item.machine_type)}</td>
                    <td style={AC.td}>{item.brand || "—"}</td>
                    <td style={AC.td}>{item.batch_capacity_kg ? `${item.batch_capacity_kg} kg` : "—"}</td>
                    <td style={AC.td}>{item.installed_date || "—"}</td>
                    <td style={AC.td}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button style={AC.btnSm} onClick={() => startEdit(item)}><Edit2 size={11} /></button>
                        <button style={AC.btnSm} onClick={() => deleteMutation.mutate(item.id)} disabled={deleteMutation.isPending}><Trash2 size={11} /></button>
                      </div>
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
