import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle } from "lucide-react";
import logoFull from "../assets/logo-full.png";

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
    width: "100%", background: "#FFFFFF",
    border: "1px solid rgba(28,28,26,0.15)", borderRadius: "4px",
    padding: "10px 14px", color: "#1C1C1A",
    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem",
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F0", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img src={logoFull} alt="Beersheba" style={{ height: "52px", marginBottom: "12px" }} />
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.35)", margin: 0 }}>
            Ethiopian Coffee Export Platform
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.08)", borderRadius: "8px", boxShadow: "0 4px 24px rgba(28,28,26,0.1)", padding: "28px" }}>
          <h2 style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "1.05rem", fontWeight: 500, color: "#1C1C1A", margin: "0 0 20px" }}>
            Sign in to your account
          </h2>
          {params.get("registered") && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#E8F2EC", border: "1px solid rgba(27,77,53,0.2)", borderRadius: "4px", padding: "10px 14px", marginBottom: "16px" }}>
              <CheckCircle size={14} color="#1B4D35" />
              <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#1B4D35" }}>Account created. Sign in below.</span>
            </div>
          )}
          {error && (
            <div style={{ background: "#FDECEA", border: "1px solid rgba(192,57,43,0.25)", borderRadius: "4px", padding: "10px 14px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#C0392B", marginBottom: "16px" }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(28,28,26,0.45)", marginBottom: "6px" }}>
                Email
              </label>
              <input style={inp} type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                onFocus={e => { e.target.style.borderColor = "#1B4D35"; e.target.style.boxShadow = "0 0 0 3px rgba(27,77,53,0.08)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(28,28,26,0.15)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(28,28,26,0.45)", marginBottom: "6px" }}>
                Password
              </label>
              <input style={inp} type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                onFocus={e => { e.target.style.borderColor = "#1B4D35"; e.target.style.boxShadow = "0 0 0 3px rgba(27,77,53,0.08)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(28,28,26,0.15)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              width: "100%", background: loading ? "rgba(27,77,53,0.6)" : "#1B4D35",
              border: "none", borderRadius: "4px", padding: "12px",
              color: "white", fontFamily: "Instrument Sans, sans-serif",
              fontSize: "0.9rem", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#163D2A"; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#1B4D35"; }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "rgba(28,28,26,0.4)", margin: "16px 0 0" }}>
            No account?{" "}
            <Link to="/register" style={{ color: "#1B4D35", textDecoration: "none", fontWeight: 500 }}>Create one →</Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.07)", borderRadius: "6px", padding: "16px", marginTop: "12px", boxShadow: "0 1px 3px rgba(28,28,26,0.04)" }}>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,28,26,0.3)", margin: "0 0 10px" }}>
            Demo Accounts
          </p>
          {demoAccounts.map(({ role, email: e, pw }) => (
            <div key={role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(28,28,26,0.35)" }}>{role}</span>
              <span
                onClick={() => { setEmail(e); setPassword(pw); }}
                style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "#1B4D35", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                title="Click to autofill"
              >
                {e}
              </span>
            </div>
          ))}
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.2)", margin: "8px 0 0" }}>
            Click any email to autofill credentials
          </p>
        </div>

        <p style={{ textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.25)", letterSpacing: "0.1em", margin: "16px 0 0" }}>
          Secure Ethiopian coffee export compliance
        </p>
      </div>
    </div>
  );
}
