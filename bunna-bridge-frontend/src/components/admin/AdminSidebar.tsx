import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Package, GitBranch, Inbox, FlaskConical,
  ShoppingBag, TrendingUp, Heart, Sprout, Map as MapIcon, Settings,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import type { ReactNode } from "react";
import { AT } from "../../styles/adminTokens";
import BrandMark from "../site/BrandMark";

interface NavItem { label: string; path: string; icon: ReactNode; }
interface NavGroup { title: string; items: NavItem[]; }

/** Real, role-scoped back-office navigation. */
function groupsFor(role: string | undefined): NavGroup[] {
  const s = 16;
  const operations: Record<string, NavItem[]> = {
    admin: [
      { label: "Lots", path: "/lots", icon: <Package size={s} /> },
      { label: "Pipeline", path: "/pipeline", icon: <GitBranch size={s} /> },
      { label: "Lot Map", path: "/map", icon: <MapIcon size={s} /> },
      { label: "Offers", path: "/offers", icon: <Inbox size={s} /> },
      { label: "Samples", path: "/samples", icon: <FlaskConical size={s} /> },
      { label: "Marketplace", path: "/marketplace", icon: <ShoppingBag size={s} /> },
    ],
    exporter: [
      { label: "Lots", path: "/lots", icon: <Package size={s} /> },
      { label: "Pipeline", path: "/pipeline", icon: <GitBranch size={s} /> },
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
    { title: "Overview", items: [{ label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={s} /> }] },
    { title: "Operations", items: operations[role ?? "exporter"] ?? operations.exporter },
    { title: "Account", items: [{ label: "Settings", path: "/settings", icon: <Settings size={s} /> }] },
  ];
}

interface AdminSidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AdminSidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: AdminSidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const groups = groupsFor(user?.role);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const go = (path: string) => { navigate(path); onMobileClose(); };

  return (
    <>
      <style>{`
        .ab-sidebar { position: fixed; left: 0; top: 0; height: 100vh; z-index: 60;
          width: ${collapsed ? AT.spacing.sidebarCollapsedW : AT.spacing.sidebarW};
          background: ${AT.color.sidebarBg}; border-right: 1px solid ${AT.color.sidebarBorder};
          display: flex; flex-direction: column; transition: width 0.18s ease; overflow: hidden; }
        @media (max-width: 860px) {
          .ab-sidebar { transform: translateX(-100%); width: ${AT.spacing.sidebarW} !important; transition: transform 0.2s ease; }
          .ab-sidebar.open { transform: translateX(0); }
          .ab-collapse-btn { display: none !important; }
          .ab-mobile-close { display: flex !important; }
        }
      `}</style>

      <aside className={`ab-sidebar${mobileOpen ? " open" : ""}`}>
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", height: AT.spacing.topbarH, flexShrink: 0,
          padding: collapsed ? "0" : "0 18px", justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: `1px solid ${AT.color.sidebarBorder}`,
        }}>
          <div onClick={() => go("/dashboard")} style={{ cursor: "pointer", display: "flex" }}>
            <BrandMark wordmark={!collapsed} onDark size={26} />
          </div>
          <button
            className="ab-mobile-close"
            onClick={onMobileClose}
            style={{ display: "none", marginLeft: "auto", background: "none", border: "none", color: AT.color.sidebarText, cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {groups.map((group) => (
            <div key={group.title} style={{ marginBottom: "18px" }}>
              {!collapsed && (
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: AT.color.sidebarText, opacity: 0.6, margin: "0 0 6px", padding: "0 10px" }}>
                  {group.title}
                </p>
              )}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {group.items.map((item) => {
                  const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                  const hovered = hoveredPath === item.path;
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => go(item.path)}
                        onMouseEnter={() => setHoveredPath(item.path)}
                        onMouseLeave={() => setHoveredPath(null)}
                        title={collapsed ? item.label : undefined}
                        style={{
                          width: "100%", background: active ? AT.color.sidebarActive : hovered ? AT.color.sidebarHover : "transparent",
                          border: "none", borderRadius: AT.radius.sm, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: "10px",
                          minHeight: "34px", padding: collapsed ? "8px" : "7px 10px",
                          justifyContent: collapsed ? "center" : "flex-start",
                          fontFamily: AT.font.sans, fontSize: AT.fontSize.sm, fontWeight: active ? 600 : 400,
                          color: active ? AT.color.sidebarTextActive : hovered ? AT.color.sidebarTextHover : AT.color.sidebarText,
                          marginBottom: "1px", transition: "background 0.12s, color 0.12s",
                        }}
                      >
                        <span style={{ color: active ? AT.color.primary : "inherit", flexShrink: 0, display: "inline-flex" }}>{item.icon}</span>
                        {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          className="ab-collapse-btn"
          onClick={() => onCollapse(!collapsed)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            padding: "12px", background: "none", border: "none", borderTop: `1px solid ${AT.color.sidebarBorder}`,
            color: AT.color.sidebarText, cursor: "pointer", fontFamily: AT.font.sans, fontSize: "0.78rem",
          }}
        >
          {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /> Collapse</>}
        </button>
      </aside>
    </>
  );
}
