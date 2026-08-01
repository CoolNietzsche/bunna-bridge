import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Package, GitBranch, FileCheck, Inbox, FlaskConical, ClipboardList,
  ShoppingBag, TrendingUp, Heart, Sprout, Map as MapIcon, Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { T } from "../styles/tokens";

interface RailItem { label: string; path: string; icon: ReactNode; }
interface RailGroup { title: string; items: RailItem[]; }

/** Operational sub-navigation shown as a light rail on dense screens, by role. */
function groupsFor(role: string | undefined): RailGroup[] {
  const s = 15;
  const operations: Record<string, RailItem[]> = {
    admin: [
      { label: "Lots", path: "/lots", icon: <Package size={s} /> },
      { label: "Pipeline", path: "/pipeline", icon: <GitBranch size={s} /> },
      { label: "Compliance", path: "/compliance", icon: <FileCheck size={s} /> },
      { label: "Lot Map", path: "/map", icon: <MapIcon size={s} /> },
      { label: "Offers", path: "/offers", icon: <Inbox size={s} /> },
      { label: "Samples", path: "/samples", icon: <FlaskConical size={s} /> },
      { label: "Reports", path: "/reports", icon: <ClipboardList size={s} /> },
      { label: "Marketplace", path: "/marketplace", icon: <ShoppingBag size={s} /> },
    ],
    exporter: [
      { label: "Lots", path: "/lots", icon: <Package size={s} /> },
      { label: "Pipeline", path: "/pipeline", icon: <GitBranch size={s} /> },
      { label: "Compliance", path: "/compliance", icon: <FileCheck size={s} /> },
      { label: "Lot Map", path: "/map", icon: <MapIcon size={s} /> },
      { label: "Offers", path: "/offers", icon: <Inbox size={s} /> },
      { label: "Samples", path: "/samples", icon: <FlaskConical size={s} /> },
    ],
    buyer: [
      { label: "Marketplace", path: "/marketplace", icon: <ShoppingBag size={s} /> },
      { label: "My Offers", path: "/buyer/offers", icon: <TrendingUp size={s} /> },
      { label: "Watchlist", path: "/buyer/watchlist", icon: <Heart size={s} /> },
      { label: "Samples", path: "/samples", icon: <FlaskConical size={s} /> },
    ],
    farmer: [
      { label: "My Farm", path: "/farm", icon: <Sprout size={s} /> },
      { label: "Lot Map", path: "/map", icon: <MapIcon size={s} /> },
    ],
    qgrader: [{ label: "Lots to Cup", path: "/lots", icon: <Package size={s} /> }],
  };
  return [
    { title: "Operations", items: operations[role ?? "exporter"] ?? operations.exporter },
    { title: "Account", items: [{ label: "Settings", path: "/settings", icon: <Settings size={15} /> }] },
  ];
}

export default function ContextRail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const groups = groupsFor(user?.role);

  return (
    <aside style={{ position: "sticky", top: "calc(var(--header-height) + 24px)", alignSelf: "start" }}>
      {groups.map((group) => (
        <div key={group.title} style={{ marginBottom: "24px" }}>
          <p style={{ fontFamily: T.font.mono, fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: T.color.textFaint, margin: "0 0 10px", paddingLeft: "12px" }}>
            {group.title}
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
            {group.items.map((item) => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
              return (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 12px", borderRadius: T.radius.md, cursor: "pointer",
                      border: "1px solid transparent", textAlign: "left",
                      fontFamily: T.font.sans, fontSize: "0.875rem", fontWeight: active ? 600 : 500,
                      background: active ? T.color.forestLight : "transparent",
                      color: active ? T.color.forest : T.color.textMuted,
                      transition: "all 0.14s",
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = T.color.stone; e.currentTarget.style.color = T.color.ink; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.color.textMuted; } }}
                  >
                    <span style={{ color: active ? T.color.forest : T.color.textFaint, flexShrink: 0, display: "inline-flex" }}>{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
