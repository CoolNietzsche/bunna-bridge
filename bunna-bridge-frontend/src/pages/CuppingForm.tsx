import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLot } from "../api/lots";
import { submitCuppingScore, confirmCuppingScore } from "../api/cupping";
import PageWrapper from "../components/PageWrapper";

const ATTRIBUTES = [
  { key: "fragrance_aroma", label: "Fragrance / Aroma",  desc: "Dry fragrance + wet aroma" },
  { key: "flavor",          label: "Flavor",              desc: "Overall taste impression"  },
  { key: "aftertaste",      label: "Aftertaste",          desc: "Residual taste length"     },
  { key: "acidity",         label: "Acidity",             desc: "Brightness and intensity"  },
  { key: "body",            label: "Body",                desc: "Tactile mouthfeel"         },
  { key: "balance",         label: "Balance",             desc: "Harmony of all attributes" },
  { key: "uniformity",      label: "Uniformity",          desc: "Consistency across cups"   },
  { key: "clean_cup",       label: "Clean Cup",           desc: "Absence of defects"        },
  { key: "sweetness",       label: "Sweetness",           desc: "Perceived sweetness"       },
  { key: "overall",         label: "Overall",             desc: "Holistic impression"       },
];

const EMPTY_SCORES = Object.fromEntries(ATTRIBUTES.map(a => [a.key, "8.00"]));

