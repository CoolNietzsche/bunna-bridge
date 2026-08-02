import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, ArrowRight } from "lucide-react";
import AuthBrandPanel from "../components/site/AuthBrandPanel";
import { T } from "../styles/tokens";
import { CS } from "../styles/components";

const DEMO = [
  { role: "Admin", email: "admin@bunnabridge.com", pw: "BunnaAdmin2026!" },
  { role: "Exporter", email: "dawit@addiscoffee.et", pw: "Bunna2026!" },
  { role: "Buyer", email: "sarah@nordicros.de", pw: "Bunna2026!" },
  { role: "Roaster", email: "james@brooklynroastery.com", pw: "Bunna2026!" },
  { role: "Farmer", email: "abebe@kochere.et", pw: "Bunna2026!" },
  { role: "Q-Grader", email: "tigist@scaethiopia.et", pw: "Bunna2026!" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = params.get("next");
  const dest = next ? decodeURIComponent(next) : "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login({ email, password });
      navigate(dest);
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bb-auth" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr 1fr", background: T.color.paper }}>
      <AuthBrandPanel />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <Link to="/" style={{ fontFamily: T.font.sans, fontSize: "0.82rem", color: T.color.textMuted, textDecoration: "none" }}>← Back home</Link>

          <h1 style={{ fontFamily: T.font.display, fontSize: "2rem", fontWeight: 400, color: T.color.ink, margin: "20px 0 4px", letterSpacing: "-0.01em" }}>Welcome back</h1>
          <p style={{ fontFamily: T.font.sans, fontSize: "0.95rem", color: T.color.textMuted, margin: "0 0 24px" }}>Sign in to your Beersheba account.</p>

          {params.get("registered") && (
            <div style={{ ...CS.successBanner, marginBottom: "16px" }}>
              <CheckCircle size={15} /> Account created — sign in below.
            </div>
          )}
          {next && !params.get("registered") && (
            <div style={{ ...CS.cardInner, marginBottom: "16px", fontFamily: T.font.sans, fontSize: "0.82rem", color: T.color.textMuted }}>
              Sign in to continue.
            </div>
          )}
          {error && <div style={{ ...CS.errorBanner, marginBottom: "16px" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label style={CS.label}>Email</label>
              <input style={CS.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div style={{ marginBottom: "22px" }}>
              <label style={CS.label}>Password</label>
              <input style={CS.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} style={{ ...CS.btnPrimary, width: "100%", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: "center", fontFamily: T.font.sans, fontSize: "0.875rem", color: T.color.textMuted, margin: "18px 0 0" }}>
            No account? <Link to="/register" style={{ color: T.color.forest, textDecoration: "none", fontWeight: 600 }}>Create one</Link>
          </p>

          {/* Demo accounts */}
          <div style={{ ...CS.cardInner, marginTop: "22px", padding: "16px" }}>
            <p style={{ fontFamily: T.font.mono, fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase", color: T.color.textFaint, margin: "0 0 10px" }}>Demo accounts — click to autofill</p>
            {DEMO.map(({ role, email: e, pw }) => (
              <button key={role} type="button" onClick={() => { setEmail(e); setPassword(pw); }} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", padding: "5px 0" }}>
                <span style={{ fontFamily: T.font.mono, fontSize: "0.66rem", color: T.color.textMuted }}>{role}</span>
                <span style={{ fontFamily: T.font.mono, fontSize: "0.66rem", color: T.color.forest }}>{e}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 860px){ .bb-auth { grid-template-columns: 1fr !important; } .bb-auth > .bb-authpanel { display: none !important; } }`}</style>
    </div>
  );
}
