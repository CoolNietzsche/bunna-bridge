import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Package, ShoppingBag, Sprout,
  ChevronLeft, ChevronRight, Coffee, FileCheck,
  ClipboardList, Settings, HelpCircle
} from "lucide-react";
import RoleBadge from "./RoleBadge";

const NAV_ITEMS = [
  { label: "Dashboard",   path: "/dashboard",  icon: <LayoutDashboard size={16} />, roles: ["admin","exporter","buyer","farmer","qgrader"] },
  { label: "Lots",        path: "/lots",        icon: <Package size={16} />,         roles: ["admin","exporter","qgrader"] },
  { label: "Marketplace", path: "/marketplace", icon: <ShoppingBag size={16} />,     roles: ["buyer","admin"] },
  { label: "My Farm",     path: "/farm",        icon: <Sprout size={16} />,          roles: ["farmer"] },
  { label: "Compliance",  path: "/compliance",  icon: <FileCheck size={16} />,       roles: ["admin","exporter"] },
  { label: "Reports",     path: "/reports",     icon: <ClipboardList size={16} />,   roles: ["admin"] },
];

const BOTTOM_ITEMS = [
  { label: "Settings", path: "/settings", icon: <Settings size={16} /> },
  { label: "Help",     path: "/help",     icon: <HelpCircle size={16} /> },
];

interface SidebarProps { collapsed: boolean; onCollapse: (v: boolean) => void; }

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role ?? "exporter";
  const visibleItems = NAV_ITEMS.filter(i => i.roles.includes(role));

  const S = {
    aside: {
      position: "fixed" as const, left: 0, top: 0, height: "100vh",
      width: collapsed ? "64px" : "260px",
      background: "#2C1810",
      borderRight: "1px solid rgba(245,237,216,0.08)",
      display: "flex", flexDirection: "column" as const,
      transition: "width 0.3s ease", zIndex: 50, overflow: "hidden",
    },
    logo: {
      display: "flex", alignItems: "center", height: "56px", flexShrink: 0,
      padding: collapsed ? "0 18px" : "0 16px",
      gap: "12px",
      borderBottom: "1px solid rgba(245,237,216,0.08)",
      justifyContent: collapsed ? "center" : "flex-start" as const,
    },
    logoIcon: {
      width: "32px", height: "32px", flexShrink: 0, borderRadius: "2px",
      background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    nav: { flex: 1, padding: "16px 8px", overflowY: "auto" as const },
    sectionLabel: {
      fontFamily: "DM Mono, monospace", fontSize: "0.625rem",
      letterSpacing: "0.2em", textTransform: "uppercase" as const,
      color: "rgba(245,237,216,0.2)", padding: "0 8px", marginBottom: "8px",
      display: "block",
    },
    navList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" as const, gap: "2px" },
    navBtn: (active: boolean) => ({
      width: "100%", display: "flex", alignItems: "center",
      gap: "12px", padding: "8px", borderRadius: "2px",
      justifyContent: collapsed ? "center" as const : "flex-start" as const,
      border: active ? "1px solid rgba(193,68,14,0.25)" : "1px solid transparent",
      background: active ? "rgba(193,68,14,0.12)" : "transparent",
      color: active ? "#C1440E" : "rgba(245,237,216,0.45)",
      cursor: "pointer", transition: "all 0.15s", fontFamily: "DM Mono, monospace",
      fontSize: "0.75rem", letterSpacing: "0.04em",
    }),
    navLabel: { overflow: "hidden", whiteSpace: "nowrap" as const },
    userStrip: {
      borderTop: "1px solid rgba(245,237,216,0.08)", padding: "12px",
      flexShrink: 0, display: "flex", alignItems: "center", gap: "10px",
    },
    avatar: {
      width: "28px", height: "28px", borderRadius: "2px", flexShrink: 0,
      background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "DM Mono, monospace", fontSize: "0.625rem", color: "#C1440E", fontWeight: 500,
    },
    collapseBtn: {
      position: "absolute" as const, right: "-12px", top: "80px",
      width: "24px", height: "24px", borderRadius: "50%",
      background: "#2C1810", border: "1px solid rgba(245,237,216,0.12)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(245,237,216,0.4)", cursor: "pointer", zIndex: 10,
    },
  };

  return (
    <aside style={S.aside}>
      {/* Logo */}
      <div style={S.logo}>
        <div style={S.logoIcon}>
          <Coffee size={14} color="#C1440E" />
        </div>
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1rem", fontWeight: 500, color: "#F5EDD8", margin: 0, lineHeight: 1 }}>
              Bunna Bridge
            </p>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.625rem", color: "#D4824A", letterSpacing: "0.2em", margin: "4px 0 0" }}>
              ቡና ብሪጅ
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={S.nav}>
        {!collapsed && <span style={S.sectionLabel}>Navigation</span>}
        <ul style={S.navList}>
          {visibleItems.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <button style={S.navBtn(active)} title={collapsed ? item.label : undefined}
                  onClick={() => navigate(item.path)}>
                  <span style={{ flexShrink: 0, color: active ? "#C1440E" : "rgba(245,237,216,0.4)" }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span style={S.navLabel}>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <div style={{ marginTop: "24px" }}>
          {!collapsed && <span style={S.sectionLabel}>Support</span>}
          <ul style={S.navList}>
            {BOTTOM_ITEMS.map(item => (
              <li key={item.path}>
                <button style={{ ...S.navBtn(false), color: "rgba(245,237,216,0.25)" }}
                  title={collapsed ? item.label : undefined}
                  onClick={() => navigate(item.path)}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={S.navLabel}>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* User strip */}
      {!collapsed && user && (
        <div style={S.userStrip}>
          <div style={S.avatar}>
            {(user.first_name?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "#F5EDD8", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email}
            </p>
            <RoleBadge role={user.role} />
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button style={S.collapseBtn} onClick={() => onCollapse(!collapsed)}>
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
