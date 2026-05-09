import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import RoleBadge from "../components/RoleBadge";
import {
  Package, ShieldCheck, TrendingUp, AlertTriangle,
  ArrowRight, Plus, Coffee
} from "lucide-react";

export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const role      = user?.role ?? "exporter";

  const { data } = useQuery({
    queryKey: ["lots-dashboard", role],
    queryFn:  () => getLots(),
  });

  const total       = data?.count ?? 0;
  const eudrReady   = data?.results.filter(l => l.eudr_dds_ready).length  ?? 0;
  const exportReady = data?.results.filter(l => l.export_ready).length    ?? 0;
  const pending     = data?.results.filter(l => !l.export_ready).length   ?? 0;

  const greeting = () => {
    const name = user?.first_name || user?.email?.split("@")[0] || "there";
    const h    = new Date().getHours();
    return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${name}.`;
  };

  const stats = role === "buyer"
    ? [
        { label: "Available Lots",   value: total,     icon: <Package size={16} />,      color: "text-cream",      bg: "bg-cream/5",       border: "border-border",           path: "/marketplace" },
        { label: "EUDR Verified",    value: eudrReady, icon: <ShieldCheck size={16} />,  color: "text-mist",       bg: "bg-mist/10",       border: "border-mist/20",          path: "/marketplace?eudr_dds_ready=true" },
        { label: "Green Passport",   value: eudrReady, icon: <Coffee size={16} />,       color: "text-sage",       bg: "bg-sage/10",       border: "border-sage/20",          path: "/marketplace" },
        { label: "Regions",          value: 7,         icon: <TrendingUp size={16} />,   color: "text-gold",       bg: "bg-gold/10",       border: "border-gold/20",          path: "/marketplace" },
      ]
    : [
        { label: "Total Lots",         value: total,       icon: <Package size={16} />,      color: "text-cream",      bg: "bg-cream/5",       border: "border-border",           path: "/lots" },
        { label: "EUDR Ready",         value: eudrReady,   icon: <ShieldCheck size={16} />,  color: "text-mist",       bg: "bg-mist/10",       border: "border-mist/20",          path: "/lots" },
        { label: "Export Ready",       value: exportReady, icon: <TrendingUp size={16} />,   color: "text-gold",       bg: "bg-gold/10",       border: "border-gold/20",          path: "/lots" },
        { label: "Pending Compliance", value: pending,     icon: <AlertTriangle size={16} />, color: "text-terracotta", bg: "bg-terracotta/10", border: "border-terracotta/20",    path: "/lots" },
      ];

  const quickActions: Record<string, { label: string; path: string; icon: React.ReactNode; primary?: boolean }[]> = {
    admin:    [
      { label: "Register New Lot",   path: "/lots/new",    icon: <Plus size={14} />,      primary: true },
      { label: "Browse All Lots",    path: "/lots",         icon: <Package size={14} />    },
      { label: "View Marketplace",   path: "/marketplace",  icon: <Coffee size={14} />     },
    ],
    exporter: [
      { label: "Register New Lot",   path: "/lots/new",    icon: <Plus size={14} />,      primary: true },
      { label: "View My Lots",       path: "/lots",         icon: <Package size={14} />    },
    ],
    buyer:    [
      { label: "Browse Marketplace", path: "/marketplace",  icon: <Coffee size={14} />,    primary: true },
    ],
    farmer:   [
      { label: "My Farm Profile",    path: "/farm",         icon: <Coffee size={14} />,    primary: true },
    ],
    qgrader:  [
      { label: "Lots to Cup",        path: "/lots",         icon: <Package size={14} />,   primary: true },
    ],
  };

  const actions = quickActions[role] || quickActions.exporter;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-light text-cream mb-1">{greeting()}</h1>
          <p className="font-mono text-2xs text-cream/30 tracking-widest uppercase">
            Bunna Bridge Operations · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <RoleBadge role={role} />
      </div>

      {/* Stat cards */}
      {role !== "farmer" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(stat => (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className={`card p-5 text-left hover:border-border-strong transition-all duration-200 group ${stat.border}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-8 h-8 rounded-sm ${stat.bg} border ${stat.border} flex items-center justify-center`}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
                <ArrowRight size={12} className="text-cream/20 group-hover:text-cream/50 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className={`font-display text-4xl font-light ${stat.color} mb-1 leading-none`}>
                {stat.value}
              </p>
              <p className="font-mono text-2xs text-cream/35 tracking-wider uppercase">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Quick actions + Recent lots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="card p-5">
          <p className="card-title">Quick Actions</p>
          <div className="space-y-2">
            {actions.map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-xs tracking-wide transition-all ${
                  action.primary
                    ? "bg-terracotta/15 border border-terracotta/30 text-terracotta hover:bg-terracotta/25"
                    : "bg-transparent border border-border text-cream/50 hover:text-cream hover:border-border-strong"
                }`}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
                <ArrowRight size={11} className="ml-auto opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent lots */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="card-title mb-0">Recent Lots</p>
            <button
              onClick={() => navigate("/lots")}
              className="font-mono text-2xs text-amber hover:text-gold transition-colors"
            >
              View all →
            </button>
          </div>
          {data && data.results.length > 0 ? (
            <div className="space-y-2">
              {data.results.slice(0, 5).map(lot => (
                <div
                  key={lot.id}
                  onClick={() => navigate(`/lots/${lot.id}`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm border border-transparent hover:border-border hover:bg-white/3 cursor-pointer transition-all group"
                >
                  <div className="w-6 h-6 rounded-sm bg-terracotta/10 border border-terracotta/20 flex items-center justify-center shrink-0">
                    <Coffee size={10} className="text-terracotta/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-cream truncate">{lot.name}</p>
                    <p className="font-mono text-2xs text-cream/30">{lot.lot_id} · {lot.region}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {lot.sca_score && (
                      <p className="font-mono text-xs text-gold">{lot.sca_score} pts</p>
                    )}
                    <p className="font-mono text-2xs text-cream/30">{lot.grade}</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${lot.export_ready ? "bg-mist" : lot.eudr_dds_ready ? "bg-gold" : "bg-terracotta/50"}`} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package size={24} className="text-cream/15 mb-2" />
              <p className="font-mono text-xs text-cream/25">No lots yet</p>
              <button
                onClick={() => navigate("/lots/new")}
                className="font-mono text-2xs text-amber hover:text-gold mt-2 transition-colors"
              >
                Register first lot →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Farmer stub */}
      {role === "farmer" && (
        <div className="card p-5 border-mist/15">
          <p className="font-mono text-2xs text-mist tracking-widest uppercase mb-3">Farm Status</p>
          <p className="font-mono text-xs text-cream/30">Farm profile and lot history — coming soon.</p>
        </div>
      )}
    </PageWrapper>
  );
}
