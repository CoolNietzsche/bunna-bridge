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
      setSuccess(true);
      setOpen(false);
      if (onSuccess) onSuccess();
      setForm({ quantity_g: 200, message: "", shipping_address: "" });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to submit request.");
    },
  });

  if (user?.role !== "buyer" && user?.role !== "admin") return null;

  const S = {
    wrap:    { background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", padding: "16px", marginTop: "16px" },
    title:   { fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#D4824A", margin: "0 0 12px" },
    success: { background: "rgba(30,58,47,0.3)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "2px", padding: "10px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#A8C5A0" },
    btn:     { width: "100%", background: "#C1440E", border: "none", borderRadius: "2px", padding: "9px", color: "white", fontFamily: "DM Mono, monospace", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" },
    label:   { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)", display: "block", marginBottom: "4px" },
    input:   { width: "100%", background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "7px 10px", color: "#F5EDD8", fontFamily: "DM Mono, monospace", fontSize: "0.78rem", outline: "none", boxSizing: "border-box" as const, marginBottom: "10px" },
    err:     { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "8px 12px", fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#C1440E", marginBottom: "8px" },
    cancel:  { width: "100%", background: "none", border: "1px solid rgba(245,237,216,0.1)", borderRadius: "2px", padding: "7px", color: "rgba(245,237,216,0.4)", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", cursor: "pointer", marginTop: "6px", textTransform: "uppercase" as const, letterSpacing: "0.1em" },
  };

  return (
    <div style={S.wrap}>
      <p style={S.title}>Request Sample</p>

      {success ? (
        <div style={S.success}>
          ✓ Sample request submitted for {lotRef}. The exporter will respond shortly.
        </div>
      ) : !open ? (
        <button style={S.btn} onClick={() => setOpen(true)}>
          <Package size={13} /> Request {lotRef} Sample
        </button>
      ) : (
        <>
          <label style={S.label}>Sample Size (grams)</label>
          <select style={S.input}
            value={form.quantity_g}
            onChange={e => setForm(f => ({ ...f, quantity_g: parseInt(e.target.value) }))}>
            <option value={100}>100g</option>
            <option value={200}>200g (standard)</option>
            <option value={350}>350g</option>
            <option value={500}>500g</option>
          </select>

          <label style={S.label}>Message to exporter</label>
          <input style={S.input} placeholder="Cupping purpose, roast profile interest..."
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />

          <label style={S.label}>Shipping Address</label>
          <input style={S.input} placeholder="Full shipping address"
            value={form.shipping_address}
            onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))} />

          {error && <div style={S.err}>{error}</div>}

          <button style={S.btn}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting..." : "Submit Sample Request →"}
          </button>
          <button style={S.cancel} onClick={() => { setOpen(false); setError(""); }}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
