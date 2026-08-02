import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCertifications, createCertification, updateCertification, deleteCertification,
} from "../api/certifications";
import type { Certification, CertificationInput, CertType } from "../api/certifications";
import AdminShell from "../components/admin/AdminShell";
import {
  Award, Plus, Edit2, Trash2, X, Check, FileText, ShieldCheck, ShieldAlert, ShieldX,
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const CERT_TYPES: { value: CertType; label: string }[] = [
  { value: "organic", label: "Organic" },
  { value: "fair_trade", label: "Fair Trade" },
  { value: "rainforest_alliance", label: "Rainforest Alliance" },
  { value: "utz", label: "UTZ" },
  { value: "q_arabica", label: "Q Arabica" },
  { value: "iso", label: "ISO" },
  { value: "haccp", label: "HACCP" },
  { value: "other", label: "Other" },
];

const certTypeLabel = (t: string) => CERT_TYPES.find((c) => c.value === t)?.label || t;

const EMPTY_FORM: CertificationInput = { cert_type: "organic", issuing_body: "", cert_number: "", issue_date: "", expiry_date: "" };

function expiryStatus(cert: Certification): { label: string; tone: "green" | "yellow" | "red" | "muted"; icon: React.ReactNode } {
  if (!cert.expiry_date) return { label: "No Expiry", tone: "muted", icon: <ShieldCheck size={11} /> };
  if (cert.is_expired) return { label: "Expired", tone: "red", icon: <ShieldX size={11} /> };
  const daysLeft = (new Date(cert.expiry_date).getTime() - Date.now()) / 86_400_000;
  if (daysLeft <= 60) return { label: "Expiring Soon", tone: "yellow", icon: <ShieldAlert size={11} /> };
  return { label: "Valid", tone: "green", icon: <ShieldCheck size={11} /> };
}

export default function Certifications() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CertificationInput>(EMPTY_FORM);
  const [file, setFile] = useState<File | undefined>(undefined);

  const { data: certifications, isLoading } = useQuery({
    queryKey: ["certifications"],
    queryFn: getCertifications,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["certifications"] });

  const createMutation = useMutation({
    mutationFn: (input: CertificationInput) => createCertification(input),
    onSuccess: () => { invalidate(); closeForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CertificationInput> }) => updateCertification(id, input),
    onSuccess: () => { invalidate(); closeForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCertification(id),
    onSuccess: invalidate,
  });

  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); setFile(undefined); };

  const startAdd = () => { setForm(EMPTY_FORM); setFile(undefined); setEditingId(null); setFormOpen(true); };

  const startEdit = (cert: Certification) => {
    setForm({
      cert_type: cert.cert_type,
      issuing_body: cert.issuing_body,
      cert_number: cert.cert_number,
      issue_date: cert.issue_date || "",
      expiry_date: cert.expiry_date || "",
    });
    setFile(undefined);
    setEditingId(cert.id);
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const input = { ...form, ...(file ? { file } : {}) };
    if (editingId) updateMutation.mutate({ id: editingId, input });
    else createMutation.mutate(input);
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };
  const flabel: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "block", marginBottom: "4px" };
  const field: React.CSSProperties = { marginBottom: "14px" };

  return (
    <AdminShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>Trust & compliance</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Certifications</h1>
          <p style={AC.pageSubtitle}>Organic, Fair Trade, and other certifications tied to your account.</p>
        </div>
        {!formOpen && (
          <button style={AC.btnPrimary} onClick={startAdd}>
            <Plus size={14} /> Add Certification
          </button>
        )}
      </div>

      {formOpen && (
        <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "20px" }}>
          <p style={cardTitle}>{editingId ? "Edit Certification" : "New Certification"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            <div style={field}>
              <label style={flabel}>Certification Type</label>
              <select style={AC.input} value={form.cert_type} onChange={(e) => setForm((f) => ({ ...f, cert_type: e.target.value as CertType }))}>
                {CERT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={field}>
              <label style={flabel}>Issuing Body</label>
              <input style={AC.input} placeholder="e.g. Ecocert" value={form.issuing_body || ""} onChange={(e) => setForm((f) => ({ ...f, issuing_body: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Certificate Number</label>
              <input style={AC.input} placeholder="e.g. ET-BIO-1234" value={form.cert_number || ""} onChange={(e) => setForm((f) => ({ ...f, cert_number: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Issue Date</label>
              <input style={AC.input} type="date" value={form.issue_date || ""} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Expiry Date</label>
              <input style={AC.input} type="date" value={form.expiry_date || ""} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div style={field}>
              <label style={flabel}>Certificate File (PDF/JPG/PNG)</label>
              <input style={AC.input} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0])} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={AC.btnPrimary} onClick={handleSubmit} disabled={saving}>
              <Check size={13} /> {saving ? "Saving…" : "Save"}
            </button>
            <button style={AC.btnGhost} onClick={closeForm}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ ...AC.card }}>
        {isLoading && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading certifications…</p>
          </div>
        )}

        {!isLoading && !certifications?.length && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Award size={28} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>No certifications on file yet.</p>
          </div>
        )}

        {!isLoading && !!certifications?.length && (
          <div style={{ overflowX: "auto" }}>
            <table style={AC.table}>
              <thead>
                <tr>
                  <th style={AC.th}>Type</th>
                  <th style={AC.th}>Issuing Body</th>
                  <th style={AC.th}>Number</th>
                  <th style={AC.th}>Expires</th>
                  <th style={AC.th}>Status</th>
                  <th style={AC.th}>File</th>
                  <th style={AC.th}></th>
                </tr>
              </thead>
              <tbody>
                {certifications.map((cert) => {
                  const status = expiryStatus(cert);
                  return (
                    <tr key={cert.id}>
                      <td style={AC.td}>{certTypeLabel(cert.cert_type)}</td>
                      <td style={AC.td}>{cert.issuing_body || "—"}</td>
                      <td style={{ ...AC.td, fontFamily: AT.font.mono, fontSize: "0.8rem" }}>{cert.cert_number || "—"}</td>
                      <td style={AC.td}>{cert.expiry_date || "—"}</td>
                      <td style={AC.td}>
                        <span style={{ ...AC.pill.base, ...AC.pill[status.tone] }}>{status.icon} {status.label}</span>
                      </td>
                      <td style={AC.td}>
                        {cert.file ? (
                          <a href={cert.file} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: AT.color.blue, fontFamily: AT.font.sans, fontSize: "0.78rem" }}>
                            <FileText size={12} /> View
                          </a>
                        ) : "—"}
                      </td>
                      <td style={AC.td}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button style={AC.btnSm} onClick={() => startEdit(cert)}><Edit2 size={11} /></button>
                          <button style={AC.btnSm} onClick={() => deleteMutation.mutate(cert.id)} disabled={deleteMutation.isPending}><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
