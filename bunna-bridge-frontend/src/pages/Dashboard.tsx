import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import RoleBadge from "../components/RoleBadge";
import {
  Package, ShieldCheck, TrendingUp, AlertTriangle,
  ArrowRight, Plus, Leaf, Mountain, FlaskConical
} from "lucide-react";

// ── Micro components ──────────────────────────────────────────────

function GateDots({ passed, total = 7 }: { passed: number; total?: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-[5px] h-[5px] rounded-full transition-colors duration-200 ${
            i < passed ? "bg-forest" : "bg-ink/10"
          }`}
        />
      ))}
    </div>
  );
}

function ActivityPill({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col items-center py-2.5 px-5 border-r border-ink/7 shrink-0 whitespace-nowrap">
      <span className="font-display text-2xl font-light text-ink leading-none">
        {value}
        <span className="text-xs text-ink/40 ml-0.5">{unit}</span>
      </span>
      <span className="font-mono text-[0.62rem] tracking-[0.15em] uppercase text-ink/50 mt-[3px]">
        {label}
      </span>
    </div>
  );
}

function PipelineBar({ draft, listed, contracted, exported }: {
  draft: number; listed: number; contracted: number; exported: number;
}) {
  const total = draft + listed + contracted + exported || 1;
  const segments = [
    { label: "Draft",      value: draft,      className: "bg-ink/12" },
    { label: "Listed",     value: listed,      className: "bg-coffee" },
    { label: "Contracted", value: contracted,  className: "bg-sage" },
    { label: "Exported",   value: exported,    className: "bg-forest" },
  ];
  return (
    <div>
      <div className="flex h-1.5 rounded-[3px] overflow-hidden gap-0.5 mb-3">
        {segments.map(s => s.value > 0 && (
          <div
            key={s.label}
            className={`rounded-[3px] transition-[flex] duration-[0.4s] ease-in-out ${s.className}`}
            style={{ flex: s.value / total }}
          />
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-[5px]">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.className}`} />
            <span className="font-mono text-[0.65rem] text-ink/60 tracking-[0.05em]">
              {s.value} {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const role      = user?.role ?? "exporter";

  const { data } = useQuery({
    queryKey: ["lots-dashboard", role],
    queryFn:  () => getLots(),
  });

  // ── Derived stats ─────────────────────────────────────────────
  const total       = data?.count ?? 0;
  const results     = data?.results ?? [];
  const eudrReady   = results.filter(l => l.eudr_dds_ready).length;
  const exportReady = results.filter(l => l.export_ready).length;
  const pending     = results.filter(l => !l.export_ready).length;
  const totalVolume = results.reduce((s, l) => s + (Number(l.volume_kg) || 0), 0);
  const scaScores   = results.filter(l => l.sca_score).map(l => Number(l.sca_score));
  const avgSca      = scaScores.length ? (scaScores.reduce((a, b) => a + b, 0) / scaScores.length).toFixed(1) : "—";
  const regions     = new Set(results.map(l => l.region).filter(Boolean)).size;

  const draftCount      = results.filter(l => l.status === "draft").length;
  const listedCount     = results.filter(l => l.status === "listed").length;
  const contractedCount = results.filter(l => l.status === "contracted").length;
  const exportedCount   = results.filter(l => l.status === "exported").length;

  const avgGates = results.length
    ? Math.round(results.reduce((s, l) => s + (l.compliance_score ?? 0), 0) / results.length)
    : 0;

  const greeting = () => {
    const name = user?.first_name || user?.email?.split("@")[0] || "there";
    const h    = new Date().getHours();
    return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${name}.`;
  };

  const stats = role === "buyer"
    ? [
        { label: "Available Lots",  value: total,     icon: <Package size={16} />,     positive: true,  path: "/marketplace" },
        { label: "EUDR Verified",   value: eudrReady, icon: <ShieldCheck size={16} />, positive: true,  path: "/marketplace?eudr_dds_ready=true" },
        { label: "Green Passport",  value: eudrReady, icon: <Leaf size={16} />,        positive: true,  path: "/marketplace" },
        { label: "Regions Active",  value: regions || 7, icon: <Mountain size={16} />, positive: true,  path: "/marketplace" },
      ]
    : [
        { label: "Total Lots",         value: total,       icon: <Package size={16} />,       positive: true,  path: "/lots" },
        { label: "EUDR Ready",         value: eudrReady,   icon: <ShieldCheck size={16} />,   positive: true,  path: "/lots" },
        { label: "Export Ready",       value: exportReady, icon: <TrendingUp size={16} />,    positive: true,  path: "/lots" },
        { label: "Pending Compliance", value: pending,     icon: <AlertTriangle size={16} />, positive: false, path: "/lots" },
      ];

  const quickActions: Record<string, { label: string; path: string; icon: React.ReactNode; primary?: boolean }[]> = {
    admin:    [
      { label: "Register New Lot",   path: "/lots/new",    icon: <Plus size={14} />,         primary: true },
      { label: "Browse All Lots",    path: "/lots",         icon: <Package size={14} />       },
      { label: "View Marketplace",   path: "/marketplace",  icon: <Leaf size={14} />          },
      { label: "Sample Requests",    path: "/samples",      icon: <FlaskConical size={14} />  },
    ],
    exporter: [
      { label: "Register New Lot",   path: "/lots/new",    icon: <Plus size={14} />,         primary: true },
      { label: "View My Lots",       path: "/lots",         icon: <Package size={14} />       },
      { label: "Sample Requests",    path: "/samples",      icon: <FlaskConical size={14} />  },
    ],
    buyer:    [
      { label: "Browse Marketplace", path: "/marketplace",  icon: <Leaf size={14} />,         primary: true },
      { label: "My Watchlist",       path: "/watchlist",    icon: <Package size={14} />       },
      { label: "Sample Requests",    path: "/samples",      icon: <FlaskConical size={14} />  },
    ],
    farmer:   [
      { label: "My Farm Profile",    path: "/farm",         icon: <Leaf size={14} />,         primary: true },
    ],
    qgrader:  [
      { label: "Lots to Cup",        path: "/lots",         icon: <Package size={14} />,      primary: true },
    ],
  };
  const actions = quickActions[role] || quickActions.exporter;

  return (
    <PageWrapper>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <h1 className="font-display text-[1.85rem] font-normal text-ink mb-1 leading-[1.2]">
            {greeting()}
          </h1>
          <p className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-ink/35 m-0">
            Beersheba Operations · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <RoleBadge role={role} />
      </div>

      {/* ── Harvest context banner ─────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 pt-2.5 border-t border-ink/6">
        <div className="w-1.5 h-1.5 rounded-full bg-sage shrink-0" />
        <span className="font-mono text-[0.62rem] tracking-[0.12em] uppercase text-ink/45">
          2025 Main Crop · Yirgacheffe · Sidama · Guji now in peak yield · EUDR 2026 deadline active
        </span>
      </div>

      {/* ── Activity strip ─────────────────────────────────────────
          Scrolls horizontally instead of clipping on narrow viewports.
          "LIVE REGISTRY" label hides below sm; the dot indicator stays. */}
      {role !== "farmer" && total > 0 && (
        <div className="flex items-stretch bg-white border border-ink/7 rounded-md mb-5 overflow-x-auto">
          <ActivityPill label="Total Volume" value={totalVolume > 0 ? totalVolume.toLocaleString() : "—"} unit={totalVolume > 0 ? "kg" : ""} />
          <ActivityPill label="Avg SCA Score" value={avgSca} />
          <ActivityPill label="Regions Active" value={regions || "—"} />
          <ActivityPill label="Avg Gates Passed" value={avgGates > 0 ? `${avgGates}/7` : "—"} />
          <div className="flex-1 min-w-[12px]" />
          <div className="flex items-center px-5 gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-sage" />
            <span className="font-mono text-[0.62rem] text-ink/45 tracking-[0.08em] hidden sm:inline whitespace-nowrap">
              LIVE REGISTRY
            </span>
          </div>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────── */}
      {role !== "farmer" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className="card overflow-hidden text-left cursor-pointer border border-ink/8 transition-all duration-200 hover:shadow-[0_4px_12px_rgba(28,28,26,0.1)] hover:border-ink/14"
            >
              {/* Status accent strip */}
              <div className={`h-[3px] w-full ${stat.positive ? "bg-forest" : "bg-red-600"}`} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                    stat.positive ? "bg-forest-light" : "bg-red-50"
                  }`}>
                    <span className={stat.positive ? "text-forest" : "text-red-600"}>{stat.icon}</span>
                  </div>
                  <ArrowRight size={12} className="text-ink/20" />
                </div>
                <p className={`font-display text-[2.5rem] font-light mb-1 leading-none ${
                  stat.positive ? "text-forest" : "text-red-600"
                }`}>
                  {stat.value}
                </p>
                <p className="font-mono text-[0.62rem] tracking-[0.12em] uppercase text-ink/50 mb-2.5">
                  {stat.label}
                </p>
                {(stat.label === "EUDR Ready" || stat.label === "EUDR Verified") && (
                  <GateDots passed={eudrReady > 0 ? Math.min(7, Math.round((eudrReady / Math.max(total, 1)) * 7)) : 0} />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Main content grid ─────────────────────────────────────*/}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick actions */}
        <div className="card p-5">
          <p className="card-title">Quick Actions</p>
          <div className="flex flex-col gap-1.5">
            {actions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded cursor-pointer font-mono text-[0.72rem] tracking-[0.04em] transition-all duration-150 ${
                  action.primary
                    ? "bg-forest border border-forest text-white hover:bg-forest-dark hover:border-forest-dark"
                    : "bg-transparent border border-ink/10 text-ink/55 hover:text-ink hover:border-ink/20"
                }`}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
                <ArrowRight size={11} className="ml-auto opacity-40" />
              </button>
            ))}
          </div>
          <div className="mt-4 pt-3.5 border-t border-ink/6">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={11} className="text-forest" />
              <span className="font-mono text-[0.62rem] text-ink/50 tracking-[0.08em]">
                EUDR 2026 COMPLIANCE ENGINE ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Recent lots */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="card-title m-0">Recent Lots</p>
            <button
              onClick={() => navigate("/lots")}
              className="font-mono text-[0.58rem] text-coffee bg-transparent border-none cursor-pointer tracking-[0.05em]"
            >
              View registry →
            </button>
          </div>
          {results.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {results.slice(0, 6).map(lot => (
                <div
                  key={lot.id}
                  onClick={() => navigate(`/lots/${lot.id}`)}
                  className="flex items-center gap-2.5 px-2.5 py-[9px] rounded border border-transparent cursor-pointer transition-all duration-150 hover:bg-linen hover:border-ink/7"
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    lot.export_ready ? "bg-forest" : lot.eudr_dds_ready ? "bg-coffee" : "bg-ink/15"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[0.62rem] text-coffee shrink-0">
                        {lot.lot_id}
                      </span>
                      <span className="font-sans text-[0.8rem] text-ink overflow-hidden text-ellipsis whitespace-nowrap">
                        {lot.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-[3px]">
                      <span className="font-mono text-[0.6rem] text-ink/45 capitalize">
                        {lot.region}
                      </span>
                      <GateDots passed={lot.compliance_score ?? 0} />
                    </div>
                  </div>
                  {lot.sca_score && (
                    <div className="text-right shrink-0">
                      <span className={`font-display text-[1.1rem] font-light leading-none ${
                        Number(lot.sca_score) >= 85 ? "text-coffee" : Number(lot.sca_score) >= 80 ? "text-forest" : "text-ink/40"
                      }`}>
                        {Number(lot.sca_score).toFixed(1)}
                      </span>
                      <span className="font-mono text-[0.55rem] text-ink/40 block">
                        SCA
                      </span>
                    </div>
                  )}
                  <ArrowRight size={10} className="text-ink/15 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <Package size={24} className="text-ink/15 mb-2" />
              <p className="font-mono text-[0.72rem] text-ink/30 mb-2">No lots yet</p>
              <button
                onClick={() => navigate("/lots/new")}
                className="font-mono text-[0.6rem] text-forest bg-transparent border-none cursor-pointer"
              >
                Register first lot →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Lot pipeline card ─────────────────────────────────────*/}
      {role !== "farmer" && total > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="card-title m-0">Lot Pipeline</p>
            <span className="font-mono text-[0.62rem] text-ink/40 tracking-[0.06em]">
              {total} total
            </span>
          </div>
          <PipelineBar
            draft={draftCount}
            listed={listedCount}
            contracted={contractedCount}
            exported={exportedCount}
          />
        </div>
      )}

      {/* ── Farmer stub ───────────────────────────────────────────*/}
      {role === "farmer" && (
        <div className="card p-5 border-forest/15">
          <p className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-forest mb-2">
            Farm Status
          </p>
          <p className="font-mono text-[0.72rem] text-ink/35 m-0">
            Farm profile and lot history — coming soon.
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
