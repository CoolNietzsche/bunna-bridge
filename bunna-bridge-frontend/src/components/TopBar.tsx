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

  const initials = user ? (user.first_name?.[0] || user.email[0]).toUpperCase() : "?";
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.email?.split("@")[0] ?? "";

  return (
    <>
      <style>{`
        .bb-topbar {
          position: fixed; top: 0; right: 0;
          left: ${sidebarWidth}px;
          height: 56px;
          background: rgba(30,18,8,0.96);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(245,237,216,0.07);
          display: flex; align-items: center;
          padding: 0 20px; gap: 12px; z-index: 40;
          transition: left 0.25s ease;
        }
        @media (max-width: 768px) {
          .bb-topbar { left: 0 !important; }
          .bb-search-wrap { display: none !important; }
          .bb-hamburger { display: flex !important; }
          .bb-username { display: none !important; }
          .bb-notif-dropdown { width: calc(100vw - 32px) !important; right: -60px !important; }
        }
        .tb-icon-btn {
          width: 32px; height: 32px; border-radius: 3px;
          border: none; background: transparent;
          display: flex; align-items: center; justify-content: center;
          color: rgba(245,237,216,0.35); cursor: pointer;
          transition: all 0.12s; position: relative;
        }
        .tb-icon-btn:hover {
          background: rgba(245,237,216,0.05);
          color: rgba(245,237,216,0.6);
        }
        .tb-dropdown {
          position: absolute; right: 0; top: 44px;
          background: #1E1208;
          border: 1px solid rgba(245,237,216,0.09);
          border-radius: 6px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.7);
          z-index: 100; overflow: hidden;
        }
        .tb-menu-item {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 9px 16px; border: none; background: transparent;
          color: rgba(245,237,216,0.45); cursor: pointer;
          font-family: "Instrument Sans", sans-serif; font-size: 0.825rem;
          transition: all 0.12s; text-align: left;
        }
        .tb-menu-item:hover {
          background: rgba(245,237,216,0.04);
          color: rgba(245,237,216,0.8);
        }
        .tb-avatar {
          border-radius: 3px; flex-shrink: 0;
          background: rgba(193,68,14,0.12);
          border: 1px solid rgba(193,68,14,0.25);
          display: flex; align-items: center; justify-content: center;
          font-family: "DM Mono", monospace;
          color: #C1440E; font-weight: 500;
        }
      `}</style>

      <header className="bb-topbar">
        {/* Hamburger mobile */}
        <button className="tb-icon-btn bb-hamburger" onClick={onHamburger}
          style={{ display: "none" }}>
          <Menu size={17} />
        </button>

        {/* Search */}
        <div className="bb-search-wrap" style={{
          display: "flex", alignItems: "center", gap: "8px",
          flex: 1, maxWidth: "340px",
          background: "rgba(245,237,216,0.04)",
          border: "1px solid rgba(245,237,216,0.07)",
          borderRadius: "3px", padding: "6px 12px",
        }}>
          <Search size={12} color="rgba(245,237,216,0.2)" />
          <input
            style={{
              background: "transparent", outline: "none", border: "none",
              color: "#F5EDD8", fontFamily: "Instrument Sans, sans-serif",
              fontSize: "0.8125rem", width: "100%",
            }}
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
            <button className="tb-icon-btn" onClick={() => { setNotif(o => !o); setProfile(false); }}>
              <Bell size={15} />
              <span style={{
                position: "absolute", top: "7px", right: "7px",
                width: "5px", height: "5px", borderRadius: "50%",
                background: "#C1440E",
              }} />
            </button>
            {notifOpen && (
              <div className="tb-dropdown bb-notif-dropdown" style={{ width: "300px" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "11px 16px",
                  borderBottom: "1px solid rgba(245,237,216,0.07)",
                }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.575rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)" }}>
                    Notifications
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.575rem", color: "#C1440E", cursor: "pointer" }}>
                    Mark all read
                  </span>
                </div>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    padding: "11px 16px",
                    borderBottom: "1px solid rgba(245,237,216,0.04)",
                    cursor: "pointer", transition: "background 0.12s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,237,216,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: n.color, marginTop: "6px", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", color: "rgba(245,237,216,0.65)", margin: "0 0 2px", lineHeight: 1.4 }}>{n.text}</p>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.575rem", color: "rgba(245,237,216,0.22)", margin: 0 }}>{n.time}</p>
                    </div>
                  </div>
                ))}
                <div style={{ padding: "10px 16px", textAlign: "center" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.575rem", color: "rgba(245,237,216,0.25)", cursor: "pointer" }}>
                    View all notifications
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "18px", background: "rgba(245,237,216,0.07)", margin: "0 4px" }} />

          {/* Profile */}
          <div style={{ position: "relative" }} ref={profileRef}>
            <button
              onClick={() => { setProfile(o => !o); setNotif(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "5px 8px", borderRadius: "3px", border: "none",
                background: "transparent", cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,237,216,0.04)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div className="tb-avatar" style={{ width: "26px", height: "26px", fontSize: "0.6rem" }}>
                {initials}
              </div>
              <span className="bb-username" style={{
                fontFamily: "Instrument Sans, sans-serif",
                fontSize: "0.8125rem", color: "rgba(245,237,216,0.75)",
              }}>
                {displayName}
              </span>
              <ChevronDown size={11} color="rgba(245,237,216,0.25)"
                style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {profileOpen && (
              <div className="tb-dropdown" style={{ width: "240px" }}>
                {/* User info */}
                <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(245,237,216,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div className="tb-avatar" style={{ width: "34px", height: "34px", fontSize: "0.75rem" }}>
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#F5EDD8", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {displayName}
                      </p>
                      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.575rem", color: "rgba(245,237,216,0.25)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  {user && <RoleBadge role={user.role} />}
                </div>

                {/* Menu items */}
                <div style={{ padding: "4px 0" }}>
                  <button className="tb-menu-item" onClick={() => { navigate("/profile"); setProfile(false); }}>
                    <User size={13} style={{ color: "rgba(245,237,216,0.25)", flexShrink: 0 }} />
                    Profile
                  </button>
                  <button className="tb-menu-item" onClick={() => { navigate("/settings"); setProfile(false); }}>
                    <Settings size={13} style={{ color: "rgba(245,237,216,0.25)", flexShrink: 0 }} />
                    Settings
                  </button>
                </div>

                <div style={{ borderTop: "1px solid rgba(245,237,216,0.07)", padding: "4px 0" }}>
                  <button className="tb-menu-item" onClick={logout}
                    style={{ color: "rgba(193,68,14,0.7)" }}>
                    <LogOut size={13} style={{ flexShrink: 0 }} />
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
