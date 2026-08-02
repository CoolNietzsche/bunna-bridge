import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";
import Sparkline from "../charts/Sparkline";

export type WidgetTone = "green" | "blue" | "yellow" | "red" | "muted";

const TONE_FG: Record<WidgetTone, string> = {
  green: AT.color.primary,
  blue: AT.color.blue,
  yellow: "#b45309",
  red: AT.color.red,
  muted: AT.color.textMuted,
};

const TONE_BG: Record<WidgetTone, string> = {
  green: AT.color.greenLight,
  blue: AT.color.blueLight,
  yellow: AT.color.yellowLight,
  red: AT.color.redLight,
  muted: AT.color.surfaceSecondary,
};

function Shell({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  const base = { ...AC.card, ...AC.cardPad, textAlign: "left" as const, width: "100%", display: "block" };
  if (onClick) {
    return <button onClick={onClick} style={{ ...base, cursor: "pointer" }}>{children}</button>;
  }
  return <div style={base}>{children}</div>;
}

// ── CWidgetStatsA/E equivalent — stat + sparkline trend ────────────────
export interface WidgetStatProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: WidgetTone;
  trend: number[];
  sublabel?: string;
  onClick?: () => void;
  key?: string | number;
}

export function WidgetStat({ icon, label, value, tone, trend, sublabel, onClick }: WidgetStatProps) {
  const fg = TONE_FG[tone];
  const bg = TONE_BG[tone];
  return (
    <Shell onClick={onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ width: "36px", height: "36px", borderRadius: AT.radius.md, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </span>
        {onClick && <ArrowUpRight size={14} color={AT.color.textDisabled} />}
      </div>
      <p style={AC.metricValue}>{value}</p>
      <p style={AC.metricLabel}>{label}</p>
      {sublabel && <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.primaryDark, fontWeight: 600, margin: "4px 0 0" }}>{sublabel}</p>}
      <div style={{ marginTop: "10px" }}>
        <Sparkline data={trend} color={fg} height={28} />
      </div>
    </Shell>
  );
}

// ── CWidgetStatsB/C equivalent — stat + progress bar ───────────────────
export interface WidgetStatProgressProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  percent: number;
  tone: WidgetTone;
  footer?: string;
  onClick?: () => void;
  key?: string | number;
}

export function WidgetStatProgress({ icon, label, value, percent, tone, footer, onClick }: WidgetStatProgressProps) {
  const fg = TONE_FG[tone];
  const bg = TONE_BG[tone];
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <Shell onClick={onClick}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        {icon ? (
          <span style={{ width: "36px", height: "36px", borderRadius: AT.radius.md, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </span>
        ) : <span />}
        <span style={{ fontFamily: AT.font.mono, fontSize: "0.78rem", fontWeight: 600, color: fg }}>{pct}%</span>
      </div>
      <p style={AC.metricValue}>{value}</p>
      <p style={{ ...AC.metricLabel, marginBottom: "10px" }}>{label}</p>
      <div style={{ height: "6px", borderRadius: AT.radius.sm, background: AT.color.borderLight, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: fg, borderRadius: AT.radius.sm, transition: "width 0.4s ease" }} />
      </div>
      {footer && <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, margin: "8px 0 0" }}>{footer}</p>}
    </Shell>
  );
}

// ── CWidgetStatsF equivalent — simple icon + title + value ─────────────
export interface WidgetStatSimpleProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: WidgetTone;
  footer?: string;
  onClick?: () => void;
  key?: string | number;
}

export function WidgetStatSimple({ icon, label, value, tone, footer, onClick }: WidgetStatSimpleProps) {
  const fg = TONE_FG[tone];
  const bg = TONE_BG[tone];
  return (
    <Shell onClick={onClick}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ width: "40px", height: "40px", borderRadius: AT.radius.md, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ ...AC.metricValue, fontSize: "1.5rem" }}>{value}</p>
          <p style={{ ...AC.metricLabel, margin: 0 }}>{label}</p>
        </div>
      </div>
      {footer && (
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, margin: "10px 0 0", paddingTop: "10px", borderTop: `1px solid ${AT.color.borderLight}` }}>
          {footer}
        </p>
      )}
    </Shell>
  );
}
