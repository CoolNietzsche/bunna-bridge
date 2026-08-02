import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon, Menu, X, ChevronDown, LogOut, Settings as SettingsIcon, LayoutDashboard } from "lucide-react";
import { T } from "../../styles/tokens";
import BrandMark from "./BrandMark";
import RoleBadge from "../RoleBadge";
import { initials } from "../../lib/utils";

interface NavLink { label: string; path: string; }

/** Primary top-nav destinations by auth state / role. */
function navLinksFor(role: string | undefined, authed: boolean): NavLink[] {
  if (!authed) {
    return [
      { label: "Marketplace", path: "/marketplace" },
      { label: "Origins", path: "/marketplace?tab=origins" },
      { label: "How it works", path: "/#how" },
    ];
  }
  switch (role) {
    case "admin":
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Marketplace", path: "/marketplace" },
        { label: "Lots", path: "/lots" },
        { label: "Pipeline", path: "/pipeline" },
        { label: "Offers", path: "/offers" },
      ];
    case "exporter":
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Lots", path: "/lots" },
        { label: "Pipeline", path: "/pipeline" },
        { label: "Offers", path: "/offers" },
        { label: "Samples", path: "/samples" },
      ];
    case "buyer":
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Marketplace", path: "/marketplace" },
        { label: "My Offers", path: "/buyer/offers" },
        { label: "Watchlist", path: "/buyer/watchlist" },
        { label: "Samples", path: "/samples" },
      ];
    case "roaster":
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Marketplace", path: "/marketplace" },
        { label: "My Roastery", path: "/roastery" },
        { label: "My Offers", path: "/buyer/offers" },
        { label: "Watchlist", path: "/buyer/watchlist" },
        { label: "Samples", path: "/samples" },
      ];
    case "farmer":
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "My Farm", path: "/farm" },
        { label: "Lot Map", path: "/map" },
      ];
    case "qgrader":
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Lots", path: "/lots" },
      ];
    default:
      return [{ label: "Dashboard", path: "/dashboard" }];
  }
}

function isActive(pathname: string, path: string): boolean {
  const base = path.split("?")[0].split("#")[0];
  if (base === "/marketplace") return pathname === "/marketplace";
  if (base === "/") return false;
  return pathname === base || pathname.startsWith(base + "/");
}

