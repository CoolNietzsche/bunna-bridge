import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try { await login({ email, password }); navigate("/dashboard"); }
    catch { setError("Invalid credentials. Please try again."); }
    finally { setLoading(false); }
  };

  const s = {
    page:   { minHeight:"100vh", background:"#1A0F07", display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem", fontFamily:"sans-serif" },
    wrap:   { width:"100%", maxWidth:"420px" },
    title:  { fontSize:"3rem", fontWeight:300, color:"#F5EDD8", textAlign:"center" as const, marginBottom:"0.25rem" },
    sub:    { fontSize:"0.75rem", letterSpacing:"0.2em", color:"#D4824A", textAlign:"center" as const, marginBottom:"2.5rem", textTransform:"uppercase" as const },
    card:   { background:"#4A2515", border:"1px solid rgba(201,149,42,0.2)", borderRadius:"4px", padding:"2rem" },
    label:  { display:"block", fontFamily:"monospace", fontSize:"0.65rem", letterSpacing:"0.15em", textTransform:"uppercase" as const, color:"rgba(245,237,216,0.5)", marginBottom:"0.5rem" },
    input:  { width:"100%", background:"#1A0F07", border:"1px solid rgba(245,237,216,0.15)", borderRadius:"3px", padding:"0.75rem 1rem", color:"#F5EDD8", fontFamily:"monospace", fontSize:"0.875rem", outline:"none", boxSizing:"border-box" as const, marginBottom:"1.25rem" },
    btn:    { width:"100%", background:"#C1440E", border:"none", borderRadius:"3px", padding:"0.875rem", color:"white", fontFamily:"monospace", fontSize:"0.7rem", letterSpacing:"0.15em", textTransform:"uppercase" as const, cursor:"pointer" },
    err:    { background:"rgba(193,68,14,0.2)", border:"1px solid rgba(193,68,14,0.4)", borderRadius:"3px", padding:"0.75rem 1rem", fontFamily:"monospace", fontSize:"0.75rem", color:"#C1440E", marginBottom:"1rem" },
    footer: { textAlign:"center" as const, fontFamily:"monospace", fontSize:"0.6rem", color:"rgba(245,237,216,0.25)", letterSpacing:"0.1em", marginTop:"1.5rem" },
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <h1 style={s.title}>Bunna Bridge</h1>
        <p style={s.sub}>ቡና ብሪጅ</p>
        <form onSubmit={handleSubmit} style={s.card}>
          <h2 style={{ fontSize:"1.5rem", fontWeight:300, color:"#F5EDD8", marginBottom:"1.5rem", marginTop:0 }}>Sign in</h2>
          {error && <div style={s.err}>{error}</div>}
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label style={s.label}>Password</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>
        <p style={s.footer}>Bunna Bridge · EUDR 2026 Ready · Addis Ababa</p>
      </div>
    </div>
  );
}
