import { AT } from "../../styles/adminTokens";

export interface BarPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarPoint[];
  height?: number;
  color?: string;
}

/**
 * Bar chart built from flex boxes — no charting library. Labels and values are
 * real HTML text, so they never stretch with the container width. Renders
 * flat empty bars, never fabricated heights, when there's no data.
 */
export default function BarChart({ data, height = 160, color = AT.color.primary }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const plot = height - 28;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: `${height}px` }}>
      {data.map((d) => {
        const h = (d.value / max) * (plot - 18);
        return (
          <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
            <span style={{ fontSize: "11px", color: AT.color.textMuted, fontFamily: AT.font.mono, height: "18px", lineHeight: "18px" }}>
              {d.value > 0 ? d.value : ""}
            </span>
            <div
              title={`${d.label}: ${d.value}`}
              style={{
                width: "100%", maxWidth: "56px",
                height: `${Math.max(h, d.value > 0 ? 3 : 2)}px`,
                background: d.value > 0 ? color : AT.color.border,
                opacity: d.value > 0 ? 0.88 : 1,
                borderRadius: "4px 4px 0 0",
                transition: "height 0.3s ease",
              }}
            />
            <span style={{ marginTop: "8px", fontSize: "11.5px", color: AT.color.textMuted, fontFamily: AT.font.sans, whiteSpace: "nowrap" }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
