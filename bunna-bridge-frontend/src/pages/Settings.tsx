import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMe } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import EctaDocuments from "../components/EctaDocuments";
import AdminShell from "../components/admin/AdminShell";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

export default function Settings() {
  const { user, logout } = useAuth();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [showLogout, setShowLogout] = useState(false);

  const cardStyle: React.CSSProperties = { ...AC.card, ...AC.cardPad, marginBottom: "16px" };
  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };
  const labelStyle: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, marginBottom: "4px", display: "block" };
  const valueStyle: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.text };

  return (
    <AdminShell>
      <div style={{ maxWidth: "680px" }}>
        <div style={{ marginBottom: "20px" }}>
          <p style={AC.eyebrow}>{me?.role?.toUpperCase()} · {me?.company_name || me?.email}</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>Account Settings</h1>
        </div>

        <div style={cardStyle}>
          <p style={cardTitle}>Profile</p>
          <div className="ab-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <span style={labelStyle}>Name</span>
              <span style={valueStyle}>{me?.first_name ? `${me.first_name} ${me.last_name || ""}`.trim() : "—"}</span>
            </div>
            <div>
              <span style={labelStyle}>Email</span>
              <span style={valueStyle}>{me?.email}</span>
            </div>
            <div>
              <span style={labelStyle}>Role</span>
              <span style={{ ...valueStyle, textTransform: "capitalize" }}>{me?.role}</span>
            </div>
            <div>
              <span style={labelStyle}>Company</span>
              <span style={valueStyle}>{me?.company_name || "—"}</span>
            </div>
            <div>
              <span style={labelStyle}>Verified</span>
              <span style={{ ...valueStyle, color: me?.is_verified ? AT.color.primaryDark : AT.color.textMuted }}>
                {me?.is_verified ? "Verified" : "Not verified"}
              </span>
            </div>
          </div>
        </div>

        {(user?.role === "exporter" || user?.role === "admin") && <EctaDocuments />}

        <div style={{ ...cardStyle, borderColor: `${AT.color.red}22`, marginTop: "16px" }}>
          <p style={cardTitle}>Session</p>
          {!showLogout ? (
            <button onClick={() => setShowLogout(true)} style={{ ...AC.btnGhost, color: AT.color.red, borderColor: `${AT.color.red}33` }}>
              Sign Out
            </button>
          ) : (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>
                Sign out of Beersheba?
              </span>
              <button onClick={logout} style={{ ...AC.btnPrimary, background: AT.color.red, borderColor: AT.color.red }}>
                Confirm
              </button>
              <button onClick={() => setShowLogout(false)} style={AC.btnGhost}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 560px){ .ab-2col { grid-template-columns: 1fr !important; } }`}</style>
    </AdminShell>
  );
}
