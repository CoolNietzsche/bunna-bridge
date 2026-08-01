import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { getNotifications, getUnreadCount, markAllRead, markRead } from "../../api/notifications";
import { Search, Bell, Menu, ChevronDown, LogOut, Settings as SettingsIcon, CheckCheck } from "lucide-react";
import { AT } from "../../styles/adminTokens";
import { initials } from "../../lib/utils";

interface AdminTopBarProps {
  onMobileMenu: () => void;
}

export default function AdminTopBar({ onMobileMenu }: AdminTopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const { data: unread } = useQuery({ queryKey: ["notif-unread"], queryFn: getUnreadCount, refetchInterval: 60000 });
  const { data: notifications } = useQuery({ queryKey: ["notifications"], queryFn: getNotifications, enabled: notifOpen });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notif-unread"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
  const markOneMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notif-unread"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });

  const openNotif = (link: string, id: number) => {
    markOneMutation.mutate(id);
    setNotifOpen(false);
    if (link) navigate(link);
  };

  return (
    <header style={{
      height: AT.spacing.topbarH, display: "flex", alignItems: "center", gap: "16px",
      padding: "0 20px", background: AT.color.surface, borderBottom: `1px solid ${AT.color.border}`,
      position: "sticky", top: 0, zIndex: 40,
    }}>
      <button className="ab-hamburger" onClick={onMobileMenu} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: AT.color.textSecondary }}>
        <Menu size={20} />
      </button>

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.md, padding: "7px 12px", flex: "0 1 320px", minWidth: "160px" }}>
        <Search size={15} color={AT.color.textMuted} />
        <input
          placeholder="Search lots, offers…"
          style={{ background: "transparent", border: "none", outline: "none", fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text, width: "100%" }}
        />
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            style={{ position: "relative", width: "36px", height: "36px", borderRadius: AT.radius.md, border: `1px solid ${AT.color.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: AT.color.textSecondary }}
          >
            <Bell size={16} />
            {!!unread?.count && (
              <span style={{ position: "absolute", top: "4px", right: "4px", width: "8px", height: "8px", borderRadius: "999px", background: AT.color.red, border: `1.5px solid ${AT.color.surface}` }} />
            )}
          </button>
          {notifOpen && (
            <div style={{ position: "absolute", right: 0, top: "44px", width: "340px", maxHeight: "420px", overflowY: "auto", background: AT.color.surface, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.lg, boxShadow: AT.shadow.hover, zIndex: 50 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${AT.color.borderLight}` }}>
                <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", fontWeight: 600, color: AT.color.text }}>Notifications</span>
                {!!unread?.count && (
                  <button onClick={() => markAllMutation.mutate()} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.primaryDark }}>
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              {notifications && notifications.length > 0 ? notifications.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotif(n.link, n.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: n.is_read ? "transparent" : AT.color.primaryLight, border: "none", borderBottom: `1px solid ${AT.color.borderLight}`, cursor: "pointer" }}
                >
                  <p style={{ margin: 0, fontFamily: AT.font.sans, fontSize: "0.8rem", fontWeight: n.is_read ? 400 : 600, color: AT.color.text }}>{n.title}</p>
                  <p style={{ margin: "2px 0 0", fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</p>
                </button>
              )) : (
                <p style={{ padding: "24px 14px", textAlign: "center", fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textMuted, margin: 0 }}>No notifications yet.</p>
              )}
            </div>
          )}
        </div>

        {/* User */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setUserOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px 4px 4px", borderRadius: AT.radius.md }}>
            <span style={{ width: "30px", height: "30px", borderRadius: "999px", background: AT.color.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: AT.font.sans, fontSize: "0.7rem", fontWeight: 600 }}>
              {initials(user?.first_name, user?.last_name, (user?.email?.[0] ?? "?").toUpperCase())}
            </span>
            <ChevronDown size={14} color={AT.color.textMuted} className="ab-user-chevron" />
          </button>
          {userOpen && (
            <div style={{ position: "absolute", right: 0, top: "44px", width: "200px", background: AT.color.surface, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.lg, boxShadow: AT.shadow.hover, overflow: "hidden", zIndex: 50 }} onMouseLeave={() => setUserOpen(false)}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${AT.color.borderLight}` }}>
                <p style={{ margin: 0, fontFamily: AT.font.sans, fontSize: "0.82rem", fontWeight: 600, color: AT.color.text }}>
                  {user?.first_name ? `${user.first_name} ${user.last_name ?? ""}`.trim() : user?.email}
                </p>
                <p style={{ margin: "2px 0 0", fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, textTransform: "capitalize" }}>{user?.role}</p>
              </div>
              <button onClick={() => { setUserOpen(false); navigate("/settings"); }} style={menuItemStyle}><SettingsIcon size={14} /> Settings</button>
              <button onClick={() => { setUserOpen(false); logout(); }} style={{ ...menuItemStyle, color: AT.color.red }}><LogOut size={14} /> Sign out</button>
            </div>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 860px){ .ab-hamburger { display: flex !important; } }`}</style>
    </header>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px",
  background: "transparent", border: "none", cursor: "pointer", fontFamily: AT.font.sans,
  fontSize: "0.82rem", color: AT.color.text, textAlign: "left",
};
