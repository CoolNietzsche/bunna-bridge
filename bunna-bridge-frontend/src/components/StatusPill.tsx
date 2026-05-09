const colors: Record<string, { bg: string; color: string; border: string }> = {
  draft:      { bg: "rgba(245,237,216,0.08)", color: "rgba(245,237,216,0.5)", border: "rgba(245,237,216,0.15)" },
  listed:     { bg: "rgba(201,149,42,0.15)",  color: "#C9952A",               border: "rgba(201,149,42,0.3)"  },
  contracted: { bg: "rgba(74,124,89,0.15)",   color: "#A8C5A0",               border: "rgba(74,124,89,0.3)"  },
  exported:   { bg: "rgba(30,58,47,0.4)",     color: "#4A7C59",               border: "rgba(74,124,89,0.2)"  },
};

export default function StatusPill({ status }: { status: string }) {
  const c = colors[status] || colors.draft;
  return (
    <span style={{
      padding: "0.2rem 0.6rem", borderRadius: "2px", fontFamily: "monospace",
      fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {status}
    </span>
  );
}
