import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { updateLotStatus } from "../api/samples";
import type { CoffeeLot } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import ComplianceBadge from "../components/ComplianceBadge";
import { ArrowRight, Lock, ExternalLink } from "lucide-react";

const PIPELINE: { key: string; label: string; color: string; bg: string; border: string }[] = [
  { key: "draft",      label: "Draft",      color: "#F5EDD8", bg: "rgba(245,237,216,0.05)", border: "rgba(245,237,216,0.1)"  },
  { key: "listed",     label: "Listed",     color: "#C9952A", bg: "rgba(201,149,42,0.08)",  border: "rgba(201,149,42,0.2)"   },
  { key: "contracted", label: "Contracted", color: "#A8C5A0", bg: "rgba(74,124,89,0.1)",    border: "rgba(74,124,89,0.25)"   },
  { key: "exported",   label: "Exported",   color: "#4A7C59", bg: "rgba(30,58,47,0.4)",     border: "rgba(74,124,89,0.3)"    },
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

  const S = {
    hdr:      { marginBottom: "24px" },
    title:    { fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: "0 0 4px", fontFamily: "Cormorant Garamond, serif" },
    sub:      { fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#D4824A", textTransform: "uppercase" as const },
    err:      { background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "10px 14px", fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#C1440E", marginBottom: "16px" },
    cols:     { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" },
    col:      (border: string, bg: string) => ({
      background: bg, border: `1px solid ${border}`,
      borderRadius: "4px", padding: "12px", minHeight: "400px",
    }),
    colHdr:   { marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid rgba(245,237,216,0.06)" },
    colLabel: (color: string) => ({
      fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
      letterSpacing: "0.15em", textTransform: "uppercase" as const,
      color, marginBottom: "2px",
    }),
    colCount: { fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.3)" },
    lotCard:  { background: "#1A0F07", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "2px", padding: "10px", marginBottom: "6px" },
    lotId:    { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#C9952A", marginBottom: "3px" },
    lotName:  { fontSize: "0.82rem", color: "#F5EDD8", marginBottom: "6px", lineHeight: 1.3 },
    lotMeta:  { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)", marginBottom: "8px" },
    advBtn:   (disabled: boolean, ready: boolean) => ({
      width: "100%", padding: "6px 8px", borderRadius: "2px", border: "none",
      fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.08em",
      textTransform: "uppercase" as const, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
      background: disabled ? "rgba(245,237,216,0.04)" :
                  ready    ? "rgba(193,68,14,0.15)"   : "rgba(245,237,216,0.06)",
      color: disabled ? "rgba(245,237,216,0.2)" :
             ready    ? "#C1440E" : "rgba(245,237,216,0.4)",
      marginTop: "6px",
    }),
    viewBtn: {
      width: "100%", padding: "5px 8px", borderRadius: "2px",
      border: "1px solid rgba(245,237,216,0.08)", background: "transparent",
      fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)",
      cursor: "pointer", display: "flex", alignItems: "center",
      justifyContent: "center", gap: "4px", marginTop: "4px",
      textTransform: "uppercase" as const, letterSpacing: "0.08em",
    },
    empty: { fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.2)", textAlign: "center" as const, padding: "20px 0" },
  };

  return (
    <PageWrapper>
      <div style={S.hdr}>
        <h1 style={S.title}>Lot Pipeline</h1>
        <p style={S.sub}>Export status board · Draft → Listed → Contracted → Exported</p>
      </div>

      {error && <div style={S.err}>{error} <span style={{ cursor: "pointer", marginLeft: "8px" }} onClick={() => setError(null)}>✕</span></div>}

      {isLoading ? (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.3)" }}>Loading...</p>
      ) : (
        <div style={S.cols}>
          {PIPELINE.map(stage => {
            const lots = byStatus(stage.key);
            return (
              <div key={stage.key} style={S.col(stage.border, stage.bg)}>
                <div style={S.colHdr}>
                  <p style={{ ...S.colLabel(stage.color), margin: 0 }}>{stage.label}</p>
                  <p style={{ ...S.colCount, margin: "2px 0 0" }}>{lots.length} lot{lots.length !== 1 ? "s" : ""}</p>
                </div>

                {lots.length === 0 && <p style={S.empty}>No lots</p>}

                {lots.map(lot => {
                  const next    = NEXT_STATUS[lot.status];
                  const isLast  = !next;
                  const canMove = next === "exported" ? lot.export_ready : !!next;
                  const isBusy  = updating === lot.id;

                  return (
                    <div key={lot.id} style={S.lotCard}>
                      <p style={{ ...S.lotId, margin: "0 0 3px" }}>{lot.lot_id}</p>
                      <p style={{ ...S.lotName, margin: "0 0 4px" }}>{lot.name}</p>
                      <p style={{ ...S.lotMeta, margin: "0 0 6px" }}>
                        {lot.region} · {lot.grade} · {lot.volume_kg}kg
                      </p>
                      {lot.sca_score && (
                        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#C9952A", margin: "0 0 6px" }}>
                          SCA {lot.sca_score} pts
                        </p>
                      )}
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" as const, marginBottom: "6px" }}>
                        <ComplianceBadge label="EUDR" pass={lot.eudr_dds_ready} />
                        <ComplianceBadge label="Export" pass={lot.export_ready} />
                      </div>

                      {!isLast && (
                        <button
                          style={S.advBtn(isBusy || (!canMove && next === "exported"), canMove)}
                          onClick={() => handleAdvance(lot)}
                          disabled={isBusy}
                          title={next === "exported" && !lot.export_ready ? "Compliance gates not passed" : ""}
                        >
                          {isBusy ? "..." : (
                            <>
                              {next === "exported" && !lot.export_ready
                                ? <><Lock size={10} /> Locked</>
                                : <>{NEXT_STATUS[lot.status]?.toUpperCase()} <ArrowRight size={10} /></>
                              }
                            </>
                          )}
                        </button>
                      )}

                      <button style={S.viewBtn} onClick={() => navigate(`/lots/${lot.id}`)}>
                        <ExternalLink size={10} /> View
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
