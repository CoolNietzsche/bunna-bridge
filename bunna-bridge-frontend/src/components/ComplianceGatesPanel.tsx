import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, XCircle, ShieldCheck, ShieldAlert, Download, MapPinned,
  RefreshCw, Send, PackageCheck, Link2, ChevronDown, ChevronUp, Lock, Undo2,
} from "lucide-react";
import {
  downloadEudrDds, downloadEudrGeoJson, getComplianceEvents, updateLotStatus,
} from "../api/lots";
import type { CoffeeLot, ComplianceCheck } from "../api/lots";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

interface Props {
  lot: CoffeeLot;
  compliance?: ComplianceCheck;
  isOwner: boolean;
  onChanged: () => void;
}

const GATE_SHORT: Record<string, string> = {
  gps_verified: "GPS",
  deforestation_free: "Deforestation",
  eudr_dds_ready: "DDS",
  phyto_cert_uploaded: "Phyto",
  ecta_license_active: "ECTA",
  nbe_fx_declared: "NBE",
  cta_floor_met: "Floor price",
};

function ReadinessRing({ percent }: { percent: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const color = percent === 100 ? AT.color.green : percent >= 57 ? AT.color.yellow : AT.color.red;
  return (
    <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
        <circle cx="38" cy="38" r={r} fill="none" stroke={AT.color.borderLight} strokeWidth="7" />
        <circle
          cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(percent / 100) * c} ${c}`} transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: AT.font.sans, fontWeight: 700, fontSize: "1.05rem", color: AT.color.text }}>
        {percent}%
      </div>
    </div>
  );
}

export default function ComplianceGatesPanel({ lot, compliance, isOwner, onChanged }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showLog, setShowLog] = useState(false);

  const report = compliance?.report ?? lot.gate_report ?? [];
  const passed = report.filter((g) => g.passed).length;
  const percent = compliance?.readiness_percent ?? Math.round((passed / 7) * 100);
  const allPass = report.length > 0 && passed === report.length;
  const ddsAllowed = lot.gps_verified && lot.deforestation_free;

  const { data: log } = useQuery({
    queryKey: ["compliance-events", lot.id],
    queryFn: () => getComplianceEvents(lot.id),
    enabled: showLog,
  });

  const run = async (key: string, fn: () => Promise<unknown>, success?: string) => {
    setBusy(key); setError(""); setNotice("");
    try {
      await fn();
      if (success) setNotice(success);
      onChanged();
      queryClient.invalidateQueries({ queryKey: ["compliance-events", lot.id] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const next: { label: string; status: CoffeeLot["status"]; icon: React.ReactNode; enabled: boolean; hint?: string } | null =
    lot.status === "draft"
      ? { label: "List on marketplace", status: "listed", icon: <Send size={14} />, enabled: true }
      : lot.status === "contracted"
        ? {
            label: allPass ? "Mark as exported" : "Export locked", status: "exported",
            icon: allPass ? <PackageCheck size={14} /> : <Lock size={14} />, enabled: allPass,
            hint: allPass ? undefined : "All seven gates must pass before the lot can be exported.",
          }
        : null;

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
        <ReadinessRing percent={percent} />
        <div style={{ minWidth: 0 }}>
          <p style={{ ...AC.cardTitle, margin: 0 }}>Export readiness</p>
          <p style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: AT.font.sans, fontSize: "0.86rem", fontWeight: 600, margin: "4px 0 2px", color: allPass ? AT.color.green : AT.color.text }}>
            {allPass ? <ShieldCheck size={15} /> : <ShieldAlert size={15} color={AT.color.yellow} />}
            {allPass ? "All gates passed — export cleared" : `${passed} of 7 gates passed`}
          </p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.textMuted, margin: 0 }}>
            Every gate is checked by the platform from evidence. Nothing here can be ticked by hand.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {report.map((g) => (
          <div
            key={g.gate}
            style={{
              display: "flex", gap: "10px", padding: "10px 12px", borderRadius: AT.radius.md,
              background: g.passed ? AT.color.greenLight : AT.color.surfaceSecondary,
              border: `1px solid ${g.passed ? AT.color.green + "33" : AT.color.border}`,
            }}
          >
            <span style={{ flexShrink: 0, marginTop: "1px", color: g.passed ? AT.color.green : AT.color.red }}>
              {g.passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.83rem", fontWeight: 600, color: AT.color.text, margin: 0 }}>{g.label}</p>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.76rem", color: AT.color.textSecondary, margin: "2px 0 0", lineHeight: 1.45 }}>{g.reason}</p>
              {!g.passed && g.action && isOwner && (
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.orange, margin: "4px 0 0", fontWeight: 500 }}>
                  Next step: {g.action}
                </p>
              )}
            </div>
          </div>
        ))}
        {report.length === 0 && (
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textMuted }}>Checking gates…</p>
        )}
      </div>

      {compliance?.deforestation_check && (
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.textMuted, margin: "12px 0 0" }}>
          Satellite check: {compliance.deforestation_check.message}
        </p>
      )}

      {isOwner && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "18px" }}>
          <button
            onClick={() => run("dds", () => downloadEudrDds(lot.id), "Due Diligence Statement generated and stored on the lot.")}
            disabled={!ddsAllowed || busy !== null}
            title={ddsAllowed ? undefined : "Needs a farm location that passed the deforestation check."}
            style={{ ...AC.btnPrimary, width: "100%", justifyContent: "center", opacity: ddsAllowed ? 1 : 0.5, cursor: ddsAllowed ? "pointer" : "not-allowed" }}
          >
            <Download size={14} />
            {busy === "dds" ? "Generating…" : lot.eudr_dds_ready ? "Regenerate EUDR DDS (PDF)" : "Generate EUDR DDS (PDF)"}
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              onClick={() => run("geo", () => downloadEudrGeoJson(lot.id))}
              disabled={!lot.gps_verified || busy !== null}
              title="Plot geolocation for the EU Information System (TRACES)"
              style={{ ...AC.btnGhost, justifyContent: "center", opacity: lot.gps_verified ? 1 : 0.5 }}
            >
              <MapPinned size={13} /> GeoJSON
            </button>
            <button
              onClick={() => run("check", async () => onChanged(), "Gates re-checked.")}
              disabled={busy !== null}
              style={{ ...AC.btnGhost, justifyContent: "center" }}
            >
              <RefreshCw size={13} /> Re-check
            </button>
          </div>

          {next && (
            <button
              onClick={() => run("status", () => updateLotStatus(lot.id, next.status), `Lot moved to ${next.status}.`)}
              disabled={!next.enabled || busy !== null}
              style={{
                ...(next.status === "exported" ? AC.btnPrimary : AC.btnGhost),
                width: "100%", justifyContent: "center",
                opacity: next.enabled ? 1 : 0.5, cursor: next.enabled ? "pointer" : "not-allowed",
              }}
            >
              {next.icon} {busy === "status" ? "Updating…" : next.label}
            </button>
          )}
          {lot.status === "listed" && (
            <>
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.textMuted, margin: 0, textAlign: "center" }}>
                Listed lots become contracted when you accept an offer.
              </p>
              <button
                onClick={() => run("status", () => updateLotStatus(lot.id, "draft"), "Lot moved back to draft.")}
                disabled={busy !== null}
                style={{ ...AC.btnGhost, width: "100%", justifyContent: "center" }}
              >
                <Undo2 size={13} /> Unlist (back to draft)
              </button>
            </>
          )}
          {next?.hint && (
            <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.textMuted, margin: 0, textAlign: "center" }}>{next.hint}</p>
          )}
          {error && <p role="alert" style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.red, margin: 0 }}>{error}</p>}
          {notice && !error && <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.green, margin: 0 }}>{notice}</p>}
        </div>
      )}

      <div style={{ marginTop: "18px", borderTop: `1px solid ${AT.color.borderLight}`, paddingTop: "12px" }}>
        <button
          onClick={() => setShowLog((v) => !v)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: AT.font.sans, fontSize: "0.8rem", fontWeight: 600, color: AT.color.textSecondary }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><Link2 size={13} /> Compliance audit trail</span>
          {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showLog && (
          <div style={{ marginTop: "10px" }}>
            {log && (
              <p style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: AT.font.sans, fontSize: "0.72rem", margin: "0 0 8px", color: log.chain_valid ? AT.color.green : AT.color.red }}>
                {log.chain_valid ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                {log.chain_valid ? "Hash chain intact — no record has been altered." : "Hash chain broken — records were altered outside the platform."}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "260px", overflowY: "auto" }}>
              {log?.events.map((e) => (
                <div key={e.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontFamily: AT.font.sans, fontSize: "0.74rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 5, flexShrink: 0, background: e.new_value ? AT.color.green : AT.color.red }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: AT.color.text, fontWeight: 500 }}>{GATE_SHORT[e.gate] ?? e.gate}</span>
                    <span style={{ color: AT.color.textSecondary }}> {e.new_value ? "passed" : "failed"} · {e.actor_name}</span>
                    <div style={{ color: AT.color.textMuted, fontFamily: AT.font.mono, fontSize: "0.66rem" }}>
                      {new Date(e.created_at).toLocaleString()} · {e.hash.slice(0, 12)}
                    </div>
                  </div>
                </div>
              ))}
              {log && log.events.length === 0 && (
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.74rem", color: AT.color.textMuted, margin: 0 }}>No gate changes recorded yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
