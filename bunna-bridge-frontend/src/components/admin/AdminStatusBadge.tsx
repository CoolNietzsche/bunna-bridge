import { AC } from "../../styles/adminComponents";

const STATUS_TONE: Record<string, keyof typeof AC.pill> = {
  draft: "muted",
  listed: "blue",
  contracted: "yellow",
  exported: "green",
};

/** Lot status pill, matching Gentelella's filled-pill pattern. */
export function LotStatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "muted";
  return <span style={{ ...AC.pill.base, ...AC.pill[tone], textTransform: "capitalize" }}>{status}</span>;
}

/** Compliance-gates pill, e.g. "7/7 gates" or "3/7 gates". */
export function ComplianceBadge({ passed, total = 7 }: { passed: number; total?: number }) {
  const tone: keyof typeof AC.pill = passed === total ? "green" : passed >= total - 2 ? "yellow" : passed > 0 ? "blue" : "muted";
  return <span style={{ ...AC.pill.base, ...AC.pill[tone] }}>{passed}/{total} gates</span>;
}
