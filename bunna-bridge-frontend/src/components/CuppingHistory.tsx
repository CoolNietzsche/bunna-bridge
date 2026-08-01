import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCuppingScores, confirmCuppingScore } from "../api/cupping";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const ATTRS = ["fragrance_aroma", "flavor", "aftertaste", "acidity", "body", "balance", "uniformity", "clean_cup", "sweetness", "overall"];
const LABELS: Record<string, string> = {
  fragrance_aroma: "Fragrance", flavor: "Flavor", aftertaste: "Aftertaste",
  acidity: "Acidity", body: "Body", balance: "Balance",
  uniformity: "Uniformity", clean_cup: "Clean Cup", sweetness: "Sweetness", overall: "Overall",
};

export default function CuppingHistory({ lotId }: { lotId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: scores, isLoading } = useQuery({
    queryKey: ["cupping-scores", lotId],
    queryFn: () => getCuppingScores(lotId),
  });

  const confirmMutation = useMutation({
    mutationFn: (scoreId: string) => confirmCuppingScore(lotId, scoreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cupping-scores", lotId] });
      queryClient.invalidateQueries({ queryKey: ["lot", lotId] });
    },
  });

  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "14px" };

  if (isLoading) {
    return (
      <div>
        <p style={cardTitle}>Cupping History</p>
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textMuted }}>Loading scores…</p>
      </div>
    );
  }

  return (
    <div>
      <p style={cardTitle}>
        Cupping History ({scores?.length ?? 0} record{scores?.length !== 1 ? "s" : ""})
      </p>

      {!scores || scores.length === 0 ? (
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textMuted, padding: "8px 0" }}>
          No cupping scores recorded yet.
        </p>
      ) : (
        scores.map((score) => (
          <div key={score.id} style={{
            background: score.status === "confirmed" ? AT.color.primaryLight : AT.color.surfaceSecondary,
            border: `1px solid ${score.status === "confirmed" ? AT.color.primary + "33" : AT.color.border}`,
            borderRadius: AT.radius.md, padding: "16px", marginBottom: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text, margin: "0 0 3px" }}>
                  {score.grader_name || score.grader_email}
                </p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textDisabled, margin: 0 }}>
                  {score.cupping_date}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: AT.font.sans, fontSize: "1.5rem", fontWeight: 700, color: AT.color.primaryDark, lineHeight: 1 }}>
                  {score.total_score}
                </div>
                <span style={{ ...AC.pill.base, ...(score.status === "confirmed" ? AC.pill.green : AC.pill.yellow), marginTop: "2px" }}>
                  {score.status}
                </span>
              </div>
            </div>

            <div className="ch-attrs" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", margin: "8px 0" }}>
              {ATTRS.map((a) => (
                <div key={a} style={{ background: AT.color.surface, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.sm, padding: "5px 6px", textAlign: "center" }}>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "0.58rem", color: AT.color.textDisabled, display: "block", marginBottom: "2px" }}>
                    {LABELS[a]}
                  </span>
                  <span style={{ fontFamily: AT.font.mono, fontSize: "0.78rem", color: AT.color.primaryDark }}>
                    {parseFloat(score[a as keyof typeof score] as string).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {score.flavor_notes && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                {score.flavor_notes.split(",").map((f: string) => f.trim()).filter(Boolean).map((f: string) => (
                  <span key={f} style={{ padding: "2px 8px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.pill, fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textSecondary }}>
                    {f}
                  </span>
                ))}
              </div>
            )}

            {score.status === "pending" &&
              (user?.role === "admin" || user?.email === score.grader_email) && (
              <button
                onClick={() => confirmMutation.mutate(score.id)}
                disabled={confirmMutation.isPending}
                style={{ ...AC.btnSm, background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}44`, color: AT.color.primaryDark, marginTop: "10px" }}
              >
                {confirmMutation.isPending ? "Confirming…" : "Confirm & Lock Score"}
              </button>
            )}
          </div>
        ))
      )}

      <style>{`@media (max-width: 480px){ .ch-attrs { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
    </div>
  );
}
