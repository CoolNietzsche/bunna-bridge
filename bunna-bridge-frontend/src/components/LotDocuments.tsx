import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  uploadPhytoCert, uploadEcexPermit,
  uploadNbeFxDeclaration, saveCustomsDeclaration,
  viewLotDocument,
} from "../api/docs";
import { useAuth } from "../context/AuthContext";
import { Upload, ExternalLink, CheckCircle, XCircle, Loader, FileText, Hash } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

interface Props { lot: Record<string, any>; lotId: string; }
type DocKey = "phyto" | "ecex" | "nbe" | "customs";

const DOC_FIELD_NAMES: Record<DocKey, string> = {
  phyto: "phyto_cert_file",
  ecex: "ecex_permit_file",
  nbe: "nbe_fx_declaration_file",
  customs: "customs_declaration_file",
};

function DocRow({ label, fileUrl, expiry, extra, canUpload, onUpload, loading, lotId, docKey }: {
  label: string; fileUrl?: string | null; expiry?: string | null;
  extra?: React.ReactNode; canUpload: boolean; onUpload: () => void; loading: boolean;
  lotId: string; docKey: DocKey;
}) {
  const present = !!fileUrl;
  const [viewing, setViewing] = useState(false);

  const handleView = async () => {
    setViewing(true);
    try {
      await viewLotDocument(lotId, DOC_FIELD_NAMES[docKey]);
    } catch {
      // silently ignored — the document just won't open
    } finally {
      setViewing(false);
    }
  };

  return (
    <div style={{
      padding: "12px 14px", borderRadius: AT.radius.sm, marginBottom: "8px",
      background: present ? AT.color.primaryLight : AT.color.surfaceSecondary,
      border: `1px solid ${present ? AT.color.primary + "33" : AT.color.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {present
            ? <CheckCircle size={13} color={AT.color.primaryDark} />
            : <XCircle size={13} color={AT.color.textDisabled} />
          }
          <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: present ? AT.color.text : AT.color.textMuted }}>
            {label}
          </span>
          {expiry && <span style={{ ...AC.pill.base, ...AC.pill.yellow }}>EXP {expiry}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {fileUrl && (
            <button onClick={handleView} disabled={viewing}
              style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", padding: 0, fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500, color: AT.color.primaryDark, cursor: viewing ? "not-allowed" : "pointer" }}>
              {viewing ? <Loader size={11} /> : <ExternalLink size={11} />} View
            </button>
          )}
          {canUpload && (
            <button onClick={onUpload} disabled={loading} style={AC.btnSm}>
              {loading ? <Loader size={10} /> : <Upload size={10} />}
              {present ? "Replace" : "Upload"}
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
  const canView = ["exporter", "admin", "buyer"].includes(user?.role ?? "");
  const [loading, setLoading] = useState<DocKey | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<DocKey | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState("");
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

  const labelStyle: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "block", marginBottom: "4px" };
  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "14px" };

  return (
    <div>
      <p style={cardTitle}>Compliance Documents</p>
      <DocRow label="Phytosanitary Certificate" fileUrl={lot.phyto_cert_file} expiry={lot.phyto_cert_expiry} canUpload={canUpload} onUpload={() => setModal("phyto")} loading={loading === "phyto"} lotId={lotId} docKey="phyto" />
      <DocRow label="ECEX Export Permit" fileUrl={lot.ecex_permit_file} expiry={lot.ecex_permit_expiry} canUpload={canUpload} onUpload={() => setModal("ecex")} loading={loading === "ecex"} lotId={lotId} docKey="ecex"
        extra={lot.ecex_permit_number ? (
          <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "6px 0 0" }}>
            <Hash size={10} style={{ display: "inline", marginRight: 4 }} />{lot.ecex_permit_number}
          </p>
        ) : null}
      />
      <DocRow label="NBE FX Declaration" fileUrl={lot.nbe_fx_declaration_file} canUpload={canUpload} onUpload={() => setModal("nbe")} loading={loading === "nbe"} lotId={lotId} docKey="nbe" />
      <DocRow label="Customs Declaration" fileUrl={lot.customs_declaration_file} canUpload={canUpload} onUpload={() => setModal("customs")} loading={loading === "customs"} lotId={lotId} docKey="customs"
        extra={lot.customs_declaration_id ? (
          <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "6px 0 0" }}>
            <Hash size={10} style={{ display: "inline", marginRight: 4 }} />{lot.customs_declaration_id}
          </p>
        ) : null}
      />

      {modal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(10,15,20,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{ ...AC.card, padding: "28px", width: "100%", maxWidth: "420px" }}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 600, color: AT.color.text, margin: "0 0 20px" }}>
              {modal === "phyto" && "Upload Phytosanitary Certificate"}
              {modal === "ecex" && "Upload ECEX Export Permit"}
              {modal === "nbe" && "Upload NBE FX Declaration"}
              {modal === "customs" && "Customs Declaration"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {modal === "customs" && (
                <div>
                  <label style={labelStyle}>Declaration ID (optional)</label>
                  <input style={AC.input} value={customsId} onChange={(e) => setCustomsId(e.target.value)} placeholder="e.g. ETH-2026-CUS-001234" />
                </div>
              )}
              {modal === "ecex" && (
                <div>
                  <label style={labelStyle}>Permit Number *</label>
                  <input style={AC.input} value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} placeholder="e.g. ECEX-2026-001234" />
                </div>
              )}
              <div>
                <label style={labelStyle}>{modal === "customs" ? "Document File (optional)" : "Document File *"}</label>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button onClick={() => fileRef.current?.click()} style={{ ...AC.input, cursor: "pointer", textAlign: "left", color: file ? AT.color.text : AT.color.textDisabled, display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={13} />
                  {file ? file.name : "Choose PDF, JPG or PNG"}
                </button>
              </div>
              {(modal === "phyto" || modal === "ecex") && (
                <div>
                  <label style={labelStyle}>Expiry Date (optional)</label>
                  <input type="date" style={AC.input} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </div>
              )}
              {error && <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.red, margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button onClick={() => { setModal(null); setFile(null); setError(""); }} style={{ ...AC.btnGhost, flex: 1, justifyContent: "center" }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={!!loading} style={{ ...AC.btnPrimary, flex: 2, justifyContent: "center", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? <><Loader size={12} /> Uploading…</> : <><Upload size={12} /> Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
