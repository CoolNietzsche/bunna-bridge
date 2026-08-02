import { AT } from "../../styles/adminTokens";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
}

/** Minimal pure-SVG sparkline — no axis, no labels. For compact inline widget use only. */
export default function Sparkline({ data, width = 100, height = 32, color = AT.color.primary, strokeWidth = 1.75, fill = true }: SparklineProps) {
  if (data.length === 0) {
    return <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: `${height}px`, display: "block" }} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pad = strokeWidth;

  const points = data.map((v, i) => {
    const x = data.length > 1 ? i * step : width / 2;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: `${height}px`, display: "block" }}>
      {fill && <path d={areaPath} fill={color} opacity={0.12} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
