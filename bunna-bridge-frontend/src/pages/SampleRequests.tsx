import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getSampleRequests, respondToSample } from "../api/samples";
import PageWrapper from "../components/PageWrapper";
import { CheckCircle, XCircle, Truck, Clock, Package, MessageSquare } from "lucide-react";

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending:   { color: "#C9952A", bg: "rgba(201,149,42,0.1)",  border: "rgba(201,149,42,0.25)",  icon: <Clock size={11} />       },
  approved:  { color: "#A8C5A0", bg: "rgba(74,124,89,0.12)",  border: "rgba(74,124,89,0.3)",    icon: <CheckCircle size={11} /> },
  rejected:  { color: "#C1440E", bg: "rgba(193,68,14,0.12)",  border: "rgba(193,68,14,0.3)",    icon: <XCircle size={11} />     },
  shipped:   { color: "#D4824A", bg: "rgba(212,130,74,0.12)", border: "rgba(212,130,74,0.3)",   icon: <Truck size={11} />       },
  received:  { color: "#4A7C59", bg: "rgba(30,58,47,0.3)",    border: "rgba(74,124,89,0.3)",    icon: <Package size={11} />     },
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

  const inp = {
    width: "100%", background: "rgba(245,237,216,0.04)",
    border: "1px solid rgba(245,237,216,0.09)", borderRadius: "3px",
    padding: "8px 12px", color: "#F5EDD8",
    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem",
    outline: "none", boxSizing: "border-box" as const, marginBottom: "10px",
  };

  const sel = { ...inp, background: "#1A0F07" };

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.75rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 4px" }}>
          Sample Requests
        </h1>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: 0 }}>
          {role === "buyer" ? "Your sample requests" : "Incoming requests from buyers"}
        </p>
      </div>

      {isLoading && (
        <div style={{ textAlign: "center", padding: "64px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
          Loading...
        </div>
      )}

      {!isLoading && (!requests || requests.length === 0) && (
        <div style={{ textAlign: "center", padding: "64px" }}>
          <MessageSquare size={32} color="rgba(245,237,216,0.1)" style={{ marginBottom: "12px" }} />
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
            No sample requests yet.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {requests?.map(req => {
          const sc = STATUS_CONFIG[req.status];
          const isResponding = respondingId === req.id;
          return (
            <div key={req.id} style={{ background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "20px" }}>

              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#C9952A", margin: "0 0 2px", letterSpacing: "0.08em" }}>
                    {req.lot_ref}
                  </p>
                  <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.95rem", fontWeight: 500, color: "#F5EDD8", margin: "0 0 2px" }}>
                    {req.lot_name}
                  </p>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)", margin: 0 }}>
                    {req.lot_region}
                  </p>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "20px",
                  fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  background: sc?.bg, border: `1px solid ${sc?.border}`, color: sc?.color,
                }}>
                  {sc?.icon} {req.status}
                </span>
              </div>

              {/* Meta grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "14px" }}>
                {[
                  { label: role === "exporter" ? "Buyer" : "Sample Size", val: role === "exporter" ? (req.buyer_name || req.buyer_email) : `${req.quantity_g}g` },
                  { label: role === "exporter" ? "Company" : "Requested", val: role === "exporter" ? (req.buyer_company || "—") : new Date(req.created_at).toLocaleDateString() },
                  { label: "Quantity", val: `${req.quantity_g}g` },
                ].map(m => (
                  <div key={m.label} style={{ background: "rgba(245,237,216,0.03)", borderRadius: "3px", padding: "8px 10px" }}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: "0 0 3px" }}>{m.label}</p>
                    <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#F5EDD8", margin: 0 }}>{m.val}</p>
                  </div>
                ))}
              </div>

              {/* Message */}
              {req.message && (
                <div style={{ background: "rgba(245,237,216,0.03)", borderRadius: "3px", padding: "10px 12px", marginBottom: "8px" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,216,0.25)", margin: "0 0 4px" }}>Message</p>
                  <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "rgba(245,237,216,0.6)", margin: 0, lineHeight: 1.5 }}>{req.message}</p>
                </div>
              )}

              {/* Response */}
              {req.response && (
                <div style={{ background: "rgba(30,58,47,0.2)", border: "1px solid rgba(74,124,89,0.15)", borderRadius: "3px", padding: "10px 12px", marginBottom: "8px" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(168,197,160,0.5)", margin: "0 0 4px" }}>Response</p>
                  <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#A8C5A0", margin: 0, lineHeight: 1.5 }}>{req.response}</p>
                </div>
              )}

              {/* Tracking */}
              {req.tracking_number && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(212,130,74,0.07)", border: "1px solid rgba(212,130,74,0.15)", borderRadius: "3px", padding: "8px 12px", marginBottom: "8px" }}>
                  <Truck size={12} color="#D4824A" />
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.68rem", color: "#D4824A" }}>
                    Tracking: {req.tracking_number}
                  </span>
                </div>
              )}

              {/* Exporter actions */}
              {role === "exporter" && req.status === "pending" && !isResponding && (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button onClick={() => setRespondingId(req.id)} style={{
                    background: "#C1440E", border: "none", borderRadius: "3px",
                    padding: "8px 16px", color: "white",
                    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem",
                    cursor: "pointer",
                  }}>
                    Respond
                  </button>
                </div>
              )}

              {role === "exporter" && req.status === "approved" && !isResponding && (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button onClick={() => { setRespondingId(req.id); setResponseForm(f => ({ ...f, status: "shipped" })); }}
                    style={{ background: "transparent", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "3px", padding: "8px 16px", color: "rgba(245,237,216,0.5)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", cursor: "pointer" }}>
                    Mark Shipped
                  </button>
                </div>
              )}

              {/* Response form */}
              {isResponding && (
                <div style={{ background: "rgba(245,237,216,0.03)", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "4px", padding: "16px", marginTop: "12px" }}>
                  <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.35)", marginBottom: "5px" }}>
                    Decision
                  </label>
                  <select style={sel} value={responseForm.status}
                    onChange={e => setResponseForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                    <option value="shipped">Mark as Shipped</option>
                  </select>
                  <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.35)", marginBottom: "5px" }}>
                    Message to buyer
                  </label>
                  <input style={inp} placeholder="Your response..."
                    value={responseForm.response}
                    onChange={e => setResponseForm(f => ({ ...f, response: e.target.value }))} />
                  {responseForm.status === "shipped" && (
                    <>
                      <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.35)", marginBottom: "5px" }}>
                        Tracking Number
                      </label>
                      <input style={inp} placeholder="e.g. ET123456789"
                        value={responseForm.tracking_number}
                        onChange={e => setResponseForm(f => ({ ...f, tracking_number: e.target.value }))} />
                    </>
                  )}
                  {error && (
                    <div style={{ background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "3px", padding: "8px 12px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "#C1440E", marginBottom: "10px" }}>
                      {error}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => respondMutation.mutate({ id: req.id, payload: responseForm })}
                      disabled={respondMutation.isPending}
                      style={{ background: "#C1440E", border: "none", borderRadius: "3px", padding: "9px 18px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", cursor: "pointer" }}>
                      {respondMutation.isPending ? "Saving..." : "Confirm"}
                    </button>
                    <button onClick={() => { setRespondingId(null); setError(""); }}
                      style={{ background: "transparent", border: "1px solid rgba(245,237,216,0.1)", borderRadius: "3px", padding: "9px 18px", color: "rgba(245,237,216,0.5)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}