export default function SiteHeader() {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const links = navLinksFor(user?.role, isAuthenticated);
  const go = (path: string) => { setMobileOpen(false); setMenuOpen(false); navigate(path); };

  return (
    <>
      <style>{`
        .bb-hd { position: sticky; top: 0; z-index: 100;
          background: color-mix(in srgb, var(--color-paper) 82%, transparent);
          backdrop-filter: saturate(140%) blur(12px);
          border-bottom: 1px solid var(--color-border); }
        .bb-hd-inner { height: var(--header-height); display: flex; align-items: center; gap: 20px; }
        .bb-nav { display: flex; align-items: center; gap: 4px; }
        .bb-nav a { font-family: ${T.font.sans}; font-size: 0.9rem; font-weight: 500;
          color: var(--color-text-muted); text-decoration: none; padding: 8px 12px;
          border-radius: 999px; transition: all .15s; white-space: nowrap; }
        .bb-nav a:hover { color: var(--color-ink); background: var(--color-stone); }
        .bb-nav a.active { color: var(--color-forest); }
        .bb-icon-btn { display: inline-flex; align-items: center; justify-content: center;
          width: 38px; height: 38px; border-radius: 999px; border: 1px solid var(--color-border);
          background: transparent; color: var(--color-ink); cursor: pointer; transition: all .15s; }
        .bb-icon-btn:hover { background: var(--color-stone); border-color: var(--color-border-strong); }
        .bb-hamburger { display: none; }
        .bb-mobile { display: none; }
        @media (max-width: 900px) {
          .bb-nav.desktop, .bb-right .desktop-only { display: none; }
          .bb-hamburger { display: inline-flex; }
        }
        .bb-mobile.open { display: block; }
      `}</style>

      <header className="bb-hd">
        <div className="container-editorial bb-hd-inner">
          {/* Brand */}
          <Link to={isAuthenticated ? "/dashboard" : "/"} style={{ textDecoration: "none", flexShrink: 0 }} onClick={() => setMobileOpen(false)}>
            <BrandMark />
          </Link>

          {/* Desktop nav */}
          <nav className="bb-nav desktop" style={{ flex: 1 }}>
            {links.map((l) => (
              <Link key={l.path} to={l.path} className={isActive(location.pathname, l.path) ? "active" : ""}>
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="bb-right" style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
            <button className="bb-icon-btn desktop-only" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {!isAuthenticated ? (
              <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => go("/login")} style={ghostBtn}>Sign in</button>
                <button onClick={() => go("/marketplace")} style={primaryBtn}>Browse coffees</button>
              </div>
            ) : (
              <div className="desktop-only" style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px 4px 4px", borderRadius: "999px" }}
                >
                  <span style={avatar}>{initials(user?.first_name, user?.last_name, (user?.email?.[0] ?? "?").toUpperCase())}</span>
                  <ChevronDown size={15} style={{ color: T.color.textMuted }} />
                </button>
                {menuOpen && (
                  <div style={menuPanel} onMouseLeave={() => setMenuOpen(false)}>
                    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.color.border}` }}>
                      <p style={{ margin: 0, fontFamily: T.font.sans, fontSize: "0.85rem", fontWeight: 600, color: T.color.ink }}>
                        {user?.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : user?.email}
                      </p>
                      <div style={{ marginTop: "6px" }}>{user && <RoleBadge role={user.role} />}</div>
                    </div>
                    <button style={menuItem} onClick={() => go("/dashboard")}><LayoutDashboard size={15} /> Dashboard</button>
                    <button style={menuItem} onClick={() => go("/settings")}><SettingsIcon size={15} /> Settings</button>
                    <button style={{ ...menuItem, color: T.color.red }} onClick={() => { setMenuOpen(false); logout(); }}><LogOut size={15} /> Sign out</button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button className="bb-icon-btn bb-hamburger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        <div className={`bb-mobile${mobileOpen ? " open" : ""}`} style={{ borderTop: `1px solid ${T.color.border}`, background: T.color.paper }}>
          <div className="container-editorial" style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
            {links.map((l) => (
              <button key={l.path} onClick={() => go(l.path)} style={mobileItem}>{l.label}</button>
            ))}
            <div style={{ height: "1px", background: T.color.border, margin: "8px 0" }} />
            <button onClick={toggleTheme} style={mobileItem}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
            {!isAuthenticated ? (
              <>
                <button onClick={() => go("/login")} style={mobileItem}>Sign in</button>
                <button onClick={() => go("/marketplace")} style={{ ...mobileItem, color: T.color.forest, fontWeight: 600 }}>Browse coffees</button>
              </>
            ) : (
              <>
                <button onClick={() => go("/settings")} style={mobileItem}>Settings</button>
                <button onClick={() => { setMobileOpen(false); logout(); }} style={{ ...mobileItem, color: T.color.red }}>Sign out</button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "9px 18px", borderRadius: "999px", background: T.color.forest, border: `1px solid ${T.color.forest}`,
  color: "#FFFFFF", fontFamily: T.font.sans, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "9px 16px", borderRadius: "999px", background: "transparent", border: `1px solid ${T.color.borderStrong}`,
  color: T.color.ink, fontFamily: T.font.sans, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
};
const avatar: React.CSSProperties = {
  width: "34px", height: "34px", borderRadius: "999px", background: T.color.forest, color: "#FFFFFF",
  display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font.mono, fontSize: "0.72rem", fontWeight: 500,
};
const menuPanel: React.CSSProperties = {
  position: "absolute", right: 0, top: "48px", width: "220px", background: T.color.surface,
  border: `1px solid ${T.color.border}`, borderRadius: T.radius.lg, boxShadow: T.shadow.hover, overflow: "hidden", zIndex: 120,
};
const menuItem: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "transparent",
  border: "none", cursor: "pointer", fontFamily: T.font.sans, fontSize: "0.875rem", color: T.color.ink, textAlign: "left",
};
const mobileItem: React.CSSProperties = {
  width: "100%", textAlign: "left", padding: "11px 8px", background: "transparent", border: "none", cursor: "pointer",
  fontFamily: T.font.sans, fontSize: "1rem", color: T.color.ink,
};
