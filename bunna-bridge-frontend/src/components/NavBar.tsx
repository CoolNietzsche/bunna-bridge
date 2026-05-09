import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import RoleBadge from "./RoleBadge";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();

  const role = user?.role ?? "exporter";

  const allLinks = [
    { label: "Dashboard",   path: "/dashboard",   roles: ["admin","exporter","buyer","farmer","qgrader"] },
    { label: "Lots",        path: "/lots",         roles: ["admin","exporter","qgrader"] },
    { label: "Marketplace", path: "/marketplace",  roles: ["buyer"] },
    { label: "My Farm",     path: "/farm",         roles: ["farmer"] },
  ];

  const links = allLinks.filter(l => l.roles.includes(role));

  const s = {
    nav:    { background: "#2C1810", borderBottom: "1px solid rgba(201,149,42,0.15)", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px", position: "fixed" as const, top: 0, left: 0, right: 0, zIndex: 100 },
    logo:   { fontFamily: "serif", fontSize: "1.3rem", fontWeight: 300, color: "#F5EDD8", cursor: "pointer" },
    sub:    { fontFamily: "monospace", fontSize: "0.5rem", color: "#D4824A", letterSpacing: "0.15em", marginLeft: "0.5rem" },
    links:  { display: "flex", gap: "2rem", alignItems: "center" },
    link:   (active: boolean) => ({
      fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.15em",
      textTransform: "uppercase" as const, cursor: "pointer", transition: "color 0.2s",
      color: active ? "#D4824A" : "rgba(245,237,216,0.5)",
      borderBottom: active ? "1px solid #D4824A" : "1px solid transparent",
      paddingBottom: "2px",
    }),
    right:  { display: "flex", alignItems: "center", gap: "1rem" },
    user:   { fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.3)", letterSpacing: "0.05em" },
    logout: { background: "none", border: "1px solid rgba(193,68,14,0.4)", borderRadius: "2px", padding: "0.35rem 0.9rem", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#C1440E", cursor: "pointer" },
  };

  return (
    <nav style={s.nav}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
        <span style={s.logo} onClick={() => navigate("/dashboard")}>Bunna Bridge</span>
        <span style={s.sub}>ቡና ብሪጅ</span>
      </div>

      <div style={s.links}>
        {links.map(l => (
          <span key={l.path}
            style={s.link(location.pathname.startsWith(l.path))}
            onClick={() => navigate(l.path)}>
            {l.label}
          </span>
        ))}
      </div>

      <div style={s.right}>
        {user && (
          <span style={s.user}>
            {user.first_name || user.email.split("@")[0]}
          </span>
        )}
        {user && <RoleBadge role={user.role} />}
        <button style={s.logout} onClick={logout}>Sign out</button>
      </div>
    </nav>
  );
}
