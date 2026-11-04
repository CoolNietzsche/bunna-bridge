import type { CSSProperties, ReactNode } from "react";
import { flabel } from "./styles";
import { AlertTriangle, CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";
import type { DeforestationStatus } from "../../api/traceability";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "block", marginBottom: "12px" }}>
      <span style={flabel}>{label}</span>
      {children}
      {hint && <span style={{ ...flabel, fontWeight: 400, color: AT.color.textMuted, marginTop: "4px" }}>{hint}</span>}
    </label>
  );
}

type Tone = "green" | "yellow" | "red" | "blue" | "muted";

export function Pill({ tone, children, icon }: { tone: Tone; children: ReactNode; icon?: ReactNode }) {
  return <span style={{ ...AC.pill.base, ...AC.pill[tone] }}>{icon}{children}</span>;
}

const DEFOR: Record<DeforestationStatus, { tone: Tone; label: string; icon: ReactNode }> = {
  clear: { tone: "green", label: "Clear", icon: <CheckCircle2 size={12} /> },
  overlap: { tone: "red", label: "Forest loss", icon: <XCircle size={12} /> },
  pending: { tone: "yellow", label: "Not checked", icon: <CircleDashed size={12} /> },
  no_data: { tone: "muted", label: "No reference data", icon: <CircleDashed size={12} /> },
};

export function DeforestationPill({ status }: { status: DeforestationStatus }) {
  const d = DEFOR[status] ?? DEFOR.pending;
  return <Pill tone={d.tone} icon={d.icon}>{d.label}</Pill>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" style={{
      display: "flex", gap: "8px", alignItems: "flex-start", padding: "10px 12px", borderRadius: AT.radius.sm,
      background: AT.color.redLight, color: AT.color.red, fontFamily: AT.font.sans, fontSize: "0.8rem",
      marginBottom: "12px",
    }}>
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
      <span>{children}</span>
    </div>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textMuted, margin: 0, ...style }}>
      {children}
    </p>
  );
}
