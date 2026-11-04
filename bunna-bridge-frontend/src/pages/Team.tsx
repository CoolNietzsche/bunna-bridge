import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, FileText, FileUp, Mail, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import { apiError } from "../api/traceability";
import {
  TEAM_ROLE_HELP, changeMemberRole, deleteComplianceDoc, getCompliance, getMyOrganization, inviteMember,
  openComplianceDoc, removeMember, revokeInvitation, uploadComplianceDoc,
} from "../api/team";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const STATE_TONE = { missing: "red", pending: "yellow", verified: "green", expired: "red", rejected: "red" } as const;
const STATE_LABEL = { missing: "Missing", pending: "Awaiting verification", verified: "Verified", expired: "Expired", rejected: "Rejected" };
const KIND_LABEL: Record<string, string> = {
  lab_certificate: "Certified quality laboratory",
  taster_certificate: "Certified coffee taster",
  capital_attestation: "Paid-up capital attestation",
};

export default function Team() {
  const { user } = useAuth();
  const { data: org, isLoading, isError } = useQuery({ queryKey: ["my-org"], queryFn: getMyOrganization, retry: false });

  return (
    <AdminShell>
      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>Organisation</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>{org?.organization.name ?? "Team"}</h1>
        <p style={AC.pageSubtitle}>
          {org ? `${org.organization.kind_label} · you are ${org.my_role.replace("_", " ")}` : "Your team and company records."}
        </p>
      </div>
      {isLoading && <Muted>Loading…</Muted>}
      {isError && <Muted>Your account is not part of an organisation (farmer, Q-grader and platform accounts work on their own).</Muted>}
      {org && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(440px, 100%), 1fr))", gap: "20px", alignItems: "start" }}>
          <TeamCard />
          {(user?.role === "exporter" || user?.role === "roaster") && <ComplianceCard canEdit={org.can_manage_team || org.my_role === "logistics"} />}
        </div>
      )}
    </AdminShell>
  );
}

