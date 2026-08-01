import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getSampleRequests, respondToSample } from "../api/samples";
import AdminShell from "../components/admin/AdminShell";
import { CheckCircle, XCircle, Truck, Clock, Package, MessageSquare } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const STATUS_CONFIG: Record<string, { tone: keyof typeof AC.pill; icon: React.ReactNode }> = {
  pending: { tone: "yellow", icon: <Clock size={11} /> },
  approved: { tone: "green", icon: <CheckCircle size={11} /> },
  rejected: { tone: "red", icon: <XCircle size={11} /> },
  shipped: { tone: "blue", icon: <Truck size={11} /> },
  received: { tone: "green", icon: <Package size={11} /> },
};

export default function SampleRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role ?? "buyer";
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseForm, setResponseForm] = useState({ status: "approved", response: "", tracking_number: "" });
  const [error, setError] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["sample-requests"],
    queryFn: getSampleRequests,
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

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>{role === "exporter" ? "Exporter" : "Buyer"}</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Sample Requests</h1>
        <p style={AC.pageSubtitle}>
          {role === "buyer" ? "Your sample requests." : "Incoming requests from buyers."}
        </p>
      </div>

      {isLoading && (
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, textAlign: "center", padding: "60px 0" }}>
          Loading sample requests…
        </p>
      )}

      {!isLoading && (!requests || requests.length === 0) && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <MessageSquare size={32} color={AT.color.textDisabled} style={{ marginBottom: "16px" }} />
          <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.textMuted, margin: "0 0 8px" }}>No sample requests yet</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {requests?.map((req) => {
          const sc = STATUS_CONFIG[req.status];
          const isResponding = respondingId === req.id;
          return (
            <div key={req.id} style={{ ...AC.card, ...AC.cardPad }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>{req.lot_ref} · {req.lot_region?.toUpperCase()}</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.text, margin: 0 }}>{req.lot_name}</p>
                </div>
                {sc && <span style={{ ...AC.pill.base, ...AC.pill[sc.tone] }}>{sc.icon} {req.status.toUpperCase()}</span>}
              </div>

              <div className="ab-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                {[
                  [role === "exporter" ? "BUYER" : "SAMPLE SIZE", role === "exporter" ? (req.buyer_name || req.buyer_email) : `${req.quantity_g}g`],
                  [role === "exporter" ? "COMPANY" : "REQUESTED", role === "exporter" ? (req.buyer_company || "—") : new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
                  ["QUANTITY", `${req.quantity_g}g`],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: AT.color.surfaceSecondary, borderRadius: AT.radius.md, padding: "10px 12px", border: `1px solid ${AT.color.border}` }}>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", color: AT.color.textDisabled, margin: "0 0 3px" }}>{k}</p>
                    <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", fontWeight: 700, color: AT.color.text, margin: 0 }}>{v}</p>
                  </div>
                ))}
              </div>

              {req.message && (
                <div style={{ background: AT.color.surfaceSecondary, borderRadius: AT.radius.md, padding: "10px 12px", marginBottom: "10px", border: `1px solid ${AT.color.border}` }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, margin: "0 0 4px" }}>Message</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textSecondary, margin: 0, lineHeight: 1.5 }}>{req.message}</p>
                </div>
              )}

              {req.response && (
                <div style={{ background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, borderRadius: AT.radius.md, padding: "10px 12px", marginBottom: "10px" }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.primaryDark, margin: "0 0 4px" }}>Response</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.primaryDark, margin: 0, lineHeight: 1.5 }}>{req.response}</p>
                </div>
              )}

              {req.tracking_number && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: AT.color.blueLight, border: `1px solid ${AT.color.blue}33`, borderRadius: AT.radius.md, padding: "8px 12px", marginBottom: "10px" }}>
                  <Truck size={12} color={AT.color.blue} />
                  <span style={{ fontFamily: AT.font.mono, fontSize: "0.72rem", color: AT.color.blue }}>Tracking: {req.tracking_number}</span>
                </div>
              )}

              {role === "exporter" && req.status === "pending" && !isResponding && (
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button onClick={() => setRespondingId(req.id)} style={AC.btnPrimary}>Respond</button>
                </div>
              )}

              {role === "exporter" && req.status === "approved" && !isResponding && (
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    onClick={() => { setRespondingId(req.id); setResponseForm((f) => ({ ...f, status: "shipped" })); }}
                    style={AC.btnGhost}
                  >
                    <Truck size={13} /> Mark Shipped
                  </button>
                </div>
              )}

              {isResponding && (
                <div style={{ background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: "16px", marginTop: "12px" }}>
                  <label style={{ display: "block", fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, marginBottom: "5px" }}>
                    Decision
                  </label>
                  <select
                    style={{ ...AC.input, marginBottom: "12px" }}
                    value={responseForm.status}
                    onChange={(e) => setResponseForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                    <option value="shipped">Mark as Shipped</option>
                  </select>

                  <label style={{ display: "block", fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, marginBottom: "5px" }}>
                    Message to buyer
                  </label>
                  <input
                    style={{ ...AC.input, marginBottom: "12px" }}
                    placeholder="Your response…"
                    value={responseForm.response}
                    onChange={(e) => setResponseForm((f) => ({ ...f, response: e.target.value }))}
                  />

                  {responseForm.status === "shipped" && (
                    <>
                      <label style={{ display: "block", fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, marginBottom: "5px" }}>
                        Tracking Number
                      </label>
                      <input
                        style={{ ...AC.input, marginBottom: "12px" }}
                        placeholder="e.g. ET123456789"
                        value={responseForm.tracking_number}
                        onChange={(e) => setResponseForm((f) => ({ ...f, tracking_number: e.target.value }))}
                      />
                    </>
                  )}

                  {error && (
                    <div style={{ background: AT.color.redLight, border: `1px solid ${AT.color.red}33`, borderRadius: AT.radius.md, padding: "8px 12px", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.red, marginBottom: "12px" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => respondMutation.mutate({ id: req.id, payload: responseForm })}
                      disabled={respondMutation.isPending}
                      style={AC.btnPrimary}
                    >
                      {respondMutation.isPending ? "Saving…" : "Confirm"}
                    </button>
                    <button onClick={() => { setRespondingId(null); setError(""); }} style={AC.btnGhost}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`@media (max-width: 560px){ .ab-3col { grid-template-columns: 1fr !important; } }`}</style>
    </AdminShell>
  );
}
