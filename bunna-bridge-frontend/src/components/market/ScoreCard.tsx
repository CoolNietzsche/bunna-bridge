import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Leaf, ShieldCheck } from "lucide-react";
import { Muted, Pill } from "../trace/ui";
import { getImpact, getReliabilityScore, type ScoreResult } from "../../api/market";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** An explainable score: total, data coverage, and each criterion with its points and reason. */
function ScoreBody({ data, icon, title, note }: { data: ScoreResult; icon: React.ReactNode; title: string; note?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const tone = data.score === null ? "muted" : data.score >= 75 ? "green" : data.score >= 50 ? "yellow" : "red";
  return (
    <div style={{ ...AC.card, ...AC.cardPad }} data-testid={`score-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>{icon} {title}</p>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {note}
          <Pill tone={tone}>{data.score === null ? "Not enough data" : `${data.score} / 100`}</Pill>
        </span>
      </div>
      <Muted style={{ marginTop: 6 }}>Based on {data.coverage}% of the criteria; criteria without data are left out rather than counted as zero.</Muted>
      <button onClick={() => setOpen(!open)} style={{ ...AC.btnGhost, marginTop: 10, padding: "4px 10px" }}>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {open ? "Hide" : "Show"} how this is scored
      </button>
      {open && (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {data.criteria.map((c) => (
            <div key={c.key}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: AT.font.sans, fontSize: "0.85rem" }}>
                <span style={{ color: AT.color.text, fontWeight: 500 }}>{c.label}</span>
                <span style={{ color: c.has_data ? AT.color.text : AT.color.textMuted }}>{c.has_data ? `${c.points} / ${c.max}` : "no data"}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: AT.color.border, margin: "4px 0", overflow: "hidden" }}>
                <div style={{ height: "100%", width: c.has_data ? `${(100 * c.points) / c.max}%` : 0, background: AT.color.primary }} />
              </div>
              <Muted>{c.detail}</Muted>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImpactCard({ lotId }: { lotId: string }) {
  const { data } = useQuery({ queryKey: ["impact", lotId], queryFn: () => getImpact(lotId), retry: false });
  if (!data) return null;
  return <ScoreBody data={data} icon={<Leaf size={15} />} title="Impact and transparency" />;
}

export function ReliabilityScoreCard({ exporterId }: { exporterId: number | string }) {
  const { data } = useQuery({ queryKey: ["reliability-score", exporterId], queryFn: () => getReliabilityScore(exporterId), retry: false });
  if (!data) return null;
  return (
    <ScoreBody data={data} icon={<ShieldCheck size={15} />} title="Reliability score"
      note={data.provisional ? <Pill tone="muted">Provisional · {data.contracts} contract{data.contracts === 1 ? "" : "s"}</Pill> : null} />
  );
}
