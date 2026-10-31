import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Clock, FileText, ShieldOff, AlertTriangle } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import { getLicenseReviews, decideLicense } from "../api/licenses";
import type { LicenseReview } from "../api/licenses";
import { viewExporterEctaLicense } from "../api/docs";
import { apiErrorText } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

function expiryState(expiry: string | null) {
  if (!expiry) return { label: "No expiry date", tone: AT.color.red };
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: `Expired ${new Date(expiry).toLocaleDateString()}`, tone: AT.color.red };
  if (days <= 30) return { label: `Expires in ${days} days`, tone: AT.color.yellow };
  return { label: `Valid until ${new Date(expiry).toLocaleDateString()}`, tone: AT.color.textSecondary };
}

function Row({ item }: { item: LicenseReview }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (approve: boolean) => decideLicense(item.id, approve),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["license-reviews"] }),
  });
  const verified = !!item.ecta_license_verified_at;
  const exp = expiryState(item.ecta_license_expiry);

  return (
    <div style={{ ...AC.card, padding: "18px 20px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", borderColor: verified ? AT.color.border : `${AT.color.yellow}66` }}>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", fontWeight: 600, color: AT.color.text, margin: 0 }}>{item.company_name || item.full_name}</p>
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, margin: "2px 0 0" }}>
          {item.full_name} · {item.email} · {item.role} · {item.lots_count} lot{item.lots_count === 1 ? "" : "s"}
        </p>
      </div>
      <div style={{ flex: "0 1 220px" }}>
        <p style={{ fontFamily: AT.font.mono, fontSize: "0.78rem", color: AT.color.text, margin: 0 }}>{item.ecta_license_number || "No number"}</p>
        <p style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: AT.font.sans, fontSize: "0.74rem", color: exp.tone, margin: "2px 0 0" }}>
          {exp.tone !== AT.color.textSecondary && <AlertTriangle size={12} />} {exp.label}
        </p>
      </div>
      <span style={{ ...AC.pill.base, ...(verified ? AC.pill.green : AC.pill.yellow) }}>
        {verified ? <BadgeCheck size={11} /> : <Clock size={11} />} {verified ? "VERIFIED" : "AWAITING REVIEW"}
      </span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={() => viewExporterEctaLicense(item.id)} style={AC.btnGhost}><FileText size={13} /> View license</button>
        {verified ? (
          <button onClick={() => mutation.mutate(false)} disabled={mutation.isPending} style={{ ...AC.btnGhost, color: AT.color.red }}>
            <ShieldOff size={13} /> Revoke
          </button>
        ) : (
          <>
            <button onClick={() => mutation.mutate(false)} disabled={mutation.isPending} style={AC.btnGhost}>Request new copy</button>
            <button onClick={() => mutation.mutate(true)} disabled={mutation.isPending} style={AC.btnPrimary}>
              <BadgeCheck size={13} /> Verify
            </button>
          </>
        )}
      </div>
      {mutation.isError && (
        <p role="alert" style={{ flexBasis: "100%", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.red, margin: 0 }}>
          {apiErrorText(mutation.error, "Could not update the license.")}
        </p>
      )}
    </div>
  );
}

export default function LicenseReviews() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["license-reviews"],
    queryFn: getLicenseReviews,
    enabled: user?.role === "admin",
  });
  const pending = data?.filter((d) => !d.ecta_license_verified_at).length ?? 0;

  return (
    <AdminShell>
      <div style={{ marginBottom: "22px" }}>
        <p style={AC.eyebrow}>Platform</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>ECTA license reviews</h1>
        <p style={AC.pageSubtitle}>
          An exporter's lots only pass the ECTA license gate after you have checked the uploaded license here.
          {data && ` ${pending} awaiting review.`}
        </p>
      </div>
      {user?.role !== "admin" ? (
        <p style={{ fontFamily: AT.font.sans, color: AT.color.textMuted }}>Only platform administrators can review licenses.</p>
      ) : isLoading ? (
        <p style={{ fontFamily: AT.font.sans, color: AT.color.textMuted }}>Loading…</p>
      ) : isError ? (
        <p style={{ fontFamily: AT.font.sans, color: AT.color.red }}>Could not load licenses.</p>
      ) : data && data.length === 0 ? (
        <div style={{ ...AC.card, ...AC.cardPad, textAlign: "center", color: AT.color.textMuted, fontFamily: AT.font.sans }}>No licenses uploaded yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {data?.map((item) => <Row key={item.id} item={item} />)}
        </div>
      )}
    </AdminShell>
  );
}
