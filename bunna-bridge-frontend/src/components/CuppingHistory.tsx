import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCuppingScores, confirmCuppingScore } from "../api/cupping";
import { useAuth } from "../context/AuthContext";

const ATTRS = ["fragrance_aroma","flavor","aftertaste","acidity","body","balance","uniformity","clean_cup","sweetness","overall"];
const LABELS: Record<string, string> = {
  fragrance_aroma: "Fragrance", flavor: "Flavor", aftertaste: "Aftertaste",
  acidity: "Acidity", body: "Body", balance: "Balance",
  uniformity: "Uniformity", clean_cup: "Clean Cup", sweetness: "Sweetness", overall: "Overall",
};

export default function CuppingHistory({ lotId }: { lotId: string }) {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const { data: scores, isLoading } = useQuery({
    queryKey: ["cupping-scores", lotId],
    queryFn:  () => getCuppingScores(lotId),
  });

  const confirmMutation = useMutation({
    mutationFn: (scoreId: string) => confirmCuppingScore(lotId, scoreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cupping-scores", lotId] });
      queryClient.invalidateQueries({ queryKey: ["lot", lotId] });
    },
  });

  if (isLoading) return (
    <div>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.4)", margin: "0 0 12px" }}>Cupping History</p>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(28,28,26,0.3)" }}>Loading scores...</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.4)", margin: "0 0 14px" }}>
        Cupping History ({scores?.length ?? 0} record{scores?.length !== 1 ? "s" : ""})
      </p>

      {!scores || scores.length === 0 ? (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(28,28,26,0.3)", padding: "8px 0" }}>
          No cupping scores recorded yet.
        </p>
      ) : (
        scores.map(score => (
          <div key={score.id} style={{
            background: score.status === "confirmed" ? "#E8F2EC" : "#F7F5F0",
            border: `1px solid ${score.status === "confirmed" ? "rgba(27,77,53,0.2)" : "rgba(28,28,26,0.08)"}`,
            borderRadius: "6px", padding: "16px", marginBottom: "12px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#1C1C1A", margin: "0 0 3px" }}>
                  {score.grader_name || score.grader_email}
                </p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.4)", margin: 0 }}>
                  {score.cupping_date}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 300, color: "#7B4B2A", lineHeight: 1 }}>
                  {score.total_score}
                </div>
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: "20px",
                  fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: score.status === "confirmed" ? "#E8F2EC" : "#F5EDE4",
                  color:      score.status === "confirmed" ? "#1B4D35" : "#7B4B2A",
                  border:     score.status === "confirmed" ? "1px solid rgba(27,77,53,0.2)" : "1px solid rgba(123,75,42,0.2)",
                }}>
                  {score.status}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", margin: "8px 0" }}>
              {ATTRS.map(a => (
                <div key={a} style={{ background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.07)", borderRadius: "3px", padding: "5px 6px", textAlign: "center" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(28,28,26,0.35)", display: "block", marginBottom: "2px" }}>
                    {LABELS[a]}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#7B4B2A" }}>
                    {parseFloat(score[a as keyof typeof score] as string).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {score.flavor_notes && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                {score.flavor_notes.split(",").map((f: string) => f.trim()).filter(Boolean).map((f: string) => (
                  <span key={f} style={{ padding: "2px 8px", background: "#F5EDE4", border: "1px solid rgba(123,75,42,0.15)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#7B4B2A" }}>
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
                style={{
                  background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.25)",
                  borderRadius: "4px", padding: "8px 16px",
                  fontFamily: "DM Mono, monospace", fontSize: "0.6rem",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "#1B4D35", cursor: "pointer", marginTop: "10px",
                }}
              >
                {confirmMutation.isPending ? "Confirming..." : "✓ Confirm & Lock Score"}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
