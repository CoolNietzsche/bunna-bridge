import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import RoleBadge from "../components/RoleBadge";
import {
  Package, ShieldCheck, TrendingUp, AlertTriangle,
  ArrowRight, Plus, Leaf
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
        { label: "Available Lots",   value: total,     icon: <Package size={16} />,     positive: true,  path: "/marketplace" },
        { label: "EUDR Verified",    value: eudrReady, icon: <ShieldCheck size={16} />, positive: true,  path: "/marketplace?eudr_dds_ready=true" },
        { label: "Green Passport",   value: eudrReady, icon: <Leaf size={16} />,        positive: true,  path: "/marketplace" },
        { label: "Regions",          value: 7,         icon: <TrendingUp size={16} />,  positive: true,  path: "/marketplace" },
      ]
    : [
        { label: "Total Lots",         value: total,       icon: <Package size={16} />,       positive: true,  path: "/lots" },
        { label: "EUDR Ready",         value: eudrReady,   icon: <ShieldCheck size={16} />,   positive: true,  path: "/lots" },
        { label: "Export Ready",       value: exportReady, icon: <TrendingUp size={16} />,    positive: true,  path: "/lots" },
        { label: "Pending Compliance", value: pending,     icon: <AlertTriangle size={16} />, positive: false, path: "/lots" },
      ];

  const quickActions: Record<string, { label: string; path: string; icon: React.ReactNode; primary?: boolean }[]> = {
    admin:    [
      { label: "Register New Lot",   path: "/lots/new",    icon: <Plus size={14} />,      primary: true },
      { label: "Browse All Lots",    path: "/lots",         icon: <Package size={14} />    },
      { label: "View Marketplace",   path: "/marketplace",  icon: <Leaf size={14} />       },
    ],
    exporter: [
      { label: "Register New Lot",   path: "/lots/new",    icon: <Plus size={14} />,      primary: true },
      { label: "View My Lots",       path: "/lots",         icon: <Package size={14} />    },
    ],
    buyer:    [
      { label: "Browse Marketplace", path: "/marketplace",  icon: <Leaf size={14} />,      primary: true },
    ],
    farmer:   [
      { label: "My Farm Profile",    path: "/farm",         icon: <Leaf size={14} />,      primary: true },
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
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.85rem", fontWeight: 400, color: "#1C1C1A", margin: "0 0 4px", lineHeight: 1.2 }}>
            {greeting()}
          </h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.35)", margin: 0 }}>
            Beersheba Operations · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
              className="card p-5 text-left transition-all duration-200 group"
              style={{ cursor: "pointer", border: "1px solid rgba(28,28,26,0.08)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(28,28,26,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(28,28,26,0.14)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(28,28,26,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(28,28,26,0.08)"; }}
            >
              <div className="flex items-center justify-between mb-4">
                <div style={{
                  width: "32px", height: "32px", borderRadius: "4px", flexShrink: 0,
                  background: stat.positive ? "#E8F2EC" : "#FDECEA",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: stat.positive ? "#1B4D35" : "#C0392B" }}>{stat.icon}</span>
                </div>
                <ArrowRight size={12} style={{ color: "rgba(28,28,26,0.2)", transition: "all 0.15s" }} />
              </div>
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2.5rem", fontWeight: 300, color: stat.positive ? "#1B4D35" : "#C0392B", margin: "0 0 4px", lineHeight: 1 }}>
                {stat.value}
              </p>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(28,28,26,0.4)", margin: 0 }}>
                {stat.label}
              </p>
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
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 12px", borderRadius: "4px", cursor: "pointer",
                  fontFamily: "DM Mono, monospace", fontSize: "0.72rem", letterSpacing: "0.04em",
                  transition: "all 0.12s",
                  background: action.primary ? "#1B4D35" : "transparent",
                  border: action.primary ? "1px solid #1B4D35" : "1px solid rgba(28,28,26,0.1)",
                  color: action.primary ? "#FFFFFF" : "rgba(28,28,26,0.55)",
                }}
                onMouseEnter={e => {
                  if (action.primary) { (e.currentTarget as HTMLElement).style.background = "#163D2A"; }
                  else { (e.currentTarget as HTMLElement).style.color = "#1C1C1A"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(28,28,26,0.2)"; }
                }}
                onMouseLeave={e => {
                  if (action.primary) { (e.currentTarget as HTMLElement).style.background = "#1B4D35"; }
                  else { (e.currentTarget as HTMLElement).style.color = "rgba(28,28,26,0.55)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(28,28,26,0.1)"; }
                }}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
                <ArrowRight size={11} style={{ marginLeft: "auto", opacity: 0.5 }} />
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
              style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#7B4B2A", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }}
            >
              View all →
            </button>
          </div>
          {data && data.results.length > 0 ? (
            <div className="space-y-1">
              {data.results.slice(0, 5).map(lot => (
                <div
                  key={lot.id}
                  onClick={() => navigate(`/lots/${lot.id}`)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 12px", borderRadius: "4px",
                    border: "1px solid transparent", cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#F7F5F0"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(28,28,26,0.08)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
                >
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "4px", flexShrink: 0,
                    background: "#E8F2EC", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Leaf size={10} style={{ color: "#1B4D35" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "#1C1C1A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lot.name}</p>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.35)", margin: 0 }}>{lot.lot_id} · {lot.region}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {lot.sca_score && (
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#7B4B2A", margin: 0 }}>{lot.sca_score} pts</p>
                    )}
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(28,28,26,0.35)", margin: 0 }}>{lot.grade}</p>
                  </div>
                  <div style={{
                    width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                    background: lot.export_ready ? "#1B4D35" : lot.eudr_dds_ready ? "#7B4B2A" : "#C0392B",
                  }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center" }}>
              <Package size={24} style={{ color: "rgba(28,28,26,0.15)", marginBottom: "8px" }} />
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "rgba(28,28,26,0.3)", margin: "0 0 8px" }}>No lots yet</p>
              <button
                onClick={() => navigate("/lots/new")}
                style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#1B4D35", background: "none", border: "none", cursor: "pointer" }}
              >
                Register first lot →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Farmer stub */}
      {role === "farmer" && (
        <div className="card p-5" style={{ borderColor: "rgba(27,77,53,0.15)" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1B4D35", margin: "0 0 8px" }}>Farm Status</p>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "rgba(28,28,26,0.35)", margin: 0 }}>Farm profile and lot history — coming soon.</p>
        </div>
      )}
    </PageWrapper>
  );
}
