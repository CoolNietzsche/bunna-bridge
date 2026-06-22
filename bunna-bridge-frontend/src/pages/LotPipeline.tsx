import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { updateLotStatus } from "../api/samples";
import type { CoffeeLot } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import { ArrowRight, Lock, ExternalLink, ShieldCheck, TrendingUp, X, Package } from "lucide-react";
import { T } from "../styles/tokens";
import { CS } from "../styles/components";

const PIPELINE = [
  { key: "draft",      label: "Draft",      color: T.color.slate,  bg: T.color.stone,       border: T.color.border        },
  { key: "listed",     label: "Listed",     color: T.color.coffee, bg: T.color.coffeeLight,  border: "rgba(123,75,42,0.2)" },
  { key: "contracted", label: "Contracted", color: T.color.forest, bg: T.color.forestLight,  border: "rgba(27,77,53,0.2)"  },
  { key: "exported",   label: "Exported",   color: T.color.white,  bg: T.color.forest,       border: T.color.forest        },
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

  const byStatus = (status: string) =>
    data?.results.filter(l => l.status === status) ?? [];

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={CS.pageTitle}>Lot Pipeline</h1>
        <p style={CS.pageSubtitle}>Export Status Board · Draft → Listed → Contracted → Exported</p>
      </div>

      {/* Summary bar */}
      {data && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {PIPELINE.map(stage => {
            const count = byStatus(stage.key).length;
            return (
              <div key={stage.key} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 16px", borderRadius: T.radius.md,
                background: stage.bg, border: `1px solid ${stage.border}`,
                flex: "1 1 100px",
              }}>
                <span style={{ fontFamily: T.font.mono, fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: stage.color }}>
                  {stage.label}
                </span>
                <span style={{ fontFamily: T.font.display, fontSize: "1.6rem", fontWeight: 300, color: stage.color, marginLeft: "auto", lineHeight: 1 }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ ...CS.errorBanner, justifyContent: "space-between", marginBottom: "16px" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: T.color.red, cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "64px", fontFamily: T.font.mono, fontSize: "0.75rem", color: T.color.textFaint }}>
          Loading pipeline...
        </div>
      )}

      {!isLoading && !data?.results.length && (
        <div style={{ textAlign: "center", padding: "64px" }}>
          <Package size={32} color={T.color.textGhost} style={{ marginBottom: "12px" }} />
          <p style={{ fontFamily: T.font.mono, fontSize: "0.75rem", color: T.color.textFaint }}>No lots in pipeline yet.</p>
        </div>
      )}

      {/* Kanban board */}
      {!isLoading && !!data?.results.length && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", alignItems: "start" }}>
          {PIPELINE.map(stage => {
            const lots = byStatus(stage.key);
            const isExported = stage.key === "exported";
            return (
              <div key={stage.key} style={{
                background: isExported ? T.color.forestLight : T.color.linen,
                border: `1px solid ${stage.border}`,
                borderRadius: T.radius.lg, padding: "14px", minHeight: "280px",
              }}>
                {/* Column header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", paddingBottom: "10px", borderBottom: `1px solid ${stage.border}` }}>
                  <span style={{ fontFamily: T.font.mono, fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: stage.color }}>
                    {stage.label}
                  </span>
                  <span style={{ fontFamily: T.font.display, fontSize: "1.3rem", fontWeight: 300, color: stage.color, lineHeight: 1 }}>
                    {lots.length}
                  </span>
                </div>

                {lots.length === 0 && (
                  <p style={{ fontFamily: T.font.mono, fontSize: "0.6rem", color: T.color.textGhost, textAlign: "center", padding: "24px 0" }}>
                    No lots
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {lots.map(lot => {
                    const next   = NEXT_STATUS[lot.status];
                    const isLast = !next;
                    const locked = next === "exported" && !lot.export_ready;
                    const isBusy = updating === lot.id;

                    return (
                      <div key={lot.id} style={{
                        background: T.color.white,
                        border: `1px solid ${T.color.border}`,
                        borderRadius: T.radius.md, padding: "12px",
                        boxShadow: T.shadow.card, transition: "box-shadow 0.12s",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = T.shadow.hover)}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = T.shadow.card)}
                      >
                        <p style={{ fontFamily: T.font.mono, fontSize: "0.55rem", color: T.color.coffee, margin: "0 0 3px", letterSpacing: "0.08em" }}>
                          {lot.lot_id}
                        </p>
                        <p style={{ fontFamily: T.font.sans, fontSize: "0.825rem", color: T.color.ink, margin: "0 0 5px", lineHeight: 1.3, fontWeight: 500 }}>
                          {lot.name}
                        </p>
                        <p style={{ fontFamily: T.font.mono, fontSize: "0.55rem", color: T.color.textFaint, margin: "0 0 8px", textTransform: "capitalize" }}>
                          {lot.region} · {lot.grade} · {lot.volume_kg} kg
                        </p>

                        {lot.sca_score && (
                          <p style={{ fontFamily: T.font.mono, fontSize: "0.62rem", color: T.color.coffee, margin: "0 0 8px" }}>
                            {lot.sca_score} pts
                          </p>
                        )}

                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
                          {lot.eudr_dds_ready && (
                            <span style={{ ...CS.badge.base, ...CS.badge.eudr }}>
                              <ShieldCheck size={8} /> EUDR
                            </span>
                          )}
                          {lot.export_ready && (
                            <span style={{ ...CS.badge.base, ...CS.badge.eudr }}>
                              <TrendingUp size={8} /> Export Ready
                            </span>
                          )}
                        </div>

                        <hr style={CS.divider} />

                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {!isLast && (
                            <button
                              onClick={() => handleAdvance(lot)}
                              disabled={isBusy || locked}
                              style={{
                                ...CS.btnPrimary,
                                width: "100%", justifyContent: "center",
                                fontSize: "0.58rem", padding: "7px 8px",
                                background: locked ? T.color.stone : T.color.forest,
                                borderColor: locked ? T.color.border : T.color.forest,
                                color: locked ? T.color.textFaint : T.color.white,
                                cursor: (isBusy || locked) ? "not-allowed" : "pointer",
                              }}
                            >
                              {isBusy ? "Updating..." : locked
                                ? <><Lock size={9} /> Locked</>
                                : <>{next?.toUpperCase()} <ArrowRight size={9} /></>}
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/lots/${lot.id}`)}
                            style={{ ...CS.btnGhost, width: "100%", justifyContent: "center", fontSize: "0.55rem", padding: "6px 8px" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = T.color.borderStrong; e.currentTarget.style.color = T.color.ink; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = T.color.border; e.currentTarget.style.color = T.color.textMuted; }}
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
