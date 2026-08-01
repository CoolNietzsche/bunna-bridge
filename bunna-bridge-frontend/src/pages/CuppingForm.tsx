import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLot } from "../api/lots";
import { submitCuppingScore, confirmCuppingScore } from "../api/cupping";
import AdminShell from "../components/admin/AdminShell";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const ATTRIBUTES = [
  { key: "fragrance_aroma", label: "Fragrance / Aroma", desc: "Dry fragrance + wet aroma" },
  { key: "flavor", label: "Flavor", desc: "Overall taste impression" },
  { key: "aftertaste", label: "Aftertaste", desc: "Residual taste length" },
  { key: "acidity", label: "Acidity", desc: "Brightness and intensity" },
  { key: "body", label: "Body", desc: "Tactile mouthfeel" },
  { key: "balance", label: "Balance", desc: "Harmony of all attributes" },
  { key: "uniformity", label: "Uniformity", desc: "Consistency across cups" },
  { key: "clean_cup", label: "Clean Cup", desc: "Absence of defects" },
  { key: "sweetness", label: "Sweetness", desc: "Perceived sweetness" },
  { key: "overall", label: "Overall", desc: "Holistic impression" },
];

const EMPTY_SCORES = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, "8.00"]));

export default function CuppingForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [scores, setScores] = useState<Record<string, string>>(EMPTY_SCORES);
  const [defects, setDefects] = useState("0");
  const [flavorNotes, setFlavor] = useState("");
  const [notes, setNotes] = useState("");
  const [cuppingDate, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: lot } = useQuery({
    queryKey: ["lot", id],
    queryFn: () => getLot(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: Record<string, string>) => submitCuppingScore(id!, data as never),
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

  const setScore = (key: string, val: string) => setScores((s) => ({ ...s, [key]: val }));

  const handleSubmit = () => {
    setError("");
    submitMutation.mutate({
      ...scores,
      defects,
      flavor_notes: flavorNotes,
      notes,
      cupping_date: cuppingDate,
      cupping_location: location,
    });
  };

  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "18px" };
  const attrRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "12px 0", borderBottom: `1px solid ${AT.color.borderLight}`, flexWrap: "wrap" };
  const label: React.CSSProperties = { display: "block", fontFamily: AT.font.sans, fontSize: "0.66rem", letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.textDisabled, marginBottom: "6px" };
  const scoreColor = (val: number) => (val >= 9 ? AT.color.primaryDark : val >= 8 ? AT.color.blue : AT.color.textSecondary);

  const score = parseFloat(totalScore());

  return (
    <AdminShell>
      <button
        onClick={() => navigate(`/lots/${id}`)}
        style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted, cursor: "pointer", padding: 0, marginBottom: "16px" }}
      >
        <ArrowLeft size={14} /> Back to Lot
      </button>

      <div style={{ marginBottom: "20px" }}>
        <p style={AC.eyebrow}>SCA Protocol</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Cupping Score</h1>
        <p style={AC.pageSubtitle}>{lot ? `${lot.lot_id} · ${lot.name}` : "Loading lot…"}</p>
      </div>

      {submitted && (
        <div style={{ ...AC.card, ...AC.cardPad, borderColor: `${AT.color.primary}44`, marginBottom: "20px" }}>
          <p style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 600, color: AT.color.primaryDark, margin: "0 0 10px" }}>
            <CheckCircle2 size={15} /> Score Submitted — Pending Confirmation
          </p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.9rem", color: AT.color.text, margin: "0 0 12px" }}>
            Total Score: <strong>{totalScore()} pts</strong>
          </p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textMuted, margin: "0 0 16px", lineHeight: 1.5 }}>
            Review your score below, then confirm to lock it permanently and update the lot quality record.
            Confirmed scores cannot be edited.
          </p>
          <button style={AC.btnPrimary} onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
            <CheckCircle2 size={14} /> {confirmMutation.isPending ? "Confirming…" : "Confirm & Lock Score"}
          </button>
        </div>
      )}

      {!submitted && (
        <>
          <div style={{ ...AC.card, ...AC.cardPad, background: AT.color.primaryLight, borderColor: `${AT.color.primary}33`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: AT.color.primaryDark, margin: 0 }}>Live Total Score</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.primaryDark, opacity: 0.75, margin: "4px 0 0" }}>
                {score >= 90 ? "Outstanding" : score >= 85 ? "Excellent" : score >= 80 ? "Specialty" : score >= 75 ? "Very Good" : "Below Specialty"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontFamily: AT.font.sans, fontSize: "2.5rem", fontWeight: 700, color: AT.color.primaryDark, lineHeight: 1 }}>{totalScore()}</span>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.7rem", color: AT.color.primaryDark, opacity: 0.7, margin: "2px 0 0" }}>/ 100 SCA</p>
            </div>
          </div>

          <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "16px" }}>
            <p style={cardTitle}>SCA Protocol Attributes</p>
            {ATTRIBUTES.map((attr) => (
              <div key={attr.key} style={attrRow}>
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.text, margin: "0 0 2px" }}>{attr.label}</p>
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textDisabled, margin: 0 }}>{attr.desc}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="range" min="6" max="10" step="0.25"
                    value={scores[attr.key]}
                    onChange={(e) => setScore(attr.key, e.target.value)}
                    style={{ width: "140px", accentColor: AT.color.primary, cursor: "pointer" }}
                  />
                  <span style={{ fontFamily: AT.font.mono, fontSize: "1rem", fontWeight: 600, minWidth: "3rem", textAlign: "right", color: scoreColor(parseFloat(scores[attr.key])) }}>
                    {parseFloat(scores[attr.key]).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            <div style={{ ...attrRow, borderBottom: "none" }}>
              <div style={{ flex: 1, minWidth: "160px" }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.red, margin: "0 0 2px" }}>Defects (penalty)</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textDisabled, margin: 0 }}>Subtract from total</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="range" min="0" max="8" step="2"
                  value={defects}
                  onChange={(e) => setDefects(e.target.value)}
                  style={{ width: "140px", accentColor: AT.color.red, cursor: "pointer" }}
                />
                <span style={{ fontFamily: AT.font.mono, fontSize: "1rem", fontWeight: 600, minWidth: "3rem", textAlign: "right", color: AT.color.red }}>
                  -{parseFloat(defects).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ ...AC.card, ...AC.cardPad, marginBottom: "16px" }}>
            <p style={cardTitle}>Cupping Details</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px" }}>
              <div>
                <label style={label}>Cupping Date *</label>
                <input style={AC.input} type="date" value={cuppingDate} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label style={label}>Cupping Location</label>
                <input style={AC.input} type="text" placeholder="e.g. SCA Ethiopia Lab, Addis Ababa" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <label style={label}>Flavor Notes (comma separated)</label>
              <input style={AC.input} type="text" placeholder="e.g. Jasmine, Bergamot, Lemon Zest, Stone Fruit" value={flavorNotes} onChange={(e) => setFlavor(e.target.value)} />
              {flavorNotes && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                  {flavorNotes.split(",").map((f) => f.trim()).filter(Boolean).map((f) => (
                    <span key={f} style={{ padding: "3px 10px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.pill, fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textSecondary }}>{f}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: "16px" }}>
              <label style={label}>Private Notes (not shown to buyers)</label>
              <textarea
                style={{ ...AC.input, resize: "vertical", minHeight: "90px" }}
                placeholder="Internal grading notes, sample preparation details…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: AT.color.redLight, border: `1px solid ${AT.color.red}33`, borderRadius: AT.radius.md, padding: "12px 14px", fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.red, marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button style={AC.btnPrimary} onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting…" : "Submit Score"}
            </button>
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textDisabled }}>
              You will confirm before the score is locked
            </span>
          </div>
        </>
      )}
    </AdminShell>
  );
}
