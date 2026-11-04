import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send } from "lucide-react";
import { ErrorNote, Muted } from "../trace/ui";
import { getMessages, openAttachment, sendMessage } from "../../api/trade";
import { apiError } from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/** One buyer ↔ exporter conversation (T-7). */
export default function Thread({ id, compact = false }: { id: string; compact?: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["messages", id], queryFn: () => getMessages(id), refetchInterval: 10000 });
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const mySide = data?.conversation.my_side ?? "buyer";

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); qc.invalidateQueries({ queryKey: ["conversations"] }); }, [data?.messages.length, qc]);

  const send = async () => {
    setBusy(true); setError("");
    try {
      await sendMessage(id, body, file);
      setBody(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["messages", id] });
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div style={{ ...AC.card, display: "flex", flexDirection: "column", height: compact ? 420 : "min(70vh, 640px)" }}>
      {data && !compact && (
        <div style={{ ...AC.cardHeader }}>
          <div>
            <p style={AC.cardTitle}>{data.conversation.lot_code} · {data.conversation.lot_name}</p>
            <Muted>{data.conversation.seller_name} ↔ {data.conversation.buyer_name}</Muted>
          </div>
          {data.conversation.contract && <Link to={`/contracts/${data.conversation.contract}`} style={{ ...AC.btnSm, textDecoration: "none" }}>Contract {data.conversation.contract_number}</Link>}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {data?.messages.length === 0 && <Muted>Say hello — ask about samples, timing or quality.</Muted>}
        {data?.messages.map((m) => {
          const mine = m.sender_side === mySide;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{ padding: "8px 12px", borderRadius: 14, background: mine ? AT.color.primary : AT.color.surfaceSecondary, color: mine ? "#fff" : AT.color.text, fontFamily: AT.font.sans, fontSize: "0.88rem", whiteSpace: "pre-wrap" }}>
                {m.body}
                {m.has_attachment && (
                  <button onClick={() => openAttachment(id, m.id)} style={{ all: "unset", cursor: "pointer", display: "flex", gap: 4, alignItems: "center", marginTop: 6, fontSize: "0.78rem", textDecoration: "underline" }}>
                    <Paperclip size={12} /> Attachment
                  </button>
                )}
              </div>
              <span style={{ display: "block", fontFamily: AT.font.sans, fontSize: "0.7rem", color: AT.color.textMuted, marginTop: 2, textAlign: mine ? "right" : "left" }}>
                {m.sender_name} · {time(m.created_at)}
              </span>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <div style={{ borderTop: `1px solid ${AT.color.borderLight}`, padding: "10px" }}>
        <ErrorNote>{error}</ErrorNote>
        <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
          <label style={{ ...AC.btnSm, cursor: "pointer" }} title="Attach a file" aria-label="Attach a file">
            <Paperclip size={14} />{file ? <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span> : null}
            <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <textarea aria-label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Write a message…"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && body.trim()) send(); }}
            style={{ ...AC.input, flex: 1, resize: "none" }} />
          <button style={AC.btnPrimary} disabled={busy || (!body.trim() && !file)} onClick={send} aria-label="Send"><Send size={14} /></button>
        </div>
      </div>
    </div>
  );
}
