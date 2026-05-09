const styles: Record<string, { bg: string; color: string; border: string }> = {
  admin:    { bg: "rgba(193,68,14,0.2)",    color: "#C1440E", border: "rgba(193,68,14,0.4)"   },
  exporter: { bg: "rgba(201,149,42,0.15)",  color: "#C9952A", border: "rgba(201,149,42,0.35)" },
  buyer:    { bg: "rgba(74,124,89,0.15)",   color: "#A8C5A0", border: "rgba(74,124,89,0.35)"  },
  farmer:   { bg: "rgba(168,197,160,0.15)", color: "#A8C5A0", border: "rgba(168,197,160,0.3)" },
  qgrader:  { bg: "rgba(212,130,74,0.15)",  color: "#D4824A", border: "rgba(212,130,74,0.35)" },
};

export default function RoleBadge({ role }: { role: string }) {
  const c = styles[role] || styles.exporter;
  return (
    <span style={{
      padding: "0.2rem 0.6rem", borderRadius: "2px",
      fontFamily: "monospace", fontSize: "0.58rem",
      letterSpacing: "0.1em", textTransform: "uppercase",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {role}
    </span>
  );
}
