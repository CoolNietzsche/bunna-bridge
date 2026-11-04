import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, GitCompare } from "lucide-react";
import { Muted } from "../trace/ui";
import { getComparison } from "../../api/quality";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** Pre-shipment sample vs arrival sample (Q-4). */
export default function ComparisonCard({ contractId }: { contractId: string }) {
  const { data } = useQuery({ queryKey: ["comparison", contractId], queryFn: () => getComparison(contractId) });
  if (!data) return null;
  const fmt = (v: number | null) => (v === null ? "—" : String(v));
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><GitCompare size={15} /> Pre-shipment vs arrival</p>
      {!data.pss || !data.arrival ? (
        <Muted>Shown once both a pre-shipment and an arrival sample have results.</Muted>
      ) : (
        <>
          <p style={{ ...AC.status.base, ...(data.consistent ? AC.status.green : AC.status.red), marginBottom: 8, display: "flex", gap: 6 }}>
            {data.consistent ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {data.consistent ? "Arrival matches the approved pre-shipment sample." : "Arrival differs from the pre-shipment sample."}
          </p>
          <table style={AC.table}>
            <thead><tr><th style={AC.th}></th><th style={AC.th}>Pre-shipment</th><th style={AC.th}>Arrival</th><th style={AC.th}>Change</th></tr></thead>
            <tbody>
              {data.rows.filter((r) => r.pss !== null || r.arrival !== null).map((r) => (
                <tr key={r.key}>
                  <td style={AC.td}>{r.label}</td>
                  <td style={AC.td}>{fmt(r.pss)}</td>
                  <td style={AC.td}>{fmt(r.arrival)}</td>
                  <td style={{ ...AC.td, color: r.flag ? AT.color.red : AT.color.textSecondary, fontWeight: r.flag ? 600 : 400 }}>{r.delta === null ? "—" : `${r.delta > 0 ? "+" : ""}${r.delta}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
