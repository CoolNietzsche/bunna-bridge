import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Muted } from "../trace/ui";
import { getReliability } from "../../api/quality";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** Exporter's delivery record on Beersheba: shipments, claims, sample consistency (feeds M-6). */
export default function ReliabilityCard({ exporterId, name }: { exporterId: number | string; name?: string }) {
  const { data } = useQuery({ queryKey: ["reliability", exporterId], queryFn: () => getReliability(exporterId), retry: false });
  if (!data) return null;
  const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
  const items: [string, string][] = [
    ["Contracts", String(data.contracts)],
    ["Shipped", String(data.shipped)],
    ["Shipped on time", pct(data.on_time_rate)],
    ["Claims", data.shipped ? `${data.claims} (${pct(data.claim_rate)})` : "—"],
    ["Pre-shipment approved first time", pct(data.pss_first_time_approval)],
    ["Cup change, sample → arrival", data.average_cup_change_pss_to_arrival === null ? "—" : `${data.average_cup_change_pss_to_arrival > 0 ? "+" : ""}${data.average_cup_change_pss_to_arrival}`],
  ];
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><ShieldCheck size={15} /> {name ? `${name} — track record` : "Exporter track record"}</p>
      {data.contracts === 0 ? <Muted>No contracts on Beersheba yet.</Muted> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          {items.map(([k, v]) => (
            <div key={k}>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, margin: 0 }}>{k}</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", fontWeight: 600, color: AT.color.text, margin: "2px 0 0" }}>{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
