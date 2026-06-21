import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  uploadPhytoCert, uploadEcexPermit,
  uploadNbeFxDeclaration, saveCustomsDeclaration,
  getMediaUrl,
} from "../api/docs";
import { useAuth } from "../context/AuthContext";
import { Upload, ExternalLink, CheckCircle, XCircle, Loader, FileText, Hash } from "lucide-react";

interface Props { lot: Record<string, any>; lotId: string; }
type DocKey = "phyto" | "ecex" | "nbe" | "customs";

function DocRow({ label, fileUrl, expiry, extra, canUpload, onUpload, loading }: {
  label: string; fileUrl?: string | null; expiry?: string | null;
  extra?: React.ReactNode; canUpload: boolean; onUpload: () => void; loading: boolean;
}) {
  const present = !!fileUrl;
  return (
    <div style={{
      padding: "12px 14px", borderRadius: "4px", marginBottom: "8px",
      background: present ? "#E8F2EC" : "#F7F5F0",
      border: `1px solid ${present ? "rgba(27,77,53,0.2)" : "rgba(28,28,26,0.07)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {present
            ? <CheckCircle size={13} color="#1B4D35" />
            : <XCircle size={13} color="rgba(28,28,26,0.2)" />
          }
          <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: present ? "#1C1C1A" : "rgba(28,28,26,0.45)" }}>
            {label}
          </span>
          {expiry && (
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.56rem", color: "rgba(123,75,42,0.7)", letterSpacing: "0.06em" }}>
              EXP {expiry}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {fileUrl && (
            <a href={getMediaUrl(fileUrl) ?? "#"} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#1B4D35", letterSpacing: "0.06em", textDecoration: "none" }}>
              <ExternalLink size={11} /> VIEW
            </a>
          )}
          {canUpload && (
            <button onClick={onUpload} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", borderRadius: "3px", border: "none",
              background: "#F5EDE4", color: loading ? "rgba(123,75,42,0.4)" : "#7B4B2A",
              fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
              letterSpacing: "0.06em", cursor: loading ? "not-allowed" : "pointer",
            }}>
              {loading ? <Loader size={10} /> : <Upload size={10} />}
              {present ? "REPLACE" : "UPLOAD"}
            </button>
          )}
        </div>
      </div>
      {extra}
    </div>
  );
}

export default function LotDocuments({ lot, lotId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canUpload = user?.role === "exporter" || user?.role === "admin";
  const canView   = ["exporter", "admin", "buyer"].includes(user?.role ?? "");
  const [loading, setLoading]   = useState<DocKey | null>(null);
  const [error, setError]       = useState("");
  const [modal, setModal]       = useState<DocKey | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [expiry, setExpiry]     = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [customsId, setCustomsId] = useState(lot.customs_declaration_id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!canView) return null;

  const refresh = () => qc.invalidateQueries({ queryKey: ["lot", lotId] });

  async function handleSubmit() {
    if (!modal) return;
    setError(""); setLoading(modal);
    try {
      if (modal === "phyto") {
        if (!file) throw new Error("Select a file first.");
        await uploadPhytoCert(lotId, file, expiry || undefined);
      } else if (modal === "ecex") {
        if (!file) throw new Error("Select a file first.");
        if (!permitNumber) throw new Error("Permit number is required.");
        await uploadEcexPermit(lotId, file, permitNumber, expiry || undefined);
      } else if (modal === "nbe") {
        if (!file) throw new Error("Select a file first.");
        await uploadNbeFxDeclaration(lotId, file);
      } else if (modal === "customs") {
        await saveCustomsDeclaration(lotId, customsId, file || undefined);
      }
      await refresh();
      setModal(null); setFile(null); setExpiry(""); setPermitNumber("");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Upload failed.");
    } finally { setLoading(null); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: "4px",
    background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.15)",
    color: "#1C1C1A", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem",
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "DM Mono, monospace", fontSize: "0.56rem",
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: "rgba(28,28,26,0.45)", display: "block", marginBottom: "4px",
  };

  return (
    <div>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.4)", margin: "0 0 14px" }}>
        Compliance Documents
      </p>
      <DocRow label="Phytosanitary Certificate" fileUrl={lot.phyto_cert_file} expiry={lot.phyto_cert_expiry} canUpload={canUpload} onUpload={() => setModal("phyto")} loading={loading === "phyto"} />
      <DocRow label="ECEX Export Permit" fileUrl={lot.ecex_permit_file} expiry={lot.ecex_permit_expiry} canUpload={canUpload} onUpload={() => setModal("ecex")} loading={loading === "ecex"}
        extra={lot.ecex_permit_number ? (
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.4)", margin: "6px 0 0", letterSpacing: "0.06em" }}>
            <Hash size={10} style={{ display: "inline", marginRight: 4 }} />{lot.ecex_permit_number}
          </p>
        ) : null}
      />
      <DocRow label="NBE FX Declaration" fileUrl={lot.nbe_fx_declaration_file} canUpload={canUpload} onUpload={() => setModal("nbe")} loading={loading === "nbe"} />
      <DocRow label="Customs Declaration" fileUrl={lot.customs_declaration_file} canUpload={canUpload} onUpload={() => setModal("customs")} loading={loading === "customs"}
        extra={lot.customs_declaration_id ? (
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.4)", margin: "6px 0 0", letterSpacing: "0.06em" }}>
            <Hash size={10} style={{ display: "inline", marginRight: 4 }} />{lot.customs_declaration_id}
          </p>
        ) : null}
      />

      {/* Upload Modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(28,28,26,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{
            background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.1)",
            borderRadius: "8px", padding: "28px", width: "100%", maxWidth: "420px",
            boxShadow: "0 8px 32px rgba(28,28,26,0.15)",
          }}>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.3rem", color: "#1C1C1A", margin: "0 0 20px" }}>
              {modal === "phyto"   && "Upload Phytosanitary Certificate"}
              {modal === "ecex"    && "Upload ECEX Export Permit"}
              {modal === "nbe"     && "Upload NBE FX Declaration"}
              {modal === "customs" && "Customs Declaration"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {modal === "customs" && (
                <div>
                  <label style={labelStyle}>Declaration ID (optional)</label>
                  <input style={inputStyle} value={customsId} onChange={e => setCustomsId(e.target.value)} placeholder="e.g. ETH-2026-CUS-001234" />
                </div>
              )}
              {modal === "ecex" && (
                <div>
                  <label style={labelStyle}>Permit Number *</label>
                  <input style={inputStyle} value={permitNumber} onChange={e => setPermitNumber(e.target.value)} placeholder="e.g. ECEX-2026-001234" />
                </div>
              )}
              <div>
                <label style={labelStyle}>{modal === "customs" ? "Document File (optional)" : "Document File *"}</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                <button onClick={() => fileRef.current?.click()} style={{ ...inputStyle, cursor: "pointer", textAlign: "left", color: file ? "#1C1C1A" : "rgba(28,28,26,0.3)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={13} />
                  {file ? file.name : "Choose PDF, JPG or PNG"}
                </button>
              </div>
              {(modal === "phyto" || modal === "ecex") && (
                <div>
                  <label style={labelStyle}>Expiry Date (optional)</label>
                  <input type="date" style={inputStyle} value={expiry} onChange={e => setExpiry(e.target.value)} />
                </div>
              )}
              {error && <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#C0392B", margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button onClick={() => { setModal(null); setFile(null); setError(""); }} style={{ flex: 1, padding: "10px", borderRadius: "4px", background: "transparent", border: "1px solid rgba(28,28,26,0.12)", color: "rgba(28,28,26,0.5)", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", cursor: "pointer" }}>
                  CANCEL
                </button>
                <button onClick={handleSubmit} disabled={!!loading} style={{ flex: 2, padding: "10px", borderRadius: "4px", border: "none", background: loading ? "rgba(27,77,53,0.4)" : "#1B4D35", color: loading ? "rgba(255,255,255,0.4)" : "#FFFFFF", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  {loading ? <><Loader size={12} /> UPLOADING...</> : <><Upload size={12} /> SAVE</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
