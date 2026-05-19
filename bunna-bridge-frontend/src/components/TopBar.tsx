import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Search, Bell, ChevronDown, User, LogOut, Settings, Menu } from "lucide-react";
import RoleBadge from "./RoleBadge";

interface TopBarProps { sidebarWidth: number; onHamburger: () => void; }

export default function TopBar({ sidebarWidth, onHamburger }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch]       = useState("");
  const [profileOpen, setProfile] = useState(false);
  const [notifOpen, setNotif]     = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfile(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotif(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifications = [
    { id: 1, text: "Lot YRG-2025-0847 is export ready", time: "2m ago",  color: "#A8C5A0" },
    { id: 2, text: "New cupping score submitted",        time: "1h ago",  color: "#C9952A" },
    { id: 3, text: "SDM-2025-0213 missing phyto cert",   time: "3h ago",  color: "#C1440E" },
  ];

  const S = {
    header: {
      position: "fixed" as const, top: 0, left: `${sidebarWidth}px`, right: 0,
      height: "56px", background: "rgba(44,24,16,0.95)", backdropFilter: "blur(8px)",
      borderBottom: "1px solid rgba(245,237,216,0.08)",
      display: "flex", alignItems: "center", padding: "0 16px",
      gap: "12px", zIndex: 40, transition: "left 0.3s ease",
    },
    search: {
      display: "flex", alignItems: "center", gap: "8px", flex: 1, maxWidth: "360px",
      background: "#1A0F07", border: "1px solid rgba(245,237,216,0.08)",
      borderRadius: "2px", padding: "6px 12px",
    },
    searchInput: {
      background: "transparent", outline: "none", border: "none",
      color: "#F5EDD8", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", width: "100%",
    },
    iconBtn: {
      position: "relative" as const, width: "32px", height: "32px",
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: "2px", border: "none", background: "transparent",
      color: "rgba(245,237,216,0.4)", cursor: "pointer",
    },
    notifDot: {
      position: "absolute" as const, top: "6px", right: "6px",
      width: "6px", height: "6px", borderRadius: "50%", background: "#C1440E",
    },
    dropdown: {
      position: "absolute" as const, right: 0, top: "44px",
      background: "#2C1810", border: "1px solid rgba(245,237,216,0.08)",
      borderRadius: "4px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", zIndex: 100, overflow: "hidden",
    },
    profileBtn: {
      display: "flex", alignItems: "center", gap: "8px",
      padding: "6px 8px", borderRadius: "2px", border: "none",
      background: "transparent", cursor: "pointer",
    },
    avatar: (size: number) => ({
      width: `${size}px`, height: `${size}px`, borderRadius: "2px", flexShrink: 0,
      background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "DM Mono, monospace",
      fontSize: size > 24 ? "0.75rem" : "0.625rem",
      color: "#C1440E", fontWeight: 500,
    }),
    menuItem: {
      width: "100%", display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 16px", border: "none", background: "transparent",
      color: "rgba(245,237,216,0.5)", cursor: "pointer",
      fontFamily: "DM Mono, monospace", fontSize: "0.75rem",
    },
    divider: { width: "1px", height: "20px", background: "rgba(245,237,216,0.08)", margin: "0 4px" },
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .bb-topbar { left: 0 !important; }
          .bb-search-wrap { display: none !important; }
          .bb-hamburger { display: flex !important; }
          .bb-username { display: none !important; }
          .bb-notif-dropdown { width: calc(100vw - 32px) !important; right: -60px !important; }
        }
      `}</style>

      <header style={S.header} className="bb-topbar">
        {/* Hamburger — mobile only */}
        <button className="bb-hamburger" onClick={onHamburger} style={{
          ...S.iconBtn, display: "none",
        }}>
          <Menu size={18} />
        </button>

        {/* Search — hidden on mobile */}
        <div style={S.search} className="bb-search-wrap">
          <Search size={13} color="rgba(245,237,216,0.3)" />
          <input
            style={S.searchInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search lots, regions, lot ID..."
            onKeyDown={e => {
              if (e.key === "Enter" && search.trim()) {
                navigate(`/lots?search=${encodeURIComponent(search.trim())}`);
                setSearch("");
              }
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
          {/* Notifications */}
          <div style={{ position: "relative" }} ref={notifRef}>
            <button style={S.iconBtn} onClick={() => { setNotif(o => !o); setProfile(false); }}>
              <Bell size={15} />
              <span style={S.notifDot} />
            </button>
            {notifOpen && (
              <div style={{ ...S.dropdown, width: "320px" }} className="bb-notif-dropdown">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid rgba(245,237,216,0.08)" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.625rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)" }}>Notifications</span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.625rem", color: "#C1440E", cursor: "pointer" }}>Mark all read</span>
                </div>
                {notifications.map(n => (
                  <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: "1px solid rgba(245,237,216,0.05)", cursor: "pointer" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: n.color, marginTop: "5px", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "rgba(245,237,216,0.7)", margin: "0 0 2px", lineHeight: 1.5 }}>{n.text}</p>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.25)", margin: 0 }}>{n.time}</p>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "10px 16px", textAlign: "center" as const }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.625rem", color: "rgba(245,237,216,0.3)", cursor: "pointer" }}>View all notifications</span>
                </div>
              </div>
            )}
          </div>

          <div style={S.divider} />

          {/* Profile */}
          <div style={{ position: "relative" }} ref={profileRef}>
            <button style={S.profileBtn} onClick={() => { setProfile(o => !o); setNotif(false); }}>
              <div style={S.avatar(26)}>
                {user ? (user.first_name?.[0] || user.email[0]).toUpperCase() : "?"}
              </div>
              <span className="bb-username" style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#F5EDD8" }}>
                {user?.first_name || user?.email?.split("@")[0]}
              </span>
              <ChevronDown size={12} color="rgba(245,237,216,0.3)"
                style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {profileOpen && (
              <div style={{ ...S.dropdown, width: "256px", right: 0 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(245,237,216,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <div style={S.avatar(32)}>
                      {user ? (user.first_name?.[0] || user.email[0]).toUpperCase() : "?"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#F5EDD8", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {user?.first_name ? `${user.first_name} ${user?.last_name || ""}`.trim() : user?.email}
                      </p>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.3)", margin: 0 }}>{user?.email}</p>
                    </div>
                  </div>
                  {user && <RoleBadge role={user.role} />}
                  {user?.company_name && (
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.3)", margin: "6px 0 0" }}>{user.company_name}</p>
                  )}
                </div>
                <div style={{ padding: "4px 0" }}>
                  {[
                    { icon: <User size={13} />,     label: "Profile",  action: () => { navigate("/profile");  setProfile(false); } },
                    { icon: <Settings size={13} />, label: "Settings", action: () => { navigate("/settings"); setProfile(false); } },
                  ].map(item => (
                    <button key={item.label} style={S.menuItem} onClick={item.action}>
                      <span style={{ color: "rgba(245,237,216,0.3)" }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid rgba(245,237,216,0.08)", padding: "4px 0" }}>
                  <button style={{ ...S.menuItem, color: "rgba(193,68,14,0.7)" }} onClick={logout}>
                    <LogOut size={13} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
