import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { updateLotStatus } from "../api/samples";
import type { CoffeeLot } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import { ArrowRight, Lock, ExternalLink, ShieldCheck, TrendingUp, X, Package } from "lucide-react";

const PIPELINE = [
  { key: "draft",      label: "Draft",      color: "rgba(245,237,216,0.6)",  accent: "rgba(245,237,216,0.08)",  border: "rgba(245,237,216,0.08)"  },
  { key: "listed",     label: "Listed",     color: "#C9952A",                accent: "rgba(201,149,42,0.07)",   border: "rgba(201,149,42,0.15)"   },
  { key: "contracted", label: "Contracted", color: "#A8C5A0",                accent: "rgba(74,124,89,0.07)",    border: "rgba(74,124,89,0.2)"     },
  { key: "exported",   label: "Exported",   color: "#4A7C59",                accent: "rgba(30,58,47,0.3)",      border: "rgba(74,124,89,0.25)"    },
];

const NEXT_STATUS: Record<string, string> = {
  draft: "listed", listed: "contracted", contracted: "exported",
};

export default function LotPipeline() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lots-pipeline"],
    queryFn:  () => getLots({ ordering: "-created_at" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ lotId, status }: { lotId: string; status: string }) =>
      updateLotStatus(lotId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lots-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      setUpdating(null);
      setError(null);
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
    setUpdating(lot.id);
    setError(null);
    statusMutation.mutate({ lotId: lot.id, status: next });
  };

  const byStatus = (status: string) =>
    data?.results.filter(l => l.status === status) ?? [];

  const totalLots = data?.results.length ?? 0;

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.75rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 4px" }}>
          Lot Pipeline
        </h1>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: 0 }}>
          Export Status Board · Draft → Listed → Contracted → Exported
        </p>
      </div>

      {/* Summary bar */}
      {data && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {PIPELINE.map(stage => {
            const count = byStatus(stage.key).length;
            return (
              <div key={stage.key} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 14px", borderRadius: "3px",
                background: stage.accent, border: `1px solid ${stage.border}`,
                flex: "1 1 100px",
              }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: stage.color }}>
                  {stage.label}
                </span>
                <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontWeight: 300, color: stage.color, marginLeft: "auto", lineHeight: 1 }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(193,68,14,0.1)", border: "1px solid rgba(193,68,14,0.25)", borderRadius: "4px", padding: "10px 14px", marginBottom: "16px" }}>
          <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#C1440E" }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#C1440E", cursor: "pointer", padding: "0 4px" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "64px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
          Loading pipeline...
        </div>
      )}

      {!isLoading && totalLots === 0 && (
        <div style={{ textAlign: "center", padding: "64px" }}>
          <Package size={32} color="rgba(245,237,216,0.1)" style={{ marginBottom: "12px" }} />
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
            No lots in pipeline yet.
          </p>
        </div>
      )}

      {/* Kanban board */}
      {!isLoading && totalLots > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", alignItems: "start" }}>
          {PIPELINE.map(stage => {
            const lots = byStatus(stage.key);
            return (
              <div key={stage.key} style={{
                background: stage.accent,
                border: `1px solid ${stage.border}`,
                borderRadius: "6px", padding: "14px",
                minHeight: "320px",
              }}>
                {/* Column header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", paddingBottom: "10px", borderBottom: `1px solid ${stage.border}` }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: stage.color }}>
                    {stage.label}
                  </span>
                  <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.2rem", fontWeight: 300, color: stage.color, lineHeight: 1 }}>
                    {lots.length}
                  </span>
                </div>

                {/* Empty state */}
                {lots.length === 0 && (
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.18)", textAlign: "center", padding: "24px 0" }}>
                    No lots
                  </p>
                )}

                {/* Lot cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {lots.map(lot => {
                    const next   = NEXT_STATUS[lot.status];
                    const isLast = !next;
                    const canMove = next === "exported" ? lot.export_ready : !!next;
                    const isBusy = updating === lot.id;
                    const locked = next === "exported" && !lot.export_ready;

                    return (
                      <div key={lot.id} style={{
                        background: "#1E1208",
                        border: "1px solid rgba(245,237,216,0.07)",
                        borderRadius: "4px", padding: "12px",
                        transition: "border-color 0.12s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(245,237,216,0.12)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(245,237,216,0.07)")}
                      >
                        {/* Lot ID */}
                        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#C9952A", margin: "0 0 3px", letterSpacing: "0.06em" }}>
                          {lot.lot_id}
                        </p>

                        {/* Lot name */}
                        <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#F5EDD8", margin: "0 0 6px", lineHeight: 1.3, fontWeight: 500 }}>
                          {lot.name}
                        </p>

                        {/* Meta */}
                        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(245,237,216,0.3)", margin: "0 0 8px", letterSpacing: "0.04em", textTransform: "capitalize" }}>
                          {lot.region} · {lot.grade} · {lot.volume_kg} kg
                        </p>

                        {/* SCA score */}
                        {lot.sca_score && (
                          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#C9952A", margin: "0 0 8px" }}>
                            {lot.sca_score} pts
                          </p>
                        )}

                        {/* Compliance pills */}
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
                          {lot.eudr_dds_ready && (
                            <span style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 6px", background: "rgba(30,58,47,0.4)", border: "1px solid rgba(74,124,89,0.25)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#A8C5A0" }}>
                              <ShieldCheck size={8} /> EUDR
                            </span>
                          )}
                          {lot.export_ready && (
                            <span style={{ display: "flex", alignItems: "center", gap: "3px", padding: "2px 6px", background: "rgba(74,124,89,0.15)", border: "1px solid rgba(74,124,89,0.2)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#4A7C59" }}>
                              <TrendingUp size={8} /> Export Ready
                            </span>
                          )}
                        </div>

                        {/* Divider */}
                        <div style={{ height: "1px", background: "rgba(245,237,216,0.05)", marginBottom: "8px" }} />

                        {/* Actions */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {!isLast && (
                            <button
                              onClick={() => handleAdvance(lot)}
                              disabled={isBusy || locked}
                              style={{
                                width: "100%", padding: "7px 8px",
                                borderRadius: "3px", border: "none",
                                display: "flex", alignItems: "center",
                                justifyContent: "center", gap: "5px",
                                fontFamily: "DM Mono, monospace",
                                fontSize: "0.58rem", letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                cursor: (isBusy || locked) ? "not-allowed" : "pointer",
                                background: locked ? "rgba(245,237,216,0.03)" :
                                            canMove ? "rgba(193,68,14,0.15)" : "rgba(245,237,216,0.05)",
                                color: locked ? "rgba(245,237,216,0.2)" :
                                       canMove ? "#C1440E" : "rgba(245,237,216,0.35)",
                                transition: "all 0.12s",
                              }}
                            >
                              {isBusy ? "Updating..." : locked
                                ? <><Lock size={9} /> Locked</>
                                : <>{next?.toUpperCase()} <ArrowRight size={9} /></>
                              }
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/lots/${lot.id}`)}
                            style={{
                              width: "100%", padding: "6px 8px",
                              borderRadius: "3px", border: "1px solid rgba(245,237,216,0.07)",
                              background: "transparent",
                              display: "flex", alignItems: "center",
                              justifyContent: "center", gap: "5px",
                              fontFamily: "DM Mono, monospace",
                              fontSize: "0.55rem", letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "rgba(245,237,216,0.3)", cursor: "pointer",
                              transition: "all 0.12s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,237,216,0.15)"; e.currentTarget.style.color = "rgba(245,237,216,0.6)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,237,216,0.07)"; e.currentTarget.style.color = "rgba(245,237,216,0.3)"; }}
                          >
                            <ExternalLink size={9} /> View Lot
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
    </PageWrapper>
  );
}
