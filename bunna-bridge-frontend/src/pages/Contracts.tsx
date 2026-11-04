import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { Muted, Pill } from "../components/trace/ui";
import { formatDate } from "../components/trace/styles";
import { STATUS_TONE, getContracts, usd } from "../api/trade";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const FILTERS = [
  ["", "All"], ["draft", "Draft"], ["sent", "To sign"], ["signed", "Signed"], ["registered", "Registered"],
  ["shipped", "Shipped"], ["completed", "Completed"],
] as const;

export default function Contracts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["contracts", status],
    queryFn: () => getContracts(status ? { status } : {}),
  });
  const forwarder = user?.role === "forwarder";

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>Trade</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>{forwarder ? "Shipments" : "Contracts"}</h1>
        <p style={AC.pageSubtitle}>
          {forwarder
            ? "Contracts where you are the freight forwarder. Update milestones and upload shipping documents."
            : "Every accepted offer becomes a contract: agree the terms, sign, register with ECTA, ship and get paid."}
        </p>
      </div>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "14px" }}>
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} style={{ ...AC.btnSm, background: status === v ? AT.color.primaryLight : "transparent", color: status === v ? AT.color.primaryDark : AT.color.textSecondary }}>{l}</button>
        ))}
      </div>
      <div style={AC.card}>
        {isLoading && <Muted style={{ padding: 32, textAlign: "center" }}>Loading…</Muted>}
        {!isLoading && data.length === 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <FileSignature size={28} color={AT.color.textDisabled} style={{ marginBottom: 10 }} />
            <Muted>No contracts yet. A contract is created when an offer is accepted.</Muted>
          </div>
        )}
        {data.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  <th style={AC.th}>Contract</th><th style={AC.th}>Lot</th><th style={AC.th}>Seller → Buyer</th>
                  <th style={AC.th}>Quantity</th><th style={AC.th}>Price</th><th style={AC.th}>Shipment</th><th style={AC.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ ...AC.td, fontFamily: AT.font.mono, fontWeight: 600 }}>{c.number}</td>
                    <td style={AC.td}>{c.lot_code} <span style={{ color: AT.color.textMuted }}>{c.lot_name}</span></td>
                    <td style={AC.td}>{c.seller_name} → {c.buyer_name}</td>
                    <td style={AC.td}>{Number(c.quantity_kg).toLocaleString()} kg <span style={{ color: AT.color.textMuted }}>({c.bags} bags)</span></td>
                    <td style={AC.td}>{usd(c.price_usd_per_kg)}/kg {c.incoterm} · {usd(c.value_usd, 0)}</td>
                    <td style={AC.td}>{c.shipment_from ? `${formatDate(c.shipment_from)} – ${formatDate(c.shipment_to)}` : "—"}</td>
                    <td style={AC.td}><Pill tone={STATUS_TONE[c.status]}>{c.status_label}</Pill></td>
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
