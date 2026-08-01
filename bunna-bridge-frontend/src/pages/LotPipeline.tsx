import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { updateLotStatus } from "../api/samples";
import type { CoffeeLot } from "../api/lots";
import AdminShell from "../components/admin/AdminShell";
import { ArrowRight, Lock, ExternalLink, ShieldCheck, TrendingUp, X, Package } from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const PIPELINE = [
  { key: "draft", label: "Draft", color: AT.color.textMuted, bg: AT.color.surfaceSecondary },
  { key: "listed", label: "Listed", color: AT.color.blue, bg: AT.color.blueLight },
  { key: "contracted", label: "Contracted", color: "#b45309", bg: AT.color.yellowLight },
  { key: "exported", label: "Exported", color: AT.color.primaryDark, bg: AT.color.primaryLight },
];

const NEXT_STATUS: Record<string, string> = { draft: "listed", listed: "contracted", contracted: "exported" };

export default function LotPipeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["lots-pipeline"], queryFn: () => getLots({ ordering: "-created_at" }) });

  const statusMutation = useMutation({
    mutationFn: ({ lotId, status }: { lotId: string; status: string }) => updateLotStatus(lotId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lots-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      setUpdating(null); setError(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to update status.");
      setUpdating(null);
    },
  });

  const handleAdvance = (lot: CoffeeLot) => {
    const next = NEXT_STATUS[lot.status];
    if (!next) return;
    if (next === "exported" && !lot.export_ready) {
      setError(`Cannot export ${lot.lot_id} — compliance gates not all passed.`);
      return;
    }
    setUpdating(lot.id); setError(null);
    statusMutation.mutate({ lotId: lot.id, status: next });
  };

  const byStatus = (status: string) => data?.results.filter((l) => l.status === status) ?? [];

  return (
    <AdminShell>
      <div style={{ marginBottom: "16px" }}>
        <p style={AC.eyebrow}>Export status board</p>
        <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Lot Pipeline</h1>
        <p style={AC.pageSubtitle}>Draft → Listed → Contracted → Exported</p>
      </div>

      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          {PIPELINE.map((stage) => {
            const count = byStatus(stage.key).length;
            return (
              <div key={stage.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: AT.radius.md, background: stage.bg, border: `1px solid ${AT.color.border}` }}>
                <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", fontWeight: 600, color: stage.color }}>{stage.label}</span>
                <span style={{ fontFamily: AT.font.sans, fontSize: "1.3rem", fontWeight: 700, color: stage.color, lineHeight: 1 }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: AT.color.redLight, border: `1px solid ${AT.color.red}33`, borderRadius: AT.radius.md, padding: "10px 14px", marginBottom: "16px", fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.red }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: AT.color.red, cursor: "pointer" }}><X size={14} /></button>
        </div>
      )}

      {isLoading && <div style={{ textAlign: "center", padding: "64px 0" }}><p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading pipeline…</p></div>}

      {!isLoading && !data?.results.length && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <Package size={32} color={AT.color.textDisabled} style={{ marginBottom: "10px" }} />
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>No lots in pipeline yet.</p>
        </div>
      )}

      {/* Kanban board — horizontally scrollable on narrow viewports, columns keep a minimum width */}
      {!isLoading && !!data?.results.length && (
        <div className="ab-kanban" style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
          {PIPELINE.map((stage) => {
            const lots = byStatus(stage.key);
            return (
              <div key={stage.key} style={{ background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.lg, padding: "14px", minHeight: "280px", flex: "0 0 260px", width: "260px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "10px", borderBottom: `1px solid ${AT.color.border}` }}>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 600, color: stage.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{stage.label}</span>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "1.1rem", fontWeight: 700, color: stage.color, lineHeight: 1 }}>{lots.length}</span>
                </div>

                {lots.length === 0 && <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textDisabled, textAlign: "center", padding: "24px 0" }}>No lots</p>}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {lots.map((lot) => {
                    const next = NEXT_STATUS[lot.status];
                    const isLast = !next;
                    const locked = next === "exported" && !lot.export_ready;
                    const isBusy = updating === lot.id;

                    return (
                      <div key={lot.id} style={{ ...AC.card, padding: "12px" }}>
                        <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>{lot.lot_id}</p>
                        <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", fontWeight: 600, color: AT.color.text, margin: "0 0 5px", lineHeight: 1.3 }}>{lot.name}</p>
                        <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, margin: "0 0 8px", textTransform: "capitalize" }}>{lot.region} · {lot.grade} · {lot.volume_kg} kg</p>

                        {lot.sca_score && <p style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", fontWeight: 600, color: AT.color.primaryDark, margin: "0 0 8px" }}>{lot.sca_score} pts</p>}

                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
                          {lot.eudr_dds_ready && <span style={{ ...AC.pill.base, ...AC.pill.green }}><ShieldCheck size={9} /> EUDR</span>}
                          {lot.export_ready && <span style={{ ...AC.pill.base, ...AC.pill.green }}><TrendingUp size={9} /> Ready</span>}
                        </div>

                        <div style={{ borderTop: `1px solid ${AT.color.borderLight}`, margin: "8px 0" }} />

                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {!isLast && (
                            <button
                              onClick={() => handleAdvance(lot)}
                              disabled={isBusy || locked}
                              style={{
                                ...AC.btnPrimary, width: "100%", justifyContent: "center", fontSize: "0.72rem", padding: "7px 8px",
                                background: locked ? AT.color.surfaceSecondary : AT.color.primary,
                                borderColor: locked ? AT.color.border : AT.color.primaryDark,
                                color: locked ? AT.color.textDisabled : "#fff",
                                cursor: isBusy || locked ? "not-allowed" : "pointer",
                              }}
                            >
                              {isBusy ? "Updating…" : locked ? <><Lock size={11} /> Locked</> : <>{next?.toUpperCase()} <ArrowRight size={11} /></>}
                            </button>
                          )}
                          <button onClick={() => navigate(`/lots/${lot.id}`)} style={{ ...AC.btnGhost, width: "100%", justifyContent: "center", fontSize: "0.72rem", padding: "6px 8px" }}>
                            <ExternalLink size={11} /> View Lot
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
