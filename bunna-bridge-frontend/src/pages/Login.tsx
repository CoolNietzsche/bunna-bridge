import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Coffee, CheckCircle } from "lucide-react";

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  };

  const demoAccounts = [
    { role: "Admin",    email: "admin@bunnabridge.com", pw: "BunnaAdmin2026!" },
    { role: "Exporter", email: "dawit@addiscoffee.et",  pw: "Bunna2026!" },
    { role: "Buyer",    email: "sarah@nordicros.de",    pw: "Bunna2026!" },
    { role: "Farmer",   email: "abebe@kochere.et",      pw: "Bunna2026!" },
    { role: "Q-Grader", email: "tigist@scaethiopia.et", pw: "Bunna2026!" },
  ];

  const inp = {
    width: "100%", background: "rgba(245,237,216,0.04)",
    border: "1px solid rgba(245,237,216,0.1)", borderRadius: "3px",
    padding: "10px 14px", color: "#F5EDD8",
    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem",
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1A0F07", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "4px", background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <Coffee size={20} color="#C1440E" />
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "2rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 4px" }}>
            Bunna Bridge
          </h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: 0 }}>
            Export-Ready by Design
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#2C1810", border: "1px solid rgba(201,149,42,0.15)", borderRadius: "6px", padding: "28px" }}>
          <h2 style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "1.1rem", fontWeight: 500, color: "#F5EDD8", margin: "0 0 20px" }}>
            Sign in to your account
          </h2>

          {params.get("registered") && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(74,124,89,0.15)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "3px", padding: "10px 14px", marginBottom: "16px" }}>
              <CheckCircle size={14} color="#A8C5A0" />
              <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#A8C5A0" }}>Account created. Sign in below.</span>
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "3px", padding: "10px 14px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#C1440E", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.4)", marginBottom: "6px" }}>
                Email
              </label>
              <input style={inp} type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")}
                onBlur={e  => (e.target.style.borderColor = "rgba(245,237,216,0.1)")}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,237,216,0.4)", marginBottom: "6px" }}>
                Password
              </label>
              <input style={inp} type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")}
                onBlur={e  => (e.target.style.borderColor = "rgba(245,237,216,0.1)")}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", background: loading ? "rgba(193,68,14,0.5)" : "#C1440E",
              border: "none", borderRadius: "3px", padding: "11px",
              color: "white", fontFamily: "Instrument Sans, sans-serif",
              fontSize: "0.9rem", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "rgba(245,237,216,0.35)", margin: "16px 0 0" }}>
            No account?{" "}
            <Link to="/register" style={{ color: "#D4824A", textDecoration: "none" }}>Create one →</Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div style={{ background: "rgba(245,237,216,0.02)", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", padding: "16px", marginTop: "12px" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,237,216,0.25)", margin: "0 0 10px" }}>
            Demo Accounts
          </p>
          {demoAccounts.map(({ role, email: e, pw }) => (
            <div key={role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(245,237,216,0.25)" }}>{role}</span>
              <span
                onClick={() => { setEmail(e); setPassword(pw); }}
                style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(245,237,216,0.45)", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                title="Click to autofill"
              >
                {e}
              </span>
            </div>
          ))}
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(245,237,216,0.18)", margin: "8px 0 0" }}>
            Click any email to autofill credentials
          </p>
        </div>
      </div>
    </div>
  );
}
