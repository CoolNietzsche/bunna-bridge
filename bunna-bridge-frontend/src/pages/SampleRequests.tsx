import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getSampleRequests, respondToSample } from "../api/samples";
import PageWrapper from "../components/PageWrapper";
import { CheckCircle, XCircle, Truck, Clock, Package } from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:   { color: "#C9952A", bg: "rgba(201,149,42,0.1)",  border: "rgba(201,149,42,0.25)",  icon: <Clock size={12} />        },
  approved:  { color: "#A8C5A0", bg: "rgba(74,124,89,0.12)",  border: "rgba(74,124,89,0.3)",    icon: <CheckCircle size={12} />  },
  rejected:  { color: "#C1440E", bg: "rgba(193,68,14,0.12)",  border: "rgba(193,68,14,0.3)",    icon: <XCircle size={12} />      },
  shipped:   { color: "#D4824A", bg: "rgba(212,130,74,0.12)", border: "rgba(212,130,74,0.3)",   icon: <Truck size={12} />        },
  received:  { color: "#4A7C59", bg: "rgba(30,58,47,0.3)",    border: "rgba(74,124,89,0.3)",    icon: <Package size={12} />      },
};

export default function SampleRequests() {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const role        = user?.role ?? "buyer";

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseForm, setResponseForm] = useState({ status: "approved", response: "", tracking_number: "" });
  const [error, setError] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["sample-requests"],
    queryFn:  getSampleRequests,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof responseForm }) =>
      respondToSample(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-requests"] });
      setRespondingId(null);
      setResponseForm({ status: "approved", response: "", tracking_number: "" });
      setError("");
    },
    onError: () => setError("Failed to respond. Please try again."),
  });

  const S = {
    hdr:      { marginBottom: "24px" },
    title:    { fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: "0 0 4px", fontFamily: "Cormorant Garamond, serif" },
    sub:      { fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#D4824A", textTransform: "uppercase" as const },
    card:     { background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", padding: "16px", marginBottom: "10px" },
    cardHdr:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" },
    lotRef:   { fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#C9952A", marginBottom: "2px" },
    lotName:  { fontSize: "0.9rem", color: "#F5EDD8", fontWeight: 500 },
    badge:    (status: string) => ({
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 8px", borderRadius: "2px",
      fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
      letterSpacing: "0.08em", textTransform: "uppercase" as const,
      background: STATUS_CONFIG[status]?.bg,
      border:     `1px solid ${STATUS_CONFIG[status]?.border}`,
      color:      STATUS_CONFIG[status]?.color,
    }),
    meta:     { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", margin: "10px 0" },
    metaBox:  { background: "rgba(245,237,216,0.03)", borderRadius: "2px", padding: "8px 10px" },
    metaLbl:  { fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(245,237,216,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "3px" },
    metaVal:  { fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#F5EDD8" },
    msg:      { background: "rgba(245,237,216,0.03)", borderRadius: "2px", padding: "10px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "rgba(245,237,216,0.6)", lineHeight: 1.6, marginBottom: "8px" },
    respBox:  { background: "rgba(30,58,47,0.2)", border: "1px solid rgba(74,124,89,0.2)", borderRadius: "2px", padding: "10px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#A8C5A0", lineHeight: 1.6, marginBottom: "8px" },
    trackBox: { background: "rgba(212,130,74,0.08)", border: "1px solid rgba(212,130,74,0.2)", borderRadius: "2px", padding: "8px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#D4824A" },
    actions:  { display: "flex", gap: "8px", marginTop: "10px" },
    btnPrim:  { background: "#C1440E", border: "none", borderRadius: "2px", padding: "7px 14px", color: "white", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" },
    btnGhost: { background: "none", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "7px 14px", color: "rgba(245,237,216,0.5)", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" },
    form:     { background: "rgba(245,237,216,0.03)", border: "1px solid rgba(245,237,216,0.08)", borderRadius: "2px", padding: "14px", marginTop: "10px" },
    label:    { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)", display: "block", marginBottom: "4px" },
    input:    { width: "100%", background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "7px 10px", color: "#F5EDD8", fontFamily: "DM Mono, monospace", fontSize: "0.78rem", outline: "none", boxSizing: "border-box" as const, marginBottom: "10px" },
    select:   { width: "100%", background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "7px 10px", color: "#F5EDD8", fontFamily: "DM Mono, monospace", fontSize: "0.78rem", outline: "none", boxSizing: "border-box" as const, marginBottom: "10px" },
    err:      { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "8px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#C1440E", marginTop: "8px" },
    empty:    { fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)", textAlign: "center" as const, padding: "48px 0" },
  };

  return (
    <PageWrapper>
      <div style={S.hdr}>
        <h1 style={S.title}>Sample Requests</h1>
        <p style={S.sub}>
          {role === "buyer" ? "Your sample requests" : "Incoming sample requests from buyers"}
        </p>
      </div>

      {isLoading && <p style={S.empty}>Loading...</p>}
      {!isLoading && (!requests || requests.length === 0) && (
        <p style={S.empty}>No sample requests yet.</p>
      )}

      {requests?.map(req => {
        const sc = STATUS_CONFIG[req.status];
        const isResponding = respondingId === req.id;

        return (
          <div key={req.id} style={S.card}>
            <div style={S.cardHdr}>
              <div>
                <p style={{ ...S.lotRef, margin: 0 }}>{req.lot_ref}</p>
                <p style={{ ...S.lotName, margin: "2px 0 0" }}>{req.lot_name}</p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)", margin: "2px 0 0" }}>
                  {req.lot_region}
                </p>
              </div>
              <span style={S.badge(req.status)}>
                {sc?.icon} {req.status}
              </span>
            </div>

            <div style={S.meta}>
              <div style={S.metaBox}>
                <p style={{ ...S.metaLbl, margin: 0 }}>
                  {role === "exporter" ? "Buyer" : "Sample Size"}
                </p>
                <p style={{ ...S.metaVal, margin: "3px 0 0" }}>
                  {role === "exporter"
                    ? (req.buyer_name || req.buyer_email)
                    : `${req.quantity_g}g`}
                </p>
              </div>
              <div style={S.metaBox}>
                <p style={{ ...S.metaLbl, margin: 0 }}>
                  {role === "exporter" ? "Company" : "Requested"}
                </p>
                <p style={{ ...S.metaVal, margin: "3px 0 0" }}>
                  {role === "exporter"
                    ? (req.buyer_company || "—")
                    : new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={S.metaBox}>
                <p style={{ ...S.metaLbl, margin: 0 }}>Quantity</p>
                <p style={{ ...S.metaVal, margin: "3px 0 0" }}>{req.quantity_g}g</p>
              </div>
            </div>

            {req.message && (
              <div style={S.msg}>
                <span style={{ color: "rgba(245,237,216,0.35)", fontSize: "0.58rem", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                  Message:{" "}
                </span>
                {req.message}
              </div>
            )}

            {req.response && (
              <div style={S.respBox}>
                <span style={{ color: "rgba(168,197,160,0.6)", fontSize: "0.58rem", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                  Response:{" "}
                </span>
                {req.response}
              </div>
            )}

            {req.tracking_number && (
              <div style={S.trackBox}>
                <Truck size={12} style={{ marginRight: "6px" }} />
                Tracking: {req.tracking_number}
              </div>
            )}

            {req.shipping_address && (
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.3)", margin: "8px 0 0" }}>
                Ship to: {req.shipping_address}
              </p>
            )}

            {/* Exporter respond controls */}
            {role === "exporter" && req.status === "pending" && (
              <div style={S.actions}>
                <button style={S.btnPrim} onClick={() => setRespondingId(req.id)}>
                  Respond
                </button>
              </div>
            )}

            {role === "exporter" && req.status === "approved" && (
              <div style={S.actions}>
                <button style={S.btnGhost} onClick={() => {
                  setRespondingId(req.id);
                  setResponseForm(f => ({ ...f, status: "shipped" }));
                }}>
                  Mark Shipped
                </button>
              </div>
            )}

            {/* Response form */}
            {isResponding && (
              <div style={S.form}>
                <label style={S.label}>Decision</label>
                <select style={S.select}
                  value={responseForm.status}
                  onChange={e => setResponseForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="shipped">Mark as Shipped</option>
                </select>

                <label style={S.label}>Message to buyer</label>
                <input style={S.input} placeholder="Your response..."
                  value={responseForm.response}
                  onChange={e => setResponseForm(f => ({ ...f, response: e.target.value }))} />

                {responseForm.status === "shipped" && (
                  <>
                    <label style={S.label}>Tracking Number</label>
                    <input style={S.input} placeholder="e.g. ET123456789"
                      value={responseForm.tracking_number}
                      onChange={e => setResponseForm(f => ({ ...f, tracking_number: e.target.value }))} />
                  </>
                )}

                {error && <div style={S.err}>{error}</div>}

                <div style={S.actions}>
                  <button style={S.btnPrim}
                    onClick={() => respondMutation.mutate({ id: req.id, payload: responseForm })}
                    disabled={respondMutation.isPending}>
                    {respondMutation.isPending ? "Saving..." : "Confirm"}
                  </button>
                  <button style={S.btnGhost} onClick={() => { setRespondingId(null); setError(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </PageWrapper>
  );
}
