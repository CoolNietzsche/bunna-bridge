import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, X } from "lucide-react";
import { Muted } from "./ui";
import { formatDate } from "./styles";
import { decideComplianceReview, getComplianceReviews, openComplianceDoc } from "../../api/team";
import { apiError } from "../../api/traceability";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** Admin queue for ECTA Directive 1106/2025 documents (lab, taster, capital). */
export default function ComplianceReviews() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["compliance-reviews"], queryFn: getComplianceReviews });
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const decide = async (id: string, decision: "verify" | "reject") => {
    setError("");
    try { await decideComplianceReview(id, decision, reasons[id] ?? ""); qc.invalidateQueries({ queryKey: ["compliance-reviews"] }); }
    catch (e) { setError(apiError(e)); }
  };
  return (
    <section style={{ marginTop: "28px" }}>
      <h2 style={{ ...AC.cardTitle, fontSize: "1.1rem", marginBottom: "4px" }}>Exporter requirement documents</h2>
      <Muted style={{ marginBottom: "12px" }}>Certified lab, certified taster and capital attestations (ECTA Directive 1106/2025). {data.length} awaiting review.</Muted>
      {error && <p style={{ ...AC.status.base, ...AC.status.red }}>{error}</p>}
      {data.length === 0 ? <div style={{ ...AC.card, ...AC.cardPad }}><Muted>Nothing to review.</Muted></div> : (
        <div style={{ display: "grid", gap: "10px" }}>
          {data.map((d) => (
            <div key={d.id} style={{ ...AC.card, ...AC.cardPad, display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p style={{ fontFamily: AT.font.sans, fontWeight: 600, margin: 0, color: AT.color.text }}>{d.organization_name} — {d.kind_label}</p>
                <Muted>
                  {[d.number, d.holder_name, d.amount_birr ? `${Number(d.amount_birr).toLocaleString()} Birr` : "", d.expires_on ? `expires ${formatDate(d.expires_on)}` : ""].filter(Boolean).join(" · ")}
                  {" "}· uploaded {formatDate(d.uploaded_at)} by {d.uploaded_by_email}
                </Muted>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                <button style={AC.btnSm} onClick={() => openComplianceDoc(d.id)}><FileText size={12} /> Open</button>
                <input style={{ ...AC.input, width: "180px" }} placeholder="Reason if rejecting" aria-label="Rejection reason" value={reasons[d.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [d.id]: e.target.value })} />
                <button style={AC.btnGhost} onClick={() => decide(d.id, "reject")}><X size={13} /> Reject</button>
                <button style={AC.btnPrimary} onClick={() => decide(d.id, "verify")}><Check size={13} /> Verify</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
