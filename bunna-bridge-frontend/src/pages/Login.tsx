import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  const autofill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  const s = {
    page:     { minHeight: "100vh", background: "#1A0F07", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "sans-serif" },
    wrap:     { width: "100%", maxWidth: "420px" },
    title:    { fontSize: "3rem", fontWeight: 300, color: "#F5EDD8", textAlign: "center" as const, marginBottom: "0.25rem" },
    sub:      { fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.2em", color: "#D4824A", textAlign: "center" as const, textTransform: "uppercase" as const, marginBottom: "2.5rem" },
    card:     { background: "#2C1810", border: "1px solid rgba(201,149,42,0.2)", borderRadius: "4px", padding: "2rem" },
    label:    { display: "block", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)", marginBottom: "0.4rem" },
    input:    { width: "100%", background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.75rem 1rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" as const, marginBottom: "1.25rem" },
    btn:      { width: "100%", background: "#C1440E", border: "none", borderRadius: "2px", padding: "0.875rem", color: "white", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer" },
    err:      { background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#C1440E", marginBottom: "1rem" },
    success:  { background: "rgba(74,124,89,0.15)", border: "1px solid rgba(74,124,89,0.3)", borderRadius: "2px", padding: "0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#A8C5A0", marginBottom: "1rem" },
    divider:  { textAlign: "center" as const, fontFamily: "monospace", fontSize: "0.62rem", color: "rgba(245,237,216,0.2)", margin: "1.5rem 0 0" },
    demos:    { background: "rgba(245,237,216,0.03)", border: "1px solid rgba(245,237,216,0.08)", borderRadius: "3px", padding: "1rem", marginTop: "1rem", fontFamily: "monospace", fontSize: "0.6rem" },
    demotitle:{ color: "rgba(245,237,216,0.3)", letterSpacing: "0.15em", textTransform: "uppercase" as const, display: "block", marginBottom: "0.7rem" },
    demorow:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" },
    demorole: { color: "rgba(245,237,216,0.25)" },
    demoemail:{ color: "rgba(245,237,216,0.5)", cursor: "pointer", textDecoration: "underline" as const, textDecorationStyle: "dotted" as const },
    hint:     { color: "rgba(245,237,216,0.2)", marginTop: "0.5rem", fontSize: "0.55rem", display: "block" },
  };

  const demoAccounts = [
    { role: "Admin",    email: "admin@bunnabridge.com", pw: "BunnaAdmin2026!" },
    { role: "Exporter", email: "dawit@addiscoffee.et",  pw: "Bunna2026!" },
    { role: "Buyer",    email: "sarah@nordicros.de",    pw: "Bunna2026!" },
    { role: "Farmer",   email: "abebe@kochere.et",      pw: "Bunna2026!" },
    { role: "Q-Grader", email: "tigist@scaethiopia.et", pw: "Bunna2026!" },
  ];

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <h1 style={s.title}>Bunna Bridge</h1>
        <p style={s.sub}>ቡና ብሪጅ</p>

        <form onSubmit={handleSubmit} style={s.card}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 300, color: "#F5EDD8", margin: "0 0 1.5rem" }}>
            Sign in
          </h2>

          {params.get("registered") && (
            <div style={s.success}>✓ Account created. Sign in below.</div>
          )}
          {error && <div style={s.err}>{error}</div>}

          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <button
            style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <p style={s.divider}>
          No account?{" "}
          <Link to="/register" style={{ color: "#D4824A", textDecoration: "none" }}>
            Create one →
          </Link>
        </p>

        <div style={s.demos}>
          <span style={s.demotitle}>Demo Accounts</span>
          {demoAccounts.map(({ role, email: e, pw }) => (
            <div key={role} style={s.demorow}>
              <span style={s.demorole}>{role}</span>
              <span
                style={s.demoemail}
                onClick={() => autofill(e, pw)}
                title="Click to autofill"
              >
                {e}
              </span>
            </div>
          ))}
          <span style={s.hint}>Click any email to autofill credentials</span>
        </div>
      </div>
    </div>
  );
}
