import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCuppingScores, confirmCuppingScore } from "../api/cupping";
import { useAuth } from "../context/AuthContext";

const ATTRS = [
  "fragrance_aroma","flavor","aftertaste","acidity",
  "body","balance","uniformity","clean_cup","sweetness","overall"
];
const LABELS: Record<string, string> = {
  fragrance_aroma: "Fragrance/Aroma", flavor: "Flavor",
  aftertaste: "Aftertaste", acidity: "Acidity", body: "Body",
  balance: "Balance", uniformity: "Uniformity", clean_cup: "Clean Cup",
  sweetness: "Sweetness", overall: "Overall",
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

  const s = {
    wrap:      { marginTop: "1.5rem" },
    title:     { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#D4824A", margin: "0 0 1rem" },
    empty:     { fontFamily: "monospace", fontSize: "0.7rem", color: "rgba(245,237,216,0.25)", padding: "1rem 0" },
    scoreCard: (status: string) => ({
      background: status === "confirmed" ? "rgba(30,58,47,0.4)" : "rgba(245,237,216,0.03)",
      border: `1px solid ${status === "confirmed" ? "rgba(74,124,89,0.3)" : "rgba(245,237,216,0.08)"}`,
      borderRadius: "3px", padding: "1.2rem", marginBottom: "1rem",
    }),
    hdr:       { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
    grader:    { fontFamily: "monospace", fontSize: "0.65rem", color: "#F5EDD8" },
    date:      { fontFamily: "monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)" },
    total:     { fontFamily: "serif", fontSize: "2rem", fontWeight: 300, color: "#C9952A" },
    status:    (s: string) => ({
      display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "2px",
      fontFamily: "monospace", fontSize: "0.55rem", letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      background: s === "confirmed" ? "rgba(74,124,89,0.2)" : "rgba(201,149,42,0.15)",
      color:      s === "confirmed" ? "#A8C5A0" : "#C9952A",
      border:     s === "confirmed" ? "1px solid rgba(74,124,89,0.3)" : "1px solid rgba(201,149,42,0.25)",
    }),
    grid:      { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", margin: "0.75rem 0" },
    attrBox:   { background: "rgba(245,237,216,0.04)", borderRadius: "2px", padding: "0.4rem 0.5rem", textAlign: "center" as const },
    attrLbl:   { fontFamily: "monospace", fontSize: "0.5rem", color: "rgba(245,237,216,0.3)", display: "block", marginBottom: "0.15rem" },
    attrVal:   { fontFamily: "monospace", fontSize: "0.75rem", color: "#C9952A" },
    flavors:   { display: "flex", flexWrap: "wrap" as const, gap: "0.3rem", marginTop: "0.5rem" },
    flavor:    { padding: "0.15rem 0.5rem", background: "rgba(201,149,42,0.1)", border: "1px solid rgba(201,149,42,0.15)", borderRadius: "2px", fontFamily: "monospace", fontSize: "0.55rem", color: "#C9952A" },
    confirmBtn:{ background: "#1E3A2F", border: "1px solid rgba(74,124,89,0.4)", borderRadius: "2px", padding: "0.45rem 1rem", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "#A8C5A0", cursor: "pointer", marginTop: "0.75rem" },
  };

  if (isLoading) return (
    <div style={s.wrap}>
      <p style={s.title}>Cupping History</p>
      <p style={s.empty}>Loading scores...</p>
    </div>
  );

  return (
    <div style={s.wrap}>
      <p style={s.title}>Cupping History ({scores?.length ?? 0} record{scores?.length !== 1 ? "s" : ""})</p>

      {!scores || scores.length === 0 ? (
        <p style={s.empty}>No cupping scores recorded yet.</p>
      ) : (
        scores.map(score => (
          <div key={score.id} style={s.scoreCard(score.status)}>
            <div style={s.hdr}>
              <div>
                <p style={{ ...s.grader, margin: "0 0 0.2rem" }}>
                  {score.grader_name || score.grader_email}
                </p>
                <p style={{ ...s.date, margin: 0 }}>{score.cupping_date}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={s.total}>{score.total_score}</div>
                <span style={s.status(score.status)}>{score.status}</span>
              </div>
            </div>

            <div style={s.grid}>
              {ATTRS.map(a => (
                <div key={a} style={s.attrBox}>
                  <span style={s.attrLbl}>{LABELS[a]}</span>
                  <span style={s.attrVal}>{parseFloat(score[a as keyof typeof score] as string).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {score.flavor_notes && (
              <div style={s.flavors}>
                {score.flavor_notes.split(",").map(f => f.trim()).filter(Boolean).map(f => (
                  <span key={f} style={s.flavor}>{f}</span>
                ))}
              </div>
            )}

            {/* Confirm button — only for the grader or admin, pending scores */}
            {score.status === "pending" &&
             (user?.role === "admin" || user?.email === score.grader_email) && (
              <button style={s.confirmBtn}
                onClick={() => confirmMutation.mutate(score.id)}
                disabled={confirmMutation.isPending}>
                {confirmMutation.isPending ? "Confirming..." : "✓ Confirm & Lock Score"}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