export default function CuppingForm() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [scores, setScores]       = useState<Record<string, string>>(EMPTY_SCORES);
  const [defects, setDefects]     = useState("0");
  const [flavorNotes, setFlavor]  = useState("");
  const [notes, setNotes]         = useState("");
  const [cuppingDate, setDate]    = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation]   = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError]         = useState("");

  const { data: lot } = useQuery({
    queryKey: ["lot", id],
    queryFn:  () => getLot(id!),
    enabled:  !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      submitCuppingScore(id!, data as never),
    onSuccess: (data) => {
      setSubmitted(data.id);
      setError("");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: Record<string, string[]> } };
      if (e.response?.data) {
        const msgs = Object.entries(e.response.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        setError(msgs);
      } else {
        setError("Failed to submit score. Check all values are between 6 and 10.");
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmCuppingScore(id!, submitted!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lot", id] });
      navigate(`/lots/${id}`);
    },
    onError: () => setError("Failed to confirm score."),
  });

  const totalScore = () => {
    const sum = ATTRIBUTES.reduce((acc, a) => acc + parseFloat(scores[a.key] || "0"), 0);
    return Math.max(0, sum - parseFloat(defects || "0")).toFixed(2);
  };

  const setScore = (key: string, val: string) =>
    setScores(s => ({ ...s, [key]: val }));

  const handleSubmit = () => {
    setError("");
    submitMutation.mutate({
      ...scores,
      defects,
      flavor_notes:     flavorNotes,
      notes,
      cupping_date:     cuppingDate,
      cupping_location: location,
    });
  };

  const s = {
    page:      { padding: "2rem 2.5rem", maxWidth: "900px" },
    back:      { background: "none", border: "none", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(28,28,26,0.4)", cursor: "pointer", marginBottom: "1.5rem", padding: 0 },
    title:     { fontSize: "1.8rem", fontWeight: 300, color: "#1C1C1A", margin: "0 0 0.25rem" },
    sub:       { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#1B4D35", textTransform: "uppercase" as const, marginBottom: "2rem" },
    card:      { background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.05)", borderRadius: "4px", padding: "1.5rem", marginBottom: "1.5rem" },
    cardTitle: { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#1B4D35", margin: "0 0 1.2rem" },
    grid:      { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "1rem" },
    attr:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid rgba(28,28,26,0.04)" },
    attrLeft:  { flex: 1 },
    attrLabel: { fontSize: "0.9rem", color: "#1C1C1A", marginBottom: "0.15rem" },
    attrDesc:  { fontFamily: "monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.3)" },
    attrRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
    slider:    { width: "140px", accentColor: "#1B4D35", cursor: "pointer" },
    scoreVal:  (val: number) => ({
      fontFamily: "monospace", fontSize: "1rem", fontWeight: 500, minWidth: "3rem", textAlign: "right" as const,
      color: val >= 9 ? "#A8D5BC" : val >= 8 ? "#8B5E3C" : val >= 7 ? "#1B4D35" : "#1B4D35",
    }),
    total:     { background: "rgba(201,149,42,0.08)", border: "1px solid rgba(28,28,26,0.1)", borderRadius: "3px", padding: "1.2rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
    totalLbl:  { fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "rgba(28,28,26,0.4)" },
    totalNum:  { fontFamily: "serif", fontSize: "3rem", fontWeight: 300, color: "#8B5E3C", lineHeight: 1 },
    totalSub:  { fontFamily: "monospace", fontSize: "0.62rem", color: "rgba(28,28,26,0.3)", marginTop: "0.25rem" },
    label:     { display: "block", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(28,28,26,0.4)", marginBottom: "0.4rem" },
    input:     { width: "100%", background: "#F7F5F0", border: "1px solid rgba(28,28,26,0.1)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "#1C1C1A", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" as const },
    textarea:  { width: "100%", background: "#F7F5F0", border: "1px solid rgba(28,28,26,0.1)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "#1C1C1A", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" as const, resize: "vertical" as const, minHeight: "80px" },
    btn:       { background: "#1B4D35", border: "none", borderRadius: "2px", padding: "0.875rem 2.5rem", color: "white", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer" },
    btnGreen:  { background: "#1B4D35", border: "1px solid rgba(74,124,89,0.5)", borderRadius: "2px", padding: "0.875rem 2.5rem", color: "#A8D5BC", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer" },
    err:       { background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: "2px", padding: "0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#1B4D35", marginBottom: "1rem" },
    success:   { background: "rgba(74,124,89,0.15)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "4px", padding: "1.5rem", marginBottom: "1.5rem" },
  };

  const score = parseFloat(totalScore());

  return (
    <PageWrapper>
      <div style={s.page}>
        <button style={s.back} onClick={() => navigate(`/lots/${id}`)}>
          ← Back to Lot
        </button>

        <h1 style={s.title}>SCA Cupping Score</h1>
        <p style={s.sub}>
          {lot ? `${lot.lot_id} · ${lot.name}` : "Loading lot..."}
        </p>

        {/* Submitted confirmation */}
        {submitted && (
          <div style={s.success}>
            <p style={{ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.15em", color: "#A8D5BC", textTransform: "uppercase", margin: "0 0 0.5rem" }}>
              ✓ Score Submitted — Pending Confirmation
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#1C1C1A", margin: "0 0 1rem" }}>
              Total Score: <strong>{totalScore()} pts</strong>
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(28,28,26,0.5)", margin: "0 0 1rem" }}>
              Review your score below, then confirm to lock it permanently and update the lot quality record.
              Confirmed scores cannot be edited.
            </p>
            <button style={s.btnGreen}
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}>
              {confirmMutation.isPending ? "Confirming..." : "✓ Confirm & Lock Score"}
            </button>
          </div>
        )}

        {!submitted && (
          <>
            {/* Live total */}
            <div style={s.total}>
              <div>
                <p style={s.totalLbl}>Live Total Score</p>
                <p style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.25)", margin: "0.25rem 0 0" }}>
                  {score >= 90 ? "Outstanding" :
                   score >= 85 ? "Excellent" :
                   score >= 80 ? "Specialty" :
                   score >= 75 ? "Very Good" : "Below Specialty"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={s.totalNum}>{totalScore()}</span>
                <p style={s.totalSub}>/ 100 SCA</p>
              </div>
            </div>

            {/* SCA attribute sliders */}
            <div style={s.card}>
              <p style={s.cardTitle}>SCA Protocol Attributes</p>
              {ATTRIBUTES.map(attr => (
                <div key={attr.key} style={s.attr}>
                  <div style={s.attrLeft}>
                    <p style={{ ...s.attrLabel, margin: 0 }}>{attr.label}</p>
                    <p style={{ ...s.attrDesc, margin: 0 }}>{attr.desc}</p>
                  </div>
                  <div style={s.attrRight}>
                    <input
                      type="range"
                      min="6" max="10" step="0.25"
                      value={scores[attr.key]}
                      onChange={e => setScore(attr.key, e.target.value)}
                      style={s.slider}
                    />
                    <span style={s.scoreVal(parseFloat(scores[attr.key]))}>
                      {parseFloat(scores[attr.key]).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Defects */}
              <div style={{ ...s.attr, borderBottom: "none" }}>
                <div style={s.attrLeft}>
                  <p style={{ ...s.attrLabel, margin: 0, color: "#1B4D35" }}>Defects (penalty)</p>
                  <p style={{ ...s.attrDesc, margin: 0 }}>Subtract from total</p>
                </div>
                <div style={s.attrRight}>
                  <input
                    type="range"
                    min="0" max="8" step="2"
                    value={defects}
                    onChange={e => setDefects(e.target.value)}
                    style={{ ...s.slider, accentColor: "#1B4D35" }}
                  />
                  <span style={{ ...s.scoreVal(0), color: "#1B4D35" }}>
                    -{parseFloat(defects).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={s.card}>
              <p style={s.cardTitle}>Cupping Details</p>
              <div style={s.grid}>
                <div>
                  <label style={s.label}>Cupping Date *</label>
                  <input style={s.input} type="date"
                    value={cuppingDate}
                    onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Cupping Location</label>
                  <input style={s.input} type="text"
                    placeholder="e.g. SCA Ethiopia Lab, Addis Ababa"
                    value={location}
                    onChange={e => setLocation(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <label style={s.label}>Flavor Notes (comma separated)</label>
                <input style={s.input} type="text"
                  placeholder="e.g. Jasmine, Bergamot, Lemon Zest, Stone Fruit"
                  value={flavorNotes}
                  onChange={e => setFlavor(e.target.value)} />
                {flavorNotes && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
                    {flavorNotes.split(",").map(f => f.trim()).filter(Boolean).map(f => (
                      <span key={f} style={{ padding: "0.2rem 0.6rem", background: "rgba(201,149,42,0.1)", border: "1px solid rgba(28,28,26,0.1)", borderRadius: "2px", fontFamily: "monospace", fontSize: "0.58rem", color: "#8B5E3C" }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginTop: "1rem" }}>
                <label style={s.label}>Private Notes (not shown to buyers)</label>
                <textarea style={s.textarea}
                  placeholder="Internal grading notes, sample preparation details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)} />
              </div>
            </div>

            {error && <div style={s.err}>{error}</div>}

            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <button style={s.btn}
                onClick={handleSubmit}
                disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Score →"}
              </button>
              <span style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.25)" }}>
                You will confirm before the score is locked
              </span>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
