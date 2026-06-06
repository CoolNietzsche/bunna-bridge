import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadEctaLicense, getMediaUrl } from "../api/docs";
import { getMe } from "../api/auth";
import {
  Upload, ExternalLink,
  Loader, FileText, ShieldCheck,
} from "lucide-react";

export default function EctaDocuments() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [open, setOpen]           = useState(false);
  const [file, setFile]           = useState<File | null>(null);
  const [number, setNumber]       = useState(me?.ecta_license_number ?? "");
  const [expiry, setExpiry]       = useState(me?.ecta_license_expiry ?? "");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const hasLicense = !!me?.ecta_license_file;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "3px",
    background: "rgba(245,237,216,0.05)", border: "1px solid rgba(245,237,216,0.12)",
    color: "#F5EDD8", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "DM Mono, monospace", fontSize: "0.56rem",
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "rgba(245,237,216,0.35)", display: "block", marginBottom: "4px",
  };

  async function handleSubmit() {
    if (!file && !hasLicense) { setError("Select a file."); return; }
    if (!number) { setError("License number is required."); return; }
    setError(""); setLoading(true);
    try {
      await uploadEctaLicense(file!, number, expiry || undefined);
      await qc.invalidateQueries({ queryKey: ["me"] });
      setOpen(false); setFile(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)",
      borderRadius: "6px", padding: "20px 24px",
    }}>
      <p style={{
        fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
        letterSpacing: "0.2em", textTransform: "uppercase",
        color: "rgba(245,237,216,0.3)", margin: "0 0 14px",
      }}>
        ECTA Export License
      </p>

      <div style={{
        padding: "14px 16px", borderRadius: "4px",
        background: hasLicense ? "rgba(30,58,47,0.15)" : "rgba(245,237,216,0.03)",
        border: `1px solid ${hasLicense ? "rgba(74,124,89,0.25)" : "rgba(245,237,216,0.08)"}`,
        marginBottom: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={13} color={hasLicense ? "#4A7C59" : "rgba(245,237,216,0.2)"} />
            <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: hasLicense ? "#F5EDD8" : "rgba(245,237,216,0.4)" }}>
              {hasLicense ? "ECTA License on file" : "No ECTA license uploaded"}
            </span>
            {me?.ecta_license_expiry && (
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.56rem", color: "rgba(201,149,42,0.6)" }}>
                EXP {me.ecta_license_expiry}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {me?.ecta_license_file && (
              <a
                href={getMediaUrl(me.ecta_license_file) ?? "#"}
                target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#A8C5A0", textDecoration: "none" }}
              >
                <ExternalLink size={11} /> VIEW
              </a>
            )}
            <button
              onClick={() => { setNumber(me?.ecta_license_number ?? ""); setExpiry(me?.ecta_license_expiry ?? ""); setOpen(true); }}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "4px 10px", borderRadius: "3px", border: "none",
                background: "rgba(212,130,74,0.12)", color: "#D4824A",
                fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
                letterSpacing: "0.06em", cursor: "pointer",
              }}
            >
              <Upload size={10} /> {hasLicense ? "REPLACE" : "UPLOAD"}
            </button>
          </div>
        </div>
        {me?.ecta_license_number && (
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", margin: "6px 0 0" }}>
            # {me.ecta_license_number}
          </p>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(26,15,7,0.85)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: "#2C1810", border: "1px solid rgba(245,237,216,0.1)",
            borderRadius: "6px", padding: "28px", width: "100%", maxWidth: "420px",
          }}>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "#F5EDD8", margin: "0 0 20px" }}>
              ECTA Export License
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>License Number *</label>
                <input style={inputStyle} value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. ECTA-ET-2026-00123" />
              </div>
              <div>
                <label style={labelStyle}>License File {hasLicense ? "(optional — replaces existing)" : "*"}</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ ...inputStyle, cursor: "pointer", textAlign: "left", color: file ? "#F5EDD8" : "rgba(245,237,216,0.3)", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <FileText size={13} />
                  {file ? file.name : "Choose PDF, JPG or PNG"}
                </button>
              </div>
              <div>
                <label style={labelStyle}>Expiry Date (optional)</label>
                <input type="date" style={inputStyle} value={expiry} onChange={e => setExpiry(e.target.value)} />
              </div>
              {error && <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#C1440E", margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  onClick={() => { setOpen(false); setFile(null); setError(""); }}
                  style={{ flex: 1, padding: "10px", borderRadius: "3px", background: "transparent", border: "1px solid rgba(245,237,216,0.1)", color: "rgba(245,237,216,0.4)", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", cursor: "pointer" }}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ flex: 2, padding: "10px", borderRadius: "3px", border: "none", background: loading ? "rgba(212,130,74,0.2)" : "#D4824A", color: loading ? "rgba(255,255,255,0.4)" : "#1A0F07", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  {loading ? <><Loader size={12} /> SAVING...</> : <><Upload size={12} /> SAVE</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
