import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSampleRequest } from "../api/samples";
import { useAuth } from "../context/AuthContext";
import { Package } from "lucide-react";

interface Props { lotId: string; lotRef: string; onSuccess?: () => void; }

export default function SampleRequestWidget({ lotId, lotRef, onSuccess }: Props) {
  const { user }    = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState({ quantity_g: 200, message: "", shipping_address: "" });
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

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

  if (user?.role !== "buyer" && user?.role !== "admin") return null;

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#FFFFFF",
    border: "1px solid rgba(28,28,26,0.15)", borderRadius: "4px",
    padding: "8px 10px", color: "#1C1C1A",
    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem",
    outline: "none", boxSizing: "border-box", marginBottom: "10px",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "rgba(28,28,26,0.45)", display: "block", marginBottom: "4px",
  };

  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.08)",
      borderRadius: "6px", padding: "20px",
      boxShadow: "0 1px 3px rgba(28,28,26,0.06)",
    }}>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.4)", margin: "0 0 12px" }}>
        Request Sample
      </p>

      {success ? (
        <div style={{ background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.2)", borderRadius: "4px", padding: "10px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#1B4D35" }}>
          ✓ Sample request submitted for {lotRef}. The exporter will respond shortly.
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%", background: "#1B4D35", border: "none", borderRadius: "4px",
            padding: "10px", color: "white", fontFamily: "DM Mono, monospace",
            fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}
        >
          <Package size={13} /> Request {lotRef} Sample
        </button>
      ) : (
        <>
          <label style={labelStyle}>Sample Size (grams)</label>
          <select
            style={inputStyle}
            value={form.quantity_g}
            onChange={e => setForm(f => ({ ...f, quantity_g: parseInt(e.target.value) }))}
          >
            <option value={100}>100g</option>
            <option value={200}>200g (standard)</option>
            <option value={350}>350g</option>
            <option value={500}>500g</option>
          </select>

          <label style={labelStyle}>Message to exporter</label>
          <input style={inputStyle} placeholder="Cupping purpose, roast profile interest..."
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            onFocus={e => { e.target.style.borderColor = '#1B4D35'; e.target.style.boxShadow = '0 0 0 3px rgba(27,77,53,0.08)'; }}
            onBlur={e  => { e.target.style.borderColor = 'rgba(28,28,26,0.15)'; e.target.style.boxShadow = 'none'; }}
          />

          <label style={labelStyle}>Shipping Address</label>
          <input style={inputStyle} placeholder="Full shipping address"
            value={form.shipping_address}
            onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))}
            onFocus={e => { e.target.style.borderColor = '#1B4D35'; e.target.style.boxShadow = '0 0 0 3px rgba(27,77,53,0.08)'; }}
            onBlur={e  => { e.target.style.borderColor = 'rgba(28,28,26,0.15)'; e.target.style.boxShadow = 'none'; }}
          />

          {error && (
            <div style={{ background: "#FDECEA", border: "1px solid rgba(192,57,43,0.2)", borderRadius: "4px", padding: "8px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#C0392B", marginBottom: "8px" }}>
              {error}
            </div>
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{
              width: "100%", background: mutation.isPending ? "rgba(27,77,53,0.5)" : "#1B4D35",
              border: "none", borderRadius: "4px", padding: "10px", color: "white",
              fontFamily: "DM Mono, monospace", fontSize: "0.68rem", letterSpacing: "0.12em",
              textTransform: "uppercase", cursor: mutation.isPending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            {mutation.isPending ? "Submitting..." : "Submit Sample Request →"}
          </button>

          <button
            onClick={() => { setOpen(false); setError(""); }}
            style={{
              width: "100%", background: "none", border: "1px solid rgba(28,28,26,0.12)",
              borderRadius: "4px", padding: "8px", color: "rgba(28,28,26,0.45)",
              fontFamily: "DM Mono, monospace", fontSize: "0.65rem", cursor: "pointer",
              marginTop: "6px", textTransform: "uppercase", letterSpacing: "0.1em",
            }}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
