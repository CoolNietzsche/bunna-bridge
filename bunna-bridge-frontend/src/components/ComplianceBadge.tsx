interface Props { label: string; pass: boolean; }

export default function ComplianceBadge({ label, pass }: Props) {
  const s = {
    wrap: {
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.25rem 0.6rem", borderRadius: "2px", fontFamily: "monospace",
      fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase" as const,
      background: pass ? "rgba(74,124,89,0.2)"  : "rgba(192,57,43,0.15)",
      border:     pass ? "1px solid rgba(74,124,89,0.4)" : "1px solid rgba(27,77,53,0.4)",
      color:      pass ? "#A8D5BC" : "#1B4D35",
    },
    dot: {
      width: "5px", height: "5px", borderRadius: "50%",
      background: pass ? "#A8D5BC" : "#1B4D35",
      flexShrink: 0,
    },
  };
  return (
    <span style={s.wrap}>
      <span style={s.dot} />
      {pass ? "✓" : "✗"} {label}
    </span>
  );
}
