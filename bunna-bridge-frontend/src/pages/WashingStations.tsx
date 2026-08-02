import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWashingStations, createWashingStation, updateWashingStation, deleteWashingStation,
} from "../api/washingStations";
import type { WashingStation, WashingStationInput } from "../api/washingStations";
import AdminShell from "../components/admin/AdminShell";
import { Droplets, Plus, Edit2, Trash2, X, Check, Package } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const REGIONS = ["yirgacheffe", "sidama", "guji", "jimma", "harrar", "limu", "nekemte", "other"];
const regionLabel = (r: string) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : "—");

const EMPTY_FORM: Partial<WashingStationInput> = { name: "", region: "", location: "", capacity_kg_per_day: undefined };

export default function WashingStations() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<WashingStationInput>>(EMPTY_FORM);

  const { data: stations, isLoading } = useQuery({
    queryKey: ["washing-stations"],
    queryFn: getWashingStations,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["washing-stations"] });

  const createMutation = useMutation({
    mutationFn: (input: Partial<WashingStationInput>) => createWashingStation(input),
    onSuccess: () => { invalidate(); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WashingStationInput> }) => updateWashingStation(id, input),
    onSuccess: () => { invalidate(); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWashingStation(id),
    onSuccess: invalidate,
  });

  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); };
  const startAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setFormOpen(true); };

  const startEdit = (station: WashingStation) => {
    setForm({
      name: station.name,
      region: station.region,
      location: station.location,
      capacity_kg_per_day: station.capacity_kg_per_day ?? undefined,
    });
    setEditingId(station.id);
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
          <p style={AC.eyebrow}>Origin operations</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Washing Stations</h1>
          <p style={AC.pageSubtitle}>Wet mills you operate — link lots to a station instead of typing it in free text.</p>
        </div>
        {!formOpen && (
          <button style={AC.btnPrimary} onClick={startAdd}>
            <Plus size={14} /> Add Washing Station
          </button>
        )}
      </div>

      {formOpen && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
          <p style={cardTitle}>{editingId ? "Edit Washing Station" : "New Washing Station"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div style={field}>
              <label style={flabel}>Name</label>
              <input style={AC.input} placeholder="e.g. Kochere Washing Station" value={form.name || ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Region</label>
              <select style={AC.input} value={form.region || ""} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}>
                <option value="">Select region…</option>
                {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r)}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={flabel}>Location (kebele / village)</label>
              <input style={AC.input} placeholder="e.g. Kochere, Gedeo" value={form.location || ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Capacity (kg/day)</label>
              <input style={AC.input} type="number" placeholder="e.g. 2000" value={form.capacity_kg_per_day ?? ""} onChange={(e) => setForm((f) => ({ ...f, capacity_kg_per_day: e.target.value ? Number(e.target.value) : undefined }))} />
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
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading washing stations…</p>
          </div>
        )}

        {!isLoading && !stations?.length && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Droplets size={28} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>No washing stations on file yet.</p>
          </div>
        )}

        {!isLoading && !!stations?.length && (
          <div style={{ overflowX: "auto" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  <th style={AC.th}>Name</th>
                  <th style={AC.th}>Region</th>
                  <th style={AC.th}>Location</th>
                  <th style={AC.th}>Capacity</th>
                  <th style={AC.th}>Lots Linked</th>
                  <th style={AC.th}></th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station) => (
                  <tr key={station.id}>
                    <td style={AC.td}>{station.name}</td>
                    <td style={{ ...AC.td, textTransform: "capitalize" }}>{regionLabel(station.region)}</td>
                    <td style={AC.td}>{station.location || "—"}</td>
                    <td style={AC.td}>{station.capacity_kg_per_day ? `${station.capacity_kg_per_day} kg/day` : "—"}</td>
                    <td style={AC.td}>
                      <span style={{ ...AC.pill.base, ...AC.pill.muted }}><Package size={10} /> {station.lots_count}</span>
                    </td>
                    <td style={AC.td}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button style={AC.btnSm} onClick={() => startEdit(station)}><Edit2 size={11} /></button>
                        <button style={AC.btnSm} onClick={() => deleteMutation.mutate(station.id)} disabled={deleteMutation.isPending}><Trash2 size={11} /></button>
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
