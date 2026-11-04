import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, FileUp, MapPin, Plus, Search, ShieldCheck, Upload, Users, X } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import PlotMap from "../components/PlotMap";
import type { MapPlot } from "../components/PlotMap";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { grid } from "../components/trace/styles";
import {
  apiError, createProducer, downloadRecordsExport, getPlots, getProducers, importEctms, importPlots, importProducers,
} from "../api/traceability";
import type { ImportResult, Producer } from "../api/traceability";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const EMPTY: Partial<Producer> = { name: "", external_ref: "", kebele: "", woreda: "", zone: "", region: "", cooperative: "", phone: "", ectms_farmer_id: "" };

export default function Producers() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<Partial<Producer>>(EMPTY);
  const [error, setError] = useState("");

  const { data: producers = [], isLoading } = useQuery({
    queryKey: ["producers", search],
    queryFn: () => getProducers(search),
  });
  const { data: plots = [] } = useQuery({ queryKey: ["plots"], queryFn: () => getPlots() });

  const create = useMutation({
    mutationFn: () => createProducer(form),
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ["producers"] }); navigate(`/producers/${p.id}`); },
    onError: (e) => setError(apiError(e)),
  });

  const mapPlots: MapPlot[] = useMemo(() => plots.map((p) => ({
    id: p.producer, label: `${p.producer_name}${p.name ? " — " + p.name : ""}`,
    geometry: p.boundary ?? p.location, status: p.deforestation_status,
  })), [plots]);

  const stats = useMemo(() => ({
    producers: producers.length,
    consented: producers.filter((p) => p.eudr_consent).length,
    plots: plots.length,
    polygons: plots.filter((p) => p.boundary).length,
    clear: plots.filter((p) => p.deforestation_status === "clear").length,
    problems: plots.filter((p) => p.geolocation_problem || p.deforestation_status === "overlap").length,
  }), [producers, plots]);

  const set = (k: keyof Producer, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AdminShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>EUDR traceability</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Producers &amp; Plots</h1>
          <p style={AC.pageSubtitle}>Every farm your coffee comes from — mapped, checked against forest-loss data, with consent on file.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button style={AC.btnGhost} onClick={() => downloadRecordsExport()}>
            <Download size={14} /> Records export
          </button>
          <button style={AC.btnGhost} onClick={() => { setImportOpen((o) => !o); setFormOpen(false); }}>
            <Upload size={14} /> Import
          </button>
          <button style={AC.btnPrimary} onClick={() => { setFormOpen(true); setImportOpen(false); setForm(EMPTY); setError(""); }}>
            <Plus size={14} /> Add producer
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          ["Producers", stats.producers],
          ["With EUDR consent", stats.consented],
          ["Plots mapped", stats.plots],
          ["Polygons", stats.polygons],
          ["Clear of forest loss", stats.clear],
          ["Need attention", stats.problems],
        ].map(([label, value]) => (
          <div key={label as string} style={{ ...AC.card, ...AC.cardPad }}>
            <p style={AC.metricValue}>{value}</p>
            <p style={AC.metricLabel}>{label}</p>
          </div>
        ))}
      </div>

      {formOpen && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
          <p style={{ ...AC.cardTitle, marginBottom: "14px" }}>New producer</p>
          <ErrorNote>{error}</ErrorNote>
          <div style={grid(200)}>
            <Field label="Name"><input style={AC.input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Abebe Worku" /></Field>
            <Field label="Your reference" hint="Supplier code or member number"><input style={AC.input} value={form.external_ref} onChange={(e) => set("external_ref", e.target.value)} placeholder="e.g. KOC-014" /></Field>
            <Field label="Phone"><input style={AC.input} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Region"><input style={AC.input} value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. Sidama" /></Field>
            <Field label="Zone"><input style={AC.input} value={form.zone} onChange={(e) => set("zone", e.target.value)} /></Field>
            <Field label="Woreda"><input style={AC.input} value={form.woreda} onChange={(e) => set("woreda", e.target.value)} /></Field>
            <Field label="Kebele"><input style={AC.input} value={form.kebele} onChange={(e) => set("kebele", e.target.value)} /></Field>
            <Field label="Cooperative / station"><input style={AC.input} value={form.cooperative} onChange={(e) => set("cooperative", e.target.value)} /></Field>
            <Field label="ECTMS farmer ID"><input style={AC.input} value={form.ectms_farmer_id} onChange={(e) => set("ectms_farmer_id", e.target.value)} /></Field>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={AC.btnPrimary} disabled={!form.name || create.isPending} onClick={() => { setError(""); create.mutate(); }}>
              <Check size={13} /> {create.isPending ? "Saving…" : "Save and add plots"}
            </button>
            <button style={AC.btnGhost} onClick={() => setFormOpen(false)}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      {importOpen && <ImportPanel onDone={() => { qc.invalidateQueries({ queryKey: ["producers"] }); qc.invalidateQueries({ queryKey: ["plots"] }); }} />}

      {plots.length > 0 && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <p style={AC.cardTitle}>Plot map</p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <Pill tone="green">Clear</Pill><Pill tone="red">Forest loss</Pill><Pill tone="yellow">Not checked</Pill>
            </div>
          </div>
          <PlotMap plots={mapPlots} height={300} onSelect={(producerId) => navigate(`/producers/${producerId}`)} />
        </div>
      )}

      <div style={AC.card}>
        <div style={{ ...AC.cardHeader, gap: "12px", flexWrap: "wrap" }}>
          <p style={AC.cardTitle}>Producers</p>
          <div style={{ position: "relative", width: "min(280px, 100%)" }}>
            <Search size={14} color={AT.color.textMuted} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
            <input style={{ ...AC.input, paddingLeft: "30px" }} placeholder="Search name, reference, kebele…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search producers" />
          </div>
        </div>
        {isLoading && <Muted style={{ padding: "40px", textAlign: "center" }}>Loading producers…</Muted>}
        {!isLoading && producers.length === 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <Users size={28} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
            <Muted>{search ? "No producers match your search." : "No producers yet. Add one, or import your supplier list."}</Muted>
          </div>
        )}
        {producers.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  <th style={AC.th}>Producer</th>
                  <th style={AC.th}>Reference</th>
                  <th style={AC.th}>Kebele / woreda</th>
                  <th style={AC.th}>Plots</th>
                  <th style={AC.th}>EUDR consent</th>
                </tr>
              </thead>
              <tbody>
                {producers.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/producers/${p.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ ...AC.td, fontWeight: 500 }}>{p.name}</td>
                    <td style={AC.td}>{p.external_ref || "—"}</td>
                    <td style={AC.td}>{[p.kebele, p.woreda].filter(Boolean).join(", ") || "—"}</td>
                    <td style={AC.td}>
                      {p.plots_count > 0 ? <Pill tone="blue" icon={<MapPin size={11} />}>{p.plots_count}</Pill> : <Pill tone="yellow">None</Pill>}
                    </td>
                    <td style={AC.td}>
                      {p.eudr_consent ? <Pill tone="green" icon={<ShieldCheck size={11} />}>Given</Pill> : <Pill tone="red">Missing</Pill>}
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

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<"producers" | "plots" | "ectms">("producers");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const r = kind === "producers" ? await importProducers(file, dryRun)
        : kind === "ectms" ? await importEctms(file, dryRun) : await importPlots(file, dryRun);
      setResult(r);
      if (r.saved) onDone();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const tab = (k: typeof kind, label: string) => (
    <button
      onClick={() => { setKind(k); setFile(null); setResult(null); }}
      style={{ ...AC.btnSm, background: kind === k ? AT.color.primaryLight : "transparent", color: kind === k ? AT.color.primaryDark : AT.color.textSecondary }}
    >{label}</button>
  );

  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <p style={AC.cardTitle}>Bulk import</p>
        <div style={{ display: "flex", gap: "4px" }}>{tab("producers", "Supplier list (CSV)")}{tab("plots", "Plot maps")}{tab("ectms", "ECTMS export")}</div>
      </div>
      {kind === "ectms" ? (
        <Muted style={{ marginBottom: "12px" }}>
          A CSV exported from ECTA's Coffee Traceability and Management System (ECTMS). Needs a <b>FarmerID</b> and
          farmer name; FarmID, kebele, woreda, latitude/longitude, area and a polygon (WKT or GeoJSON) are used when
          present. Re-importing updates existing farmers and farms instead of duplicating them.
        </Muted>
      ) : kind === "producers" ? (
        <Muted style={{ marginBottom: "12px" }}>
          A CSV with a <b>name</b> column. Optional: external_ref, phone, region, zone, woreda, kebele, cooperative,
          ectms_farmer_id, latitude, longitude, area_ha, land_tenure, consent (yes/no), consent_method. Rows with
          latitude and longitude also get a point plot. Existing producers are matched on external_ref.
        </Muted>
      ) : (
        <Muted style={{ marginBottom: "12px" }}>
          GeoJSON, KML/KMZ (from Google Earth or field apps) or a zipped Shapefile. Each feature is a point or polygon;
          it is matched to a producer by <b>producer_ref</b> / external_ref, or by producer name, and new producers are
          created if needed.
        </Muted>
      )}
      <ErrorNote>{error}</ErrorNote>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ ...AC.btnGhost, cursor: "pointer" }}>
          <FileUp size={14} /> {file ? file.name : "Choose file"}
          <input type="file" hidden accept={kind === "plots" ? ".geojson,.json,.kml,.kmz,.zip" : ".csv"} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
        </label>
        <button style={AC.btnGhost} disabled={!file || busy} onClick={() => run(true)}>Check file</button>
        <button style={AC.btnPrimary} disabled={!file || busy} onClick={() => run(false)}>{busy ? "Working…" : "Import"}</button>
      </div>
      {result && (
        <div style={{ marginTop: "14px", padding: "12px", borderRadius: AT.radius.sm, background: AT.color.surfaceSecondary }}>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", margin: "0 0 6px", color: AT.color.text }}>
            {result.saved ? "Imported: " : result.errors.length ? "Nothing was saved. " : "Check passed — ready to import: "}
            {result.producers_created} new producer(s)
            {result.producers_updated ? `, ${result.producers_updated} updated` : ""}, {result.plots_created} plot(s)
            {result.plots_updated ? ` (${result.plots_updated} updated)` : ""}
            {result.consents_recorded ? `, ${result.consents_recorded} consent record(s)` : ""}.
          </p>
          {result.errors.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "18px", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.red, maxHeight: "180px", overflowY: "auto" }}>
              {result.errors.map((e, i) => <li key={i}>{e.row ? `Row ${e.row}: ` : ""}{e.error}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
