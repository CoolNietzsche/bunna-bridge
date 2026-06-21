const colors: Record<string, { bg: string; color: string; border: string }> = {
  draft:      { bg: "#F0EDE6",  color: "#4A4A45",  border: "rgba(28,28,26,0.12)" },
  listed:     { bg: "#F5EDE4",  color: "#7B4B2A",  border: "rgba(123,75,42,0.2)" },
  contracted: { bg: "#E8F2EC",  color: "#1B4D35",  border: "rgba(27,77,53,0.2)"  },
  exported:   { bg: "#1B4D35",  color: "#FFFFFF",  border: "rgba(27,77,53,0.3)"  },
};

export default function StatusPill({ status }: { status: string }) {
  const c = colors[status] || colors.draft;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "20px",
      fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
      letterSpacing: "0.1em", textTransform: "uppercase",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {status}
    </span>
  );
}
