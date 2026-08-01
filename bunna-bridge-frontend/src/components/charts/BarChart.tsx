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

/** Pure-SVG bar chart — no charting library. Renders flat empty bars, never fabricated heights, when there's no data. */
export default function BarChart({ data, height = 160, color = AT.color.primary }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: `${height}px`, display: "block" }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24);
          const x = i * barWidth + barWidth * 0.2;
          const w = barWidth * 0.6;
          return (
            <g key={d.label}>
              <rect x={x} y={height - 24 - h} width={w} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="2" fill={color} opacity={0.85} />
              <text x={x + w / 2} y={height - 8} textAnchor="middle" fontSize="6" fontFamily={AT.font.sans} fill={AT.color.textMuted}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
