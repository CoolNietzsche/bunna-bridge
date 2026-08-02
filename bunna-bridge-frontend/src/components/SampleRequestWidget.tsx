import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSampleRequest } from "../api/samples";
import { useAuth } from "../context/AuthContext";
import { Package, CheckCircle2 } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";
import { isBuyerRole } from "../lib/utils";

interface Props { lotId: string; lotRef: string; onSuccess?: () => void; }

export default function SampleRequestWidget({ lotId, lotRef, onSuccess }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ quantity_g: 200, message: "", shipping_address: "" });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => createSampleRequest({ lot: lotId, ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sample-requests"] });
      setSuccess(true); setOpen(false);
      if (onSuccess) onSuccess();
      setForm({ quantity_g: 200, message: "", shipping_address: "" });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to submit request.");
    },
  });

  if (!isBuyerRole(user?.role) && user?.role !== "admin") return null;

  const labelStyle: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "block", marginBottom: "4px" };

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, marginBottom: "12px" }}>Request Sample</p>

      {success ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, borderRadius: AT.radius.sm, padding: "10px 12px", fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.primaryDark }}>
          <CheckCircle2 size={14} /> Sample request submitted for {lotRef}. The exporter will respond shortly.
        </div>
      ) : !open ? (
        <button onClick={() => setOpen(true)} style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center" }}>
          <Package size={13} /> Request {lotRef} Sample
        </button>
      ) : (
        <>
          <label style={labelStyle}>Sample Size (grams)</label>
          <select
            style={{ ...AC.input, marginBottom: "12px" }}
            value={form.quantity_g}
            onChange={(e) => setForm((f) => ({ ...f, quantity_g: parseInt(e.target.value) }))}
          >
            <option value={100}>100g</option>
            <option value={200}>200g (standard)</option>
            <option value={350}>350g</option>
            <option value={500}>500g</option>
          </select>

          <label style={labelStyle}>Message to exporter</label>
          <input
            style={{ ...AC.input, marginBottom: "12px" }}
            placeholder="Cupping purpose, roast profile interest…"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />

          <label style={labelStyle}>Shipping Address</label>
          <input
            style={{ ...AC.input, marginBottom: "12px" }}
            placeholder="Full shipping address"
            value={form.shipping_address}
            onChange={(e) => setForm((f) => ({ ...f, shipping_address: e.target.value }))}
          />

          {error && (
            <div style={{ background: AT.color.redLight, border: `1px solid ${AT.color.red}33`, borderRadius: AT.radius.sm, padding: "8px 12px", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.red, marginBottom: "10px" }}>
              {error}
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center", opacity: mutation.isPending ? 0.6 : 1, cursor: mutation.isPending ? "not-allowed" : "pointer" }}
          >
            {mutation.isPending ? "Submitting…" : "Submit Sample Request"}
          </button>

          <button
            onClick={() => { setOpen(false); setError(""); }}
            style={{ ...AC.btnGhost, width: "100%", justifyContent: "center", marginTop: "8px" }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
