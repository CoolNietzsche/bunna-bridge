const styles: Record<string, { bg: string; color: string; border: string }> = {
  admin:    { bg: "#FDECEA",   color: "#C0392B", border: "rgba(192,57,43,0.2)"  },
  exporter: { bg: "#F5EDE4",   color: "#7B4B2A", border: "rgba(123,75,42,0.2)" },
  buyer:    { bg: "#E8F2EC",   color: "#1B4D35", border: "rgba(27,77,53,0.2)"  },
  forwarder: { bg: "#EEF0F3", color: "#3A4250", border: "rgba(58,66,80,0.2)" },
  cooperative: { bg: "#E8F2EC", color: "#1B4D35", border: "rgba(27,77,53,0.2)" },
  importer: { bg: "#E6F0FB",   color: "#0B4F8A", border: "rgba(11,79,138,0.2)" },
  farmer:   { bg: "#E8F2EC",   color: "#2D7A52", border: "rgba(45,122,82,0.2)" },
  qgrader:  { bg: "#F5EDE4",   color: "#7B4B2A", border: "rgba(123,75,42,0.2)" },
};

export default function RoleBadge({ role }: { role: string }) {
  const c = styles[role] || styles.exporter;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: "20px",
      fontFamily: "inherit", fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {role}
    </span>
  );
}
