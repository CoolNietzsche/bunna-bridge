import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import Thread from "../components/trade/Thread";
import AdminShell from "../components/admin/AdminShell";
import { Muted, Pill } from "../components/trace/ui";
import { getConversations } from "../api/trade";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

/** Buyer ↔ exporter conversations, one per lot (T-7). */
export default function Messages() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("c");
  const { data } = useQuery({ queryKey: ["conversations"], queryFn: () => getConversations(), refetchInterval: 15000 });
  const rows = data?.results ?? [];
  const active = selected ?? rows[0]?.id ?? null;

  return (
    <AdminShell>
      <div style={{ marginBottom: "18px" }}>
        <p style={AC.eyebrow}>Trade</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Messages</h1>
        <p style={AC.pageSubtitle}>One conversation per lot between the buyer and the exporter's team. Start one from any marketplace lot.</p>
      </div>
      <div className="msg-grid" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "16px", alignItems: "start" }}>
        <div style={{ ...AC.card, overflow: "hidden" }}>
          {rows.length === 0 && (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <MessageSquare size={26} color={AT.color.textDisabled} />
              <Muted style={{ marginTop: 8 }}>No conversations yet.</Muted>
            </div>
          )}
          {rows.map((c) => (
            <button key={c.id} onClick={() => setParams({ c: c.id })} style={{
              all: "unset", boxSizing: "border-box", display: "block", width: "100%", cursor: "pointer", padding: "12px 14px",
              borderBottom: `1px solid ${AT.color.borderLight}`, background: c.id === active ? AT.color.primaryLight : "transparent",
            }}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontFamily: AT.font.sans, fontSize: "0.86rem", color: AT.color.text }}>{c.my_side === "buyer" ? c.seller_name : c.buyer_name}</strong>
                {c.unread > 0 && <Pill tone="green">{c.unread}</Pill>}
              </span>
              <span style={{ display: "block", fontFamily: AT.font.sans, fontSize: "0.76rem", color: AT.color.textMuted, marginTop: 2 }}>
                {c.lot_code} · {c.lot_name}{c.contract_number ? ` · ${c.contract_number}` : ""}
              </span>
              <span style={{ display: "block", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textSecondary, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.last_message || "No messages yet"}
              </span>
            </button>
          ))}
        </div>
        {active ? <Thread id={active} /> : <div style={{ ...AC.card, ...AC.cardPad }}><Muted>Select a conversation.</Muted></div>}
      </div>
      <style>{`@media (max-width: 860px){ .msg-grid { grid-template-columns: 1fr !important; } }`}</style>
    </AdminShell>
  );
}
