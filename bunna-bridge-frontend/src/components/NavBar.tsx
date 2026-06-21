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
    nav:    { background: "#FFFFFF", borderBottom: "1px solid rgba(28,28,26,0.08)", boxShadow: "0 1px 0 rgba(28,28,26,0.06)", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px", position: "fixed" as const, top: 0, left: 0, right: 0, zIndex: 100 },
    logo:   { fontFamily: "Playfair Display, serif", fontSize: "1.1rem", fontWeight: 500, color: "#1B4D35", cursor: "pointer", letterSpacing: "0.01em" },
    links:  { display: "flex", gap: "2rem", alignItems: "center" },
    link:   (active: boolean) => ({
      fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.12em",
      textTransform: "uppercase" as const, cursor: "pointer", transition: "color 0.15s",
      color: active ? "#1B4D35" : "rgba(28,28,26,0.45)",
      borderBottom: active ? "1px solid #1B4D35" : "1px solid transparent",
      paddingBottom: "2px",
    }),
    right:  { display: "flex", alignItems: "center", gap: "1rem" },
    user:   { fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(28,28,26,0.4)", letterSpacing: "0.05em" },
    logout: { background: "none", border: "1px solid rgba(27,77,53,0.3)", borderRadius: "4px", padding: "0.35rem 0.9rem", fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#1B4D35", cursor: "pointer" },
  };

  return (
    <nav style={s.nav}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={s.logo} onClick={() => navigate("/dashboard")}>Beersheba</span>
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
        {user && <span style={s.user}>{user.first_name || user.email.split("@")[0]}</span>}
        {user && <RoleBadge role={user.role} />}
        <button style={s.logout} onClick={logout}>Sign out</button>
      </div>
    </nav>
  );
}
