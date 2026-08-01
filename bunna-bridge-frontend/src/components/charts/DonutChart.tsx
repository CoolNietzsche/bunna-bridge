import { T } from "../../styles/tokens";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSublabel?: string;
}

/**
 * Pure-SVG donut chart — no charting library dependency, consistent with
 * the pure-SVG RadarChart pattern used elsewhere (MarketplaceLotDetail).
 * Renders nothing misleading when there's no data: an empty ring, not a
 * fabricated segment.
 */
export default function DonutChart({ segments, size = 132, thickness = 16, centerLabel, centerSublabel }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const arcs = total > 0
    ? segments.filter((s) => s.value > 0).map((seg) => {
        const fraction = seg.value / total;
        const dash = fraction * circumference;
        const arc = (
          <circle
            key={seg.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return arc;
      })
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.color.stone} strokeWidth={thickness} />
        {arcs}
        {(centerLabel || centerSublabel) && (
          <>
            {centerLabel && (
              <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" fontFamily={T.font.display} fontSize={size * 0.19} fill={T.color.ink}>
                {centerLabel}
              </text>
            )}
            {centerSublabel && (
              <text x={cx} y={cy + size * 0.14} textAnchor="middle" dominantBaseline="middle" fontFamily={T.font.mono} fontSize={size * 0.06} letterSpacing="0.08em" fill={T.color.textFaint}>
                {centerSublabel.toUpperCase()}
              </text>
            )}
          </>
        )}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "120px" }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: seg.color, flexShrink: 0 }} />
            <span style={{ fontFamily: T.font.sans, fontSize: "0.8rem", color: T.color.ink, flex: 1 }}>{seg.label}</span>
            <span style={{ fontFamily: T.font.mono, fontSize: "0.72rem", color: T.color.textFaint }}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
