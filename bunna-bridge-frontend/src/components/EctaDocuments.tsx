import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadEctaLicense, viewExporterEctaLicense } from "../api/docs";
import { getMe } from "../api/auth";
import {
  Upload, ExternalLink,
  Loader, FileText, ShieldCheck,
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

export default function EctaDocuments() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState(me?.ecta_license_number ?? "");
  const [expiry, setExpiry] = useState(me?.ecta_license_expiry ?? "");
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleView = async () => {
    if (!me?.id) return;
    setViewing(true);
    try {
      await viewExporterEctaLicense(me.id);
    } catch {
      // silently ignored — the document just won't open
    } finally {
      setViewing(false);
    }
  };

  const hasLicense = !!me?.ecta_license_file;

  const labelStyle: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "block", marginBottom: "4px" };

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
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, marginBottom: "14px" }}>ECTA Export License</p>

      <div style={{
        padding: "14px 16px", borderRadius: AT.radius.md,
        background: hasLicense ? AT.color.primaryLight : AT.color.surfaceSecondary,
        border: `1px solid ${hasLicense ? AT.color.primary + "33" : AT.color.border}`,
        marginBottom: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldCheck size={13} color={hasLicense ? AT.color.primaryDark : AT.color.textDisabled} />
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: hasLicense ? AT.color.text : AT.color.textMuted }}>
              {hasLicense ? "ECTA License on file" : "No ECTA license uploaded"}
            </span>
            {me?.ecta_license_expiry && (
              <span style={{ ...AC.pill.base, ...AC.pill.yellow }}>EXP {me.ecta_license_expiry}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {me?.ecta_license_file && (
              <button
                onClick={handleView} disabled={viewing}
                style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", padding: 0, fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500, color: AT.color.primaryDark, cursor: viewing ? "not-allowed" : "pointer" }}
              >
                {viewing ? <Loader size={11} /> : <ExternalLink size={11} />} View
              </button>
            )}
            <button onClick={() => { setNumber(me?.ecta_license_number ?? ""); setExpiry(me?.ecta_license_expiry ?? ""); setOpen(true); }} style={AC.btnSm}>
              <Upload size={10} /> {hasLicense ? "Replace" : "Upload"}
            </button>
          </div>
        </div>
        {me?.ecta_license_number && (
          <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "6px 0 0" }}>
            # {me.ecta_license_number}
          </p>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(10,15,20,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{ ...AC.card, padding: "28px", width: "100%", maxWidth: "420px" }}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.text, margin: "0 0 20px" }}>
              ECTA Export License
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>License Number *</label>
                <input style={AC.input} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. ECTA-ET-2026-00123" />
              </div>
              <div>
                <label style={labelStyle}>License File {hasLicense ? "(optional — replaces existing)" : "*"}</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ ...AC.input, cursor: "pointer", textAlign: "left", color: file ? AT.color.text : AT.color.textDisabled, display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <FileText size={13} />
                  {file ? file.name : "Choose PDF, JPG or PNG"}
                </button>
              </div>
              <div>
                <label style={labelStyle}>Expiry Date (optional)</label>
                <input type="date" style={AC.input} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </div>
              {error && <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.red, margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button onClick={() => { setOpen(false); setFile(null); setError(""); }} style={{ ...AC.btnGhost, flex: 1, justifyContent: "center" }}>
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ ...AC.btnPrimary, flex: 2, justifyContent: "center", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                >
                  {loading ? <><Loader size={12} /> Saving…</> : <><Upload size={12} /> Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
