import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, GitMerge, Plus, Trash2, X } from "lucide-react";
import PlotMap from "../PlotMap";
import { DeforestationPill, ErrorNote, Field, Muted, Pill } from "./ui";
import { grid } from "./styles";
import {
  addLotSource, apiError, convertLegacyLot, getLotSources, getPlots, removeLotSource,
} from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";
import type { CoffeeLot } from "../../api/lots";

const CHANNEL_LABEL: Record<string, string> = {
  direct: "Own farm / estate",
  vertical: "Own washing station, registered suppliers",
  union: "Cooperative union",
  ecx: "ECX",
  unknown: "Not stated",
};

/** Which plots a lot came from, and how many kg each delivered (EUDR geolocation for every plot). */
export default function SupplySources({ lot, onChanged }: { lot: CoffeeLot; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: sources = [], isLoading } = useQuery({ queryKey: ["lot-sources", lot.id], queryFn: () => getLotSources(lot.id) });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [plotId, setPlotId] = useState("");
  const [kg, setKg] = useState("");
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");

  const { data: plots = [] } = useQuery({ queryKey: ["plots", "picker", search], queryFn: () => getPlots({ search }), enabled: adding });
  const used = new Set(sources.map((s) => s.plot));
  const choices = plots.filter((p) => !used.has(p.id));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["lot-sources", lot.id] });
    qc.invalidateQueries({ queryKey: ["due-diligence", lot.id] });
    onChanged();
  };

  const add = useMutation({
    mutationFn: () => addLotSource(lot.id, { plot: plotId, quantity_kg: kg, delivery_reference: receipt }),
    onSuccess: () => { setPlotId(""); setKg(""); setReceipt(""); setAdding(false); setError(""); refresh(); },
    onError: (e) => setError(apiError(e)),
  });
  const convert = useMutation({
    mutationFn: () => convertLegacyLot(lot.id),
    onSuccess: refresh,
    onError: (e) => setError(apiError(e)),
  });

  const total = sources.reduce((sum, s) => sum + Number(s.quantity_kg), 0);
  const volume = Number(lot.volume_kg);
  const coverage = volume ? Math.round((total / volume) * 100) : 0;
  const producers = new Set(sources.map((s) => s.plot_detail.producer_id)).size;
  const mapPlots = useMemo(() => sources.map((s) => ({
    id: s.id, label: `${s.plot_detail.producer_name} — ${Number(s.quantity_kg).toLocaleString()} kg`,
    geometry: s.plot_detail.geometry, status: s.plot_detail.deforestation_status,
  })), [sources]);

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <div>
          <p style={AC.cardTitle}>Supply sources</p>
          <Muted style={{ marginTop: "4px" }}>
            Channel: {CHANNEL_LABEL[lot.channel ?? "unknown"] ?? lot.channel} · {producers} producer(s) · {sources.length} plot(s) ·{" "}
            <span style={{ color: coverage >= 95 && coverage <= 105 ? AT.color.green : AT.color.yellow }}>
              {total.toLocaleString()} of {volume.toLocaleString()} kg traced ({coverage}%)
            </span>
          </Muted>
        </div>
        {!adding && (
          <button style={AC.btnSm} onClick={() => setAdding(true)}><Plus size={13} /> Add plot</button>
        )}
      </div>

      <ErrorNote>{error}</ErrorNote>

      {!isLoading && sources.length === 0 && !adding && (
        <div style={{ padding: "16px", borderRadius: AT.radius.md, background: AT.color.surfaceSecondary, marginBottom: "4px" }}>
          <Muted style={{ marginBottom: "10px" }}>
            EUDR needs the location of every plot that contributed to this lot. Add plots from your{" "}
            <Link to="/producers" style={{ color: AT.color.primary }}>producer registry</Link>
            {(lot.boundary || lot.gps_lat != null) ? ", or turn the lot's current farm location into a registered plot." : "."}
          </Muted>
          {(lot.boundary || lot.gps_lat != null) && (
            <button style={AC.btnGhost} disabled={convert.isPending} onClick={() => convert.mutate()}>
              <GitMerge size={13} /> {convert.isPending ? "Converting…" : "Use current farm location as a plot"}
            </button>
          )}
        </div>
      )}

      {adding && (
        <div style={{ padding: "14px", borderRadius: AT.radius.md, border: `1px solid ${AT.color.border}`, marginBottom: "14px" }}>
          <div style={grid(170)}>
            <Field label="Find plot">
              <input style={AC.input} placeholder="Producer or plot name" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
            <Field label="Plot">
              <select style={AC.input} value={plotId} onChange={(e) => setPlotId(e.target.value)}>
                <option value="">{choices.length ? "Choose a plot…" : "No unused plots — register one first"}</option>
                {choices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.producer_name}{p.name ? ` — ${p.name}` : ""} ({p.geometry_type ?? "no location"})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kg in this lot"><input style={AC.input} type="number" min="0" step="0.01" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
            <Field label="Delivery receipt"><input style={AC.input} value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="Optional" /></Field>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={AC.btnPrimary} disabled={!plotId || !kg || add.isPending} onClick={() => add.mutate()}><Check size={13} /> Add</button>
            <button style={AC.btnGhost} onClick={() => { setAdding(false); setError(""); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <>
          <PlotMap plots={mapPlots} height={240} />
          <div style={{ overflowX: "auto", marginTop: "12px" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  <th style={AC.th}>Producer / plot</th>
                  <th style={AC.th}>Kg</th>
                  <th style={AC.th}>Location</th>
                  <th style={AC.th}>Forest check</th>
                  <th style={AC.th}>Consent</th>
                  <th style={AC.th}></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td style={AC.td}>
                      <Link to={`/producers/${s.plot_detail.producer_id}`} style={{ color: AT.color.text, fontWeight: 500, textDecoration: "none" }}>
                        {s.plot_detail.producer_name}
                      </Link>
                      {s.plot_detail.name && <span style={{ color: AT.color.textMuted }}> · {s.plot_detail.name}</span>}
                    </td>
                    <td style={AC.td}>{Number(s.quantity_kg).toLocaleString()}</td>
                    <td style={AC.td}>
                      {s.plot_detail.geolocation_problem
                        ? <Pill tone="red">{s.plot_detail.geometry_type ? "Needs polygon" : "Missing"}</Pill>
                        : <Pill tone="green">{s.plot_detail.geometry_type}{s.plot_detail.area_ha ? ` · ${Number(s.plot_detail.area_ha).toFixed(1)} ha` : ""}</Pill>}
                    </td>
                    <td style={AC.td}><DeforestationPill status={s.plot_detail.deforestation_status} /></td>
                    <td style={AC.td}>{s.plot_detail.eudr_consent ? <Pill tone="green">Given</Pill> : <Pill tone="red">Missing</Pill>}</td>
                    <td style={AC.td}>
                      <button style={AC.btnSm} aria-label="Remove from lot" title="Remove from lot"
                        onClick={async () => { if (window.confirm("Remove this plot from the lot?")) { await removeLotSource(lot.id, s.id); refresh(); } }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