function TeamCard() {
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["my-org"], queryFn: getMyOrganization });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("sales");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-org"] });

  const invite = useMutation({
    mutationFn: () => inviteMember(email, role),
    onSuccess: () => { setEmail(""); setError(""); refresh(); },
    onError: (e) => setError(apiError(e)),
  });
  if (!org) return null;
  const manage = org.can_manage_team;
  const link = (token: string) => `${window.location.origin}/invite/${token}`;

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={{ ...AC.cardTitle, marginBottom: "12px" }}>Team</p>
      <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
        {org.members.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between", flexWrap: "wrap", padding: "8px 0", borderBottom: `1px solid ${AT.color.borderLight}` }}>
            <div>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", fontWeight: 500, color: AT.color.text, margin: 0 }}>{m.name}</p>
              <Muted>{m.email}</Muted>
            </div>
            {manage ? (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <select aria-label={`Role for ${m.email}`} style={{ ...AC.input, width: "auto" }} value={m.role}
                  onChange={async (e) => { try { await changeMemberRole(m.id, e.target.value); refresh(); } catch (err) { setError(apiError(err)); } }}>
                  {org.roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <button style={AC.btnSm} aria-label={`Remove ${m.email}`} title="Remove from team"
                  onClick={async () => { if (window.confirm(`Remove ${m.email} from the team?`)) { try { await removeMember(m.id); refresh(); } catch (err) { setError(apiError(err)); } } }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ) : <Pill tone="blue">{m.role_label}</Pill>}
          </div>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {manage && (
        <>
          <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "0.82rem", margin: "0 0 8px", color: AT.color.text }}>Invite a teammate</p>
          <div style={grid(180)}>
            <Field label="Email"><input style={AC.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></Field>
            <Field label="Role" hint={TEAM_ROLE_HELP[role]}>
              <select style={AC.input} value={role} onChange={(e) => setRole(e.target.value)}>
                {org.roles.filter((r) => r.value !== "owner").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
          </div>
          <button style={AC.btnPrimary} disabled={!email || invite.isPending} onClick={() => invite.mutate()}>
            <UserPlus size={14} /> Create invitation
          </button>
          {org.invitations.length > 0 && (
            <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
              <Muted>Open invitations — send the link to each person (email sending is not connected yet).</Muted>
              {org.invitations.map((i) => (
                <div key={i.id} style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: "8px 10px", background: AT.color.surfaceSecondary, borderRadius: AT.radius.sm }}>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text }}>
                    <Mail size={12} style={{ verticalAlign: "-2px" }} /> {i.email} · {i.role_label} · until {formatDate(i.expires_at)}
                  </span>
                  <span style={{ display: "flex", gap: "6px" }}>
                    <button style={AC.btnSm} onClick={async () => { await navigator.clipboard.writeText(link(i.token)); setCopied(i.token); setTimeout(() => setCopied(null), 2000); }}>
                      {copied === i.token ? <Check size={12} /> : <Copy size={12} />} {copied === i.token ? "Copied" : "Copy link"}
                    </button>
                    <button style={AC.btnSm} aria-label="Revoke invitation" onClick={async () => { await revokeInvitation(i.id); refresh(); }}><X size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ComplianceCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["org-compliance"], queryFn: getCompliance });
  const [kind, setKind] = useState("lab_certificate");
  const [form, setForm] = useState({ number: "", holder_name: "", amount_birr: "", issued_on: "", expires_on: "" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("kind", kind);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (file) fd.append("file", file);
      return uploadComplianceDoc(fd);
    },
    onSuccess: () => { setFile(null); setForm({ number: "", holder_name: "", amount_birr: "", issued_on: "", expires_on: "" }); setError(""); qc.invalidateQueries({ queryKey: ["org-compliance"] }); },
    onError: (e) => setError(apiError(e)),
  });
  if (!data) return null;

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <p style={AC.cardTitle}>ECTA exporter requirements</p>
        {data.profile.complete ? <Pill tone="green" icon={<ShieldCheck size={12} />}>Complete</Pill> : <Pill tone="yellow">Incomplete</Pill>}
      </div>
      <Muted style={{ marginBottom: "14px" }}>
        ECTA Directive 1106/2025 expects exporters to keep a certified quality laboratory, a certified taster and
        paid-up capital. Upload the evidence; the Beersheba team verifies it and reminds you before anything expires.
      </Muted>
      <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
        {data.profile.items.map((i) => (
          <div key={i.kind} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text }}>{KIND_LABEL[i.kind]}</span>
            <Pill tone={STATE_TONE[i.state]}>{STATE_LABEL[i.state]}</Pill>
          </div>
        ))}
      </div>

      {data.documents.length > 0 && (
        <div style={{ display: "grid", gap: "6px", marginBottom: "16px" }}>
          {data.documents.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", fontFamily: AT.font.sans, fontSize: "0.8rem" }}>
              <span style={{ color: AT.color.textSecondary }}>
                {d.kind_label}{d.holder_name ? ` · ${d.holder_name}` : ""}{d.expires_on ? ` · until ${formatDate(d.expires_on)}` : ""}
                {d.rejection_reason && <span style={{ color: AT.color.red }}> · {d.rejection_reason}</span>}
              </span>
              <span style={{ display: "flex", gap: "4px" }}>
                <button style={AC.btnSm} aria-label="Open document" onClick={() => openComplianceDoc(d.id)}><FileText size={12} /></button>
                {canEdit && !d.verified_at && (
                  <button style={AC.btnSm} aria-label="Delete document" onClick={async () => { await deleteComplianceDoc(d.id); qc.invalidateQueries({ queryKey: ["org-compliance"] }); }}><Trash2 size={12} /></button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          <ErrorNote>{error}</ErrorNote>
          <div style={grid(170)}>
            <Field label="Document">
              <select style={AC.input} value={kind} onChange={(e) => setKind(e.target.value)}>
                {data.kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </Field>
            <Field label="Certificate / reference no."><input style={AC.input} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
            {kind !== "capital_attestation" && (
              <Field label={kind === "taster_certificate" ? "Taster's name" : "Lab / issuer"}><input style={AC.input} value={form.holder_name} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} /></Field>
            )}
            {kind === "capital_attestation" && (
              <Field label="Capital (Birr)"><input style={AC.input} type="number" value={form.amount_birr} onChange={(e) => setForm({ ...form, amount_birr: e.target.value })} /></Field>
            )}
            <Field label="Issued"><input style={AC.input} type="date" value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} /></Field>
            <Field label="Expires"><input style={AC.input} type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <label style={{ ...AC.btnGhost, cursor: "pointer" }}>
              <FileUp size={13} /> {file ? file.name : "Choose PDF or photo"}
              <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <button style={AC.btnPrimary} disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
              <Check size={13} /> {upload.isPending ? "Uploading…" : "Upload for verification"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
