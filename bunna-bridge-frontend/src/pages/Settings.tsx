import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMe } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import EctaDocuments from "../components/EctaDocuments";

export default function Settings() {
  const { user, logout } = useAuth();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [showLogout, setShowLogout] = useState(false);

  const cardStyle: React.CSSProperties = {
    background: "#FFFFFF",
    border: "1px solid rgba(28,28,26,0.06)",
    borderRadius: "6px",
    padding: "24px",
    marginBottom: "16px",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "DM Mono, monospace",
    fontSize: "0.56rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(28,28,26,0.3)",
    marginBottom: "4px",
    display: "block",
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: "Instrument Sans, sans-serif",
    fontSize: "0.88rem",
    color: "#1C1C1A",
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "32px 20px" }}>
      {/* Header */}
      <p style={{
        fontFamily: "Cormorant Garamond, serif",
        fontSize: "1.7rem", fontWeight: 500,
        color: "#1C1C1A", margin: "0 0 6px",
      }}>
        Account Settings
      </p>
      <p style={{
        fontFamily: "DM Mono, monospace", fontSize: "0.62rem",
        letterSpacing: "0.1em", color: "rgba(28,28,26,0.3)",
        textTransform: "uppercase", margin: "0 0 28px",
      }}>
        {me?.role?.toUpperCase()} · {me?.company_name || me?.email}
      </p>

      {/* Profile info */}
      <div style={cardStyle}>
        <p style={{
          fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "rgba(28,28,26,0.3)", margin: "0 0 16px",
        }}>
          Profile
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <span style={labelStyle}>Name</span>
            <span style={valueStyle}>
              {me?.first_name ? `${me.first_name} ${me.last_name || ""}`.trim() : "—"}
            </span>
          </div>
          <div>
            <span style={labelStyle}>Email</span>
            <span style={valueStyle}>{me?.email}</span>
          </div>
          <div>
            <span style={labelStyle}>Role</span>
            <span style={valueStyle}>{me?.role}</span>
          </div>
          <div>
            <span style={labelStyle}>Company</span>
            <span style={valueStyle}>{me?.company_name || "—"}</span>
          </div>
          <div>
            <span style={labelStyle}>Verified</span>
            <span style={{
              ...valueStyle,
              color: me?.is_verified ? "#2D7A52" : "#1B4D35",
            }}>
              {me?.is_verified ? "Verified" : "Not verified"}
            </span>
          </div>
        </div>
      </div>

      {/* ECTA license — exporters only */}
      {(user?.role === "exporter" || user?.role === "admin") && (
        <EctaDocuments />
      )}

      {/* Danger zone */}
      <div style={{
        ...cardStyle,
        borderColor: "rgba(192,57,43,0.12)",
        marginTop: "8px",
      }}>
        <p style={{
          fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "rgba(27,77,53,0.4)", margin: "0 0 14px",
        }}>
          Session
        </p>
        {!showLogout ? (
          <button
            onClick={() => setShowLogout(true)}
            style={{
              padding: "8px 18px", borderRadius: "3px",
              background: "transparent",
              border: "1px solid rgba(192,57,43,0.2)",
              color: "rgba(27,77,53,0.6)",
              fontFamily: "DM Mono, monospace", fontSize: "0.65rem",
              letterSpacing: "0.08em", cursor: "pointer",
            }}
          >
            SIGN OUT
          </button>
        ) : (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{
              fontFamily: "Instrument Sans, sans-serif",
              fontSize: "0.82rem", color: "rgba(28,28,26,0.5)",
            }}>
              Sign out of Beersheba?
            </span>
            <button
              onClick={logout}
              style={{
                padding: "6px 14px", borderRadius: "3px", border: "none",
                background: "#1B4D35", color: "#1C1C1A",
                fontFamily: "DM Mono, monospace", fontSize: "0.62rem",
                letterSpacing: "0.08em", cursor: "pointer",
              }}
            >
              CONFIRM
            </button>
            <button
              onClick={() => setShowLogout(false)}
              style={{
                padding: "6px 14px", borderRadius: "3px",
                background: "transparent",
                border: "1px solid rgba(28,28,26,0.09)",
                color: "rgba(28,28,26,0.35)",
                fontFamily: "DM Mono, monospace", fontSize: "0.62rem",
                cursor: "pointer",
              }}
            >
              CANCEL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
