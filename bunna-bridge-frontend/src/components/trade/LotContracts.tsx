import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import { Pill } from "../trace/ui";
import { STATUS_TONE, getContracts, usd } from "../../api/trade";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** Contracts made on this lot (shown to the lot owner). */
export default function LotContracts({ lotId }: { lotId: string }) {
  const { data = [] } = useQuery({ queryKey: ["contracts", "lot", lotId], queryFn: () => getContracts({ lot: lotId }) });
  if (data.length === 0) return null;
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><FileSignature size={15} /> Contracts</p>
      {data.map((c) => (
        <Link key={c.id} to={`/contracts/${c.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: `1px solid ${AT.color.borderLight}`, textDecoration: "none", fontFamily: AT.font.sans, fontSize: "0.84rem", color: AT.color.text }}>
          <span><b>{c.number}</b> · {c.buyer_name} · {Number(c.quantity_kg).toLocaleString()} kg · {usd(c.price_usd_per_kg)}/kg</span>
          <Pill tone={STATUS_TONE[c.status]}>{c.status_label}</Pill>
        </Link>
      ))}
    </div>
  );
}
