import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Package, ShoppingBag, Sprout,
  ChevronLeft, ChevronRight, FileCheck,
  GitBranch, FlaskConical, ClipboardList, Settings, HelpCircle, X,
  Map as MapIcon, TrendingUp, Inbox, Heart
} from "lucide-react";
import RoleBadge from "./RoleBadge";
import logoIcon from "../assets/logo-icon.png";
import logoFull from "../assets/logo-full.png";

const NAV_ITEMS = [
  { label: "Dashboard",   path: "/dashboard",   icon: <LayoutDashboard size={15} />, roles: ["admin","exporter","buyer","farmer","qgrader"] },
  { label: "Lots",        path: "/lots",         icon: <Package size={15} />,         roles: ["admin","exporter","qgrader"] },
  { label: "Marketplace", path: "/marketplace",  icon: <ShoppingBag size={15} />,     roles: ["buyer","admin"] },
  { label: "My Farm",     path: "/farm",         icon: <Sprout size={15} />,          roles: ["farmer"] },
  { label: "Compliance",  path: "/compliance",   icon: <FileCheck size={15} />,       roles: ["admin","exporter"] },
  { label: "Lot Map",     path: "/map",          icon: <MapIcon size={16} />,         roles: ["admin","exporter","farmer"] },
  { label: "Pipeline",    path: "/pipeline",     icon: <GitBranch size={15} />,       roles: ["admin","exporter"] },
  { label: "Samples",     path: "/samples",      icon: <FlaskConical size={15} />,    roles: ["admin","exporter","buyer"] },
  { label: "Reports",     path: "/reports",      icon: <ClipboardList size={15} />,   roles: ["admin"] },
  { label: "My Offers",   path: "/buyer/offers", icon: <TrendingUp size={15} />,      roles: ["buyer"] },
  { label: "Watchlist",   path: "/buyer/watchlist", icon: <Heart size={15} />,        roles: ["buyer"] },
  { label: "Offers",      path: "/offers",       icon: <Inbox size={15} />,           roles: ["exporter","admin"] },
];

const BOTTOM_ITEMS = [
  { label: "Settings", path: "/settings", icon: <Settings size={15} /> },
  { label: "Help",     path: "/help",     icon: <HelpCircle size={15} /> },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role ?? "exporter";
  const visibleItems = NAV_ITEMS.filter(i => i.roles.includes(role));

  return (
    <>
      <style>{`
        .bb-sidebar {
          position: fixed; left: 0; top: 0; height: 100vh;
          width: ${collapsed ? "64px" : "240px"};
          background: #1B4D35;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column;
          transition: width 0.25s ease;
          z-index: 50; overflow: hidden;
        }
        @media (max-width: 768px) {
          .bb-sidebar { transform: translateX(-100%) !important; width: 240px !important; }
          .bb-sidebar.open { transform: translateX(0) !important; }
          .bb-collapse-btn { display: none !important; }
          .bb-close-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .bb-close-btn { display: none !important; }
        }
        .nav-btn {
          width: 100%; display: flex; align-items: center;
          gap: 10px; padding: 7px 10px; border-radius: 3px;
          border: 1px solid transparent;
          background: transparent; cursor: pointer;
          transition: all 0.12s;
          font-family: "Instrument Sans", sans-serif;
          font-size: 0.8125rem;
          justify-content: ${collapsed ? "center" : "flex-start"};
          white-space: nowrap; overflow: hidden;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.07); }
        .nav-btn.active {
          background: rgba(255,255,255,0.13);
          border-left: 3px solid #A8D5BC !important;
          color: #FFFFFF !important;
        }
        .nav-btn.active .nav-icon { color: #A8D5BC !important; }
        .nav-label { overflow: hidden; text-overflow: ellipsis; }
      `}</style>

      <aside className={`bb-sidebar${mobileOpen ? " open" : ""}`}>

        {/* Logo — image-only, never paired with hardcoded brand text */}
        <div style={{
          display: "flex", alignItems: "center", height: "60px", flexShrink: 0,
          padding: collapsed ? "0 16px" : "0 14px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          {collapsed ? (
            <img
              src={logoIcon}
              alt="Beersheba"
              style={{ width: "32px", height: "32px", flexShrink: 0, objectFit: "contain" }}
            />
          ) : (
            <img
              src={logoFull}
              alt="Beersheba"
              style={{ height: "28px", width: "auto", flexShrink: 0, objectFit: "contain" }}
            />
          )}

          <button className="bb-close-btn" onClick={onMobileClose} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "rgba(255,255,255,0.4)", cursor: "pointer",
            padding: "4px", display: "none", alignItems: "center",
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {!collapsed && (
            <span style={{
              fontFamily: "DM Mono, monospace", fontSize: "0.55rem",
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.25)", padding: "0 6px",
              marginBottom: "6px", display: "block",
            }}>
              Navigation
            </span>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
            {visibleItems.map(item => {
              const active = location.pathname === item.path ||
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <button
                    className={`nav-btn${active ? " active" : ""}`}
                    style={{ color: active ? "#FFFFFF" : "rgba(255,255,255,0.6)" }}
                    title={collapsed ? item.label : undefined}
                    onClick={() => { navigate(item.path); onMobileClose(); }}
                  >
                    <span className="nav-icon" style={{
                      flexShrink: 0,
                      color: active ? "#A8D5BC" : "rgba(255,255,255,0.4)",
                    }}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: "20px" }}>
            {!collapsed && (
              <span style={{
                fontFamily: "DM Mono, monospace", fontSize: "0.55rem",
                letterSpacing: "0.2em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)", padding: "0 6px",
                marginBottom: "6px", display: "block",
              }}>
                Support
              </span>
            )}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1px" }}>
              {BOTTOM_ITEMS.map(item => (
                <li key={item.path}>
                  <button
                    className="nav-btn"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                    title={collapsed ? item.label : undefined}
                    onClick={() => { navigate(item.path); onMobileClose(); }}
                  >
                    <span style={{ flexShrink: 0, color: "rgba(255,255,255,0.3)" }}>{item.icon}</span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* User strip */}
        {user && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: collapsed ? "12px 8px" : "12px",
            flexShrink: 0,
            display: "flex", alignItems: "center", gap: "10px",
            justifyContent: collapsed ? "center" : "flex-start",
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "3px", flexShrink: 0,
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "DM Mono, monospace", fontSize: "0.6rem",
              color: "#FFFFFF", fontWeight: 500,
            }}>
              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontFamily: "Instrument Sans, sans-serif",
                  fontSize: "0.8rem", color: "#FFFFFF",
                  margin: "0 0 3px", overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email}
                </p>
                <RoleBadge role={user.role} />
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle */}
        <button
          className="bb-collapse-btn"
          onClick={() => onCollapse(!collapsed)}
          style={{
            position: "absolute", right: "-10px", top: "76px",
            width: "20px", height: "20px", borderRadius: "50%",
            background: "#163D2A", border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FFFFFF", cursor: "pointer", zIndex: 10,
          }}
        >
          {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
        </button>
      </aside>
    </>
  );
}
