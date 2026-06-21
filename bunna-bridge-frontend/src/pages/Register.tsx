import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";
import { Coffee } from "lucide-react";

const ROLES = [
  { value: "exporter", label: "Exporter",  desc: "I export Ethiopian coffee internationally" },
  { value: "buyer",    label: "Buyer",      desc: "I source and roast specialty coffee" },
  { value: "farmer",   label: "Farmer",     desc: "I grow coffee in Ethiopia" },
  { value: "qgrader",  label: "Q-Grader",   desc: "I cup and grade coffee professionally" },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "", username: "", password: "", password2: "",
    first_name: "", last_name: "", role: "exporter",
    company_name: "", phone: "", country: "",
  });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password2) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      await register(form);
      navigate("/login?registered=1");
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string[]> } };
      if (e.response?.data) {
        const msgs = Object.entries(e.response.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        setError(msgs);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally { setLoading(false); }
  };

  const inp = {
    width: "100%", background: "rgba(245,237,216,0.04)",
    border: "1px solid rgba(245,237,216,0.1)", borderRadius: "3px",
    padding: "9px 12px", color: "#F5EDD8",
    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem",
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.15s", marginBottom: "12px",
  };

  const lbl = {
    display: "block", fontFamily: "DM Mono, monospace",
    fontSize: "0.58rem", letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "rgba(245,237,216,0.4)", marginBottom: "5px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1A0F07", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <Coffee size={18} color="#C1440E" />
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.75rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 4px" }}>
            Beersheba
          </h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: 0 }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: "#2C1810", border: "1px solid rgba(201,149,42,0.12)", borderRadius: "6px", padding: "28px" }}>

          {/* Role selector */}
          <p style={{ ...lbl, marginBottom: "10px" }}>I am a...</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "8px", marginBottom: "20px" }}>
            {ROLES.map(r => (
              <div key={r.value}
                onClick={() => set("role", r.value)}
                style={{
                  padding: "12px", borderRadius: "4px", cursor: "pointer",
                  border: `1px solid ${form.role === r.value ? "rgba(193,68,14,0.4)" : "rgba(245,237,216,0.08)"}`,
                  background: form.role === r.value ? "rgba(193,68,14,0.08)" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: form.role === r.value ? "#C1440E" : "rgba(245,237,216,0.5)", marginBottom: "3px" }}>
                  {r.label}
                </span>
                <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: "rgba(245,237,216,0.3)", lineHeight: 1.4 }}>
                  {r.desc}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "3px", padding: "10px 14px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#C1440E", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0 12px" }}>
            <div><label style={lbl}>First Name</label><input style={inp} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Abebe" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} /></div>
            <div><label style={lbl}>Last Name</label><input style={inp} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Girma" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} /></div>
          </div>

          <label style={lbl}>Email *</label>
          <input style={inp} type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} />

          <label style={lbl}>Username *</label>
          <input style={inp} required value={form.username} onChange={e => set("username", e.target.value)} placeholder="username" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} />

          <label style={lbl}>
            {form.role === "buyer" ? "Company / Roastery Name" : form.role === "exporter" ? "Export Company Name" : form.role === "farmer" ? "Cooperative / Farm Name" : "Organization"}
          </label>
          <input style={inp} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. Nordic Roasters" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0 12px" }}>
            <div><label style={lbl}>Country</label><input style={inp} value={form.country} onChange={e => set("country", e.target.value)} placeholder="Ethiopia" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} /></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+251..." onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0 12px" }}>
            <div><label style={lbl}>Password *</label><input style={inp} type="password" required value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} /></div>
            <div><label style={lbl}>Confirm Password *</label><input style={inp} type="password" required value={form.password2} onChange={e => set("password2", e.target.value)} placeholder="Repeat password" onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")} onBlur={e => (e.target.style.borderColor = "rgba(245,237,216,0.1)")} /></div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: "100%", background: loading ? "rgba(193,68,14,0.5)" : "#C1440E",
            border: "none", borderRadius: "3px", padding: "11px", marginTop: "4px",
            color: "white", fontFamily: "Instrument Sans, sans-serif",
            fontSize: "0.9rem", fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "rgba(245,237,216,0.35)", marginTop: "16px" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#D4824A", textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
