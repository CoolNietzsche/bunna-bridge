import { useState } from "react";
import { Check } from "lucide-react";
import { ErrorNote, Field, Muted } from "../trace/ui";
import { grid } from "../trace/styles";
import { AFFECTIVE, CATEGORIES, DESCRIPTIVE, cvaScore, label } from "../../api/quality";
import type { Affective, Cva, CvaInput } from "../../api/quality";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

const HEDONIC = ["", "Extremely dislike", "Very much dislike", "Moderately dislike", "Slightly dislike", "Neither", "Slightly like", "Moderately like", "Very much like", "Extremely like"];

function emptyCva(initial?: Cva | null): CvaInput {
  if (initial) {
    const { fragrance, aroma, flavor, aftertaste, acidity, sweetness, mouthfeel, overall, non_uniform_cups, defective_cups, intensities, flavor_categories, main_acid, mouthfeel_type, descriptors, roast_level, notes } = initial;
    return { fragrance, aroma, flavor, aftertaste, acidity, sweetness, mouthfeel, overall, non_uniform_cups, defective_cups, intensities, flavor_categories, main_acid, mouthfeel_type, descriptors, roast_level, notes };
  }
  return {
    fragrance: 6, aroma: 6, flavor: 6, aftertaste: 6, acidity: 6, sweetness: 6, mouthfeel: 6, overall: 6,
    non_uniform_cups: 0, defective_cups: 0, intensities: {}, flavor_categories: [], main_acid: "", mouthfeel_type: "",
    descriptors: "", roast_level: "", notes: "",
  };
}

/**
 * SCA Coffee Value Assessment (2024): descriptive (intensity 0–15, flavour
 * categories) and affective (1–9 liking per attribute), with the 100-point
 * score shown live.
 */
export default function CvaForm({ initial, busy, error, onSubmit, submitLabel = "Submit assessment" }: {
  initial?: Cva | null; busy?: boolean; error?: string; onSubmit: (v: CvaInput) => void; submitLabel?: string;
}) {
  const [v, setV] = useState<CvaInput>(() => emptyCva(initial));
  const score = cvaScore(v as Record<Affective, number>, v.non_uniform_cups, v.defective_cups);
  const toggleCat = (c: string) => setV((x) => ({
    ...x,
    flavor_categories: x.flavor_categories.includes(c) ? x.flavor_categories.filter((y) => y !== c) : x.flavor_categories.length < 5 ? [...x.flavor_categories, c] : x.flavor_categories,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Muted>Rate how much you like each attribute (1–9). Intensity (0–15) describes how strong it is, separately from liking.</Muted>
        <span style={{ fontFamily: AT.font.sans, fontSize: "2rem", fontWeight: 700, color: AT.color.primaryDark }} aria-live="polite">{score.toFixed(2)}</span>
      </div>
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {AFFECTIVE.map((a) => (
          <div key={a} style={{ display: "grid", gridTemplateColumns: "minmax(90px, 120px) 1fr minmax(120px, 160px)", gap: 10, alignItems: "center" }}>
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.86rem", fontWeight: 500, color: AT.color.text }}>{label(a)}</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }} role="radiogroup" aria-label={`${label(a)} liking`}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={v[a] === n} title={HEDONIC[n]} onClick={() => setV({ ...v, [a]: n })}
                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${v[a] === n ? AT.color.primary : AT.color.border}`, background: v[a] === n ? AT.color.primary : AT.color.surface, color: v[a] === n ? "#fff" : AT.color.text, fontFamily: AT.font.sans, fontSize: "0.84rem", cursor: "pointer" }}>
                  {n}
                </button>
              ))}
            </div>
            {DESCRIPTIVE.includes(a as never) ? (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: AT.font.sans, fontSize: "0.76rem", color: AT.color.textMuted }}>
                Intensity
                <input type="number" min={0} max={15} aria-label={`${label(a)} intensity`} value={v.intensities[a] ?? ""} onChange={(e) => setV({ ...v, intensities: { ...v.intensities, [a]: e.target.value === "" ? undefined : Number(e.target.value) } })} style={{ ...AC.input, width: 64, padding: "6px 8px" }} />
              </label>
            ) : <span />}
          </div>
        ))}
      </div>
      <div style={grid(160)}>
        <Field label="Non-uniform cups (of 5)"><input style={AC.input} type="number" min={0} max={5} value={v.non_uniform_cups} onChange={(e) => setV({ ...v, non_uniform_cups: Number(e.target.value) })} /></Field>
        <Field label="Defective cups (of 5)"><input style={AC.input} type="number" min={0} max={5} value={v.defective_cups} onChange={(e) => setV({ ...v, defective_cups: Number(e.target.value) })} /></Field>
        <Field label="Main acid"><input style={AC.input} value={v.main_acid} onChange={(e) => setV({ ...v, main_acid: e.target.value })} placeholder="citric, malic…" /></Field>
        <Field label="Mouthfeel"><input style={AC.input} value={v.mouthfeel_type} onChange={(e) => setV({ ...v, mouthfeel_type: e.target.value })} placeholder="silky, syrupy…" /></Field>
      </div>
      <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", fontWeight: 500, color: AT.color.textSecondary, margin: "4px 0 6px" }}>Flavour categories (up to 5)</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {CATEGORIES.map((c) => {
          const on = v.flavor_categories.includes(c);
          return (
            <button key={c} type="button" aria-pressed={on} onClick={() => toggleCat(c)} style={{ ...AC.pill.base, ...(on ? AC.pill.green : AC.pill.muted), border: "none", cursor: "pointer" }}>{label(c)}</button>
          );
        })}
      </div>
      <Field label="Tasting notes"><input style={AC.input} value={v.descriptors} onChange={(e) => setV({ ...v, descriptors: e.target.value })} placeholder="jasmine, bergamot, peach" /></Field>
      <Field label="Comments"><textarea style={{ ...AC.input, minHeight: 48 }} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
      <ErrorNote>{error}</ErrorNote>
      <button style={AC.btnPrimary} disabled={busy} onClick={() => onSubmit(v)}><Check size={14} /> {busy ? "Saving…" : submitLabel}</button>
    </div>
  );
}
