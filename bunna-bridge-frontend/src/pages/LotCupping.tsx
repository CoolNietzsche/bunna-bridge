import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import AdminShell from "../components/admin/AdminShell";
import CvaForm from "../components/quality/CvaForm";
import { Muted, Pill } from "../components/trace/ui";
import { formatDate } from "../components/trace/styles";
import { getLot } from "../api/lots";
import { confirmCva, createLotCva, getLotCva } from "../api/quality";
import type { Cva } from "../api/quality";
import { apiError } from "../api/traceability";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

/** Cup a lot with the SCA Coffee Value Assessment (CVA, 2024). The 2004 form stays available. */
export default function LotCupping() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: lot } = useQuery({ queryKey: ["lot", id], queryFn: () => getLot(id) });
  const { data } = useQuery({ queryKey: ["lot-cva", id], queryFn: () => getLotCva(id) });
  const [saved, setSaved] = useState<Cva | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isGrader = user?.role === "qgrader" || user?.role === "admin";

  return (
    <AdminShell>
      <button onClick={() => navigate(`/lots/${id}`)} style={{ ...AC.btnGhost, marginBottom: 14 }}><ArrowLeft size={14} /> Back to lot</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <p style={AC.eyebrow}>SCA Coffee Value Assessment (CVA)</p>
          <h1 style={{ ...AC.pageTitle, marginTop: 4 }}>Cup this lot</h1>
          <p style={AC.pageSubtitle}>{lot ? `${lot.lot_id} · ${lot.name}` : "Loading…"}</p>
        </div>
        <Link to={`/lots/${id}/cup/classic`} style={{ ...AC.btnGhost, textDecoration: "none" }}>Use the 2004 cupping form</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }} className="cup-grid">
        <div style={{ ...AC.card, ...AC.cardPad }}>
          {saved ? (
            <div>
              <p style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: AT.font.sans, fontWeight: 600, color: AT.color.primaryDark, margin: "0 0 8px" }}><CheckCircle2 size={16} /> Saved — {saved.score} points ({saved.band})</p>
              {isGrader ? (
                <>
                  <Muted style={{ marginBottom: 12 }}>Confirming locks the assessment and makes it the score buyers see on this lot.</Muted>
                  <button style={AC.btnPrimary} disabled={busy} onClick={async () => {
                    setBusy(true); setError("");
                    try { await confirmCva(saved.id); qc.invalidateQueries({ queryKey: ["lot", id] }); navigate(`/lots/${id}`); }
                    catch (e) { setError(apiError(e)); } finally { setBusy(false); }
                  }}><Lock size={14} /> Confirm and publish score</button>
                </>
              ) : <Muted>Saved as an internal lab assessment. A licensed Q-grader confirms the score buyers see.</Muted>}
              {error && <p style={{ ...AC.status.base, ...AC.status.red, marginTop: 8 }}>{error}</p>}
            </div>
          ) : (
            <CvaForm busy={busy} error={error} onSubmit={async (v) => {
              setBusy(true); setError("");
              try { setSaved(await createLotCva(id, v)); qc.invalidateQueries({ queryKey: ["lot-cva", id] }); }
              catch (e) { setError(apiError(e)); } finally { setBusy(false); }
            }} />
          )}
        </div>
        <div style={{ ...AC.card, ...AC.cardPad }}>
          <p style={{ ...AC.cardTitle, marginBottom: 8 }}>Previous assessments</p>
          {data?.latest && <Muted style={{ marginBottom: 10 }}>Score buyers see: <b>{data.latest.score}</b> · {data.latest.method} · {data.latest.grader}</Muted>}
          {(data?.assessments ?? []).length === 0 && <Muted>None yet.</Muted>}
          {(data?.assessments ?? []).map((a) => (
            <div key={a.id} style={{ padding: "8px 0", borderTop: `1px solid ${AT.color.borderLight}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: AT.font.sans, fontSize: "0.85rem" }}>
                <span><b>{a.score}</b> · {a.grader_name} · {formatDate(a.assessed_on)}</span>
                <Pill tone={a.status === "confirmed" ? "green" : "muted"}>{a.status === "confirmed" ? "Confirmed" : "Lab only"}</Pill>
              </div>
              {a.descriptors && <Muted>{a.descriptors}</Muted>}
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 980px){ .cup-grid { grid-template-columns: 1fr !important; } }`}</style>
    </AdminShell>
  );
}
