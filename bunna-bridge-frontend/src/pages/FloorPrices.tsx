import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { ErrorNote, Muted } from "../components/trace/ui";
import { formatDate } from "../components/trace/styles";
import { downloadFloorCsv, getFloorPrices, importFloorPrices } from "../api/trade";
import { apiError } from "../api/traceability";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

/** ECTA minimum export prices by grade, process, region and period (T-2). */
export default function FloorPrices() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data = [] } = useQuery({ queryKey: ["floor-prices"], queryFn: getFloorPrices });
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ rows: number; valid: number; saved: boolean; errors: { row: number; error: string }[] } | null>(null);
  const [error, setError] = useState("");
  const run = async (dry: boolean) => {
    if (!file) return;
    setError(""); setResult(null);
    try { const r = await importFloorPrices(file, dry); setResult(r); if (r.saved) qc.invalidateQueries({ queryKey: ["floor-prices"] }); }
    catch (e) { setError(apiError(e)); }
  };
  return (
    <AdminShell>
      <div style={{ marginBottom: 20 }}>
        <p style={AC.eyebrow}>Platform</p>
        <h1 style={{ ...AC.pageTitle, marginTop: 4 }}>ECTA minimum prices</h1>
        <p style={AC.pageSubtitle}>Used by the export-readiness gate and to block contract registration below the minimum. A blank grade, process or region matches any value; the most specific row wins.</p>
      </div>
      {user?.role === "admin" && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: 20 }}>
          <p style={{ ...AC.cardTitle, marginBottom: 6 }}>Import the ECTA table</p>
          <Muted style={{ marginBottom: 10 }}>CSV columns: grade, processing, region, min_price_usd_per_kg, valid_from, valid_to, source. Regions use the lot codes (yirgacheffe, sidama, guji, harrar…). A row with the same scope and start date replaces the old one.</Muted>
          <ErrorNote>{error}</ErrorNote>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ ...AC.btnGhost, cursor: "pointer" }}><FileUp size={14} /> {file ? file.name : "Choose CSV"}
              <input type="file" hidden accept=".csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
            </label>
            <button style={AC.btnGhost} disabled={!file} onClick={() => run(true)}>Check file</button>
            <button style={AC.btnPrimary} disabled={!file} onClick={() => run(false)}>Import</button>
            <button style={AC.btnGhost} onClick={downloadFloorCsv}><Download size={14} /> Export current table</button>
          </div>
          {result && (
            <div style={{ marginTop: 10, fontFamily: AT.font.sans, fontSize: "0.85rem" }}>
              {result.saved ? `Imported ${result.valid} rows.` : `${result.valid} of ${result.rows} rows are valid.${result.errors.length ? " Nothing was saved." : ""}`}
              {result.errors.map((e) => <div key={e.row} style={{ color: AT.color.red }}>Row {e.row}: {e.error}</div>)}
            </div>
          )}
        </div>
      )}
      <div style={AC.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={AC.table}>
            <thead><tr><th style={AC.th}>Region</th><th style={AC.th}>Grade</th><th style={AC.th}>Process</th><th style={AC.th}>Minimum (USD/kg FOB)</th><th style={AC.th}>Valid</th><th style={AC.th}>Source</th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...AC.td, textTransform: "capitalize" }}>{r.region || "Any"}</td>
                  <td style={AC.td}>{r.grade || "Any"}</td>
                  <td style={{ ...AC.td, textTransform: "capitalize" }}>{r.processing || "Any"}</td>
                  <td style={{ ...AC.td, fontWeight: 600 }}>${Number(r.min_price_usd_per_kg).toFixed(2)}</td>
                  <td style={AC.td}>{formatDate(r.valid_from)} – {r.valid_to ? formatDate(r.valid_to) : "open"}</td>
                  <td style={AC.td}>{r.source || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
