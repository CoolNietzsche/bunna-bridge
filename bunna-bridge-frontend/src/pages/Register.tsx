import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";

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

  const s = {
    page:   { minHeight: "100vh", background: "#1A0F07", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "sans-serif" },
    wrap:   { width: "100%", maxWidth: "560px" },
    title:  { fontSize: "2.5rem", fontWeight: 300, color: "#F5EDD8", textAlign: "center" as const, marginBottom: "0.25rem" },
    sub:    { fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.2em", color: "#D4824A", textAlign: "center" as const, textTransform: "uppercase" as const, marginBottom: "2rem" },
    card:   { background: "#2C1810", border: "1px solid rgba(201,149,42,0.15)", borderRadius: "4px", padding: "2rem" },
    label:  { display: "block", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)", marginBottom: "0.4rem" },
    input:  { width: "100%", background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" as const, marginBottom: "1rem" },
    grid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" },
    err:    { background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#C1440E", marginBottom: "1rem" },
    btn:    { width: "100%", background: "#C1440E", border: "none", borderRadius: "2px", padding: "0.875rem", color: "white", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer", marginTop: "0.5rem" },
    roles:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" },
    role:   (active: boolean) => ({ padding: "0.75rem", borderRadius: "2px", cursor: "pointer", border: `1px solid ${active ? "rgba(193,68,14,0.5)" : "rgba(245,237,216,0.1)"}`, background: active ? "rgba(193,68,14,0.1)" : "transparent", transition: "all 0.15s" }),
    rlabel: (active: boolean) => ({ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: active ? "#C1440E" : "rgba(245,237,216,0.5)", display: "block", marginBottom: "0.2rem" }),
    rdesc:  { fontFamily: "monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)", lineHeight: 1.4 },
    footer: { textAlign: "center" as const, fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.3)", marginTop: "1.5rem" },
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <h1 style={s.title}>Bunna Bridge</h1>
        <p style={s.sub}>Create your account</p>
        <form onSubmit={handleSubmit} style={s.card}>
          <label style={s.label}>I am a...</label>
          <div style={s.roles}>
            {ROLES.map(r => (
              <div key={r.value} style={s.role(form.role === r.value)}
                onClick={() => set("role", r.value)}>
                <span style={s.rlabel(form.role === r.value)}>{r.label}</span>
                <span style={s.rdesc}>{r.desc}</span>
              </div>
            ))}
          </div>
          {error && <div style={s.err}>{error}</div>}
          <div style={s.grid}>
            <div>
              <label style={s.label}>First Name</label>
              <input style={s.input} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Abebe" />
            </div>
            <div>
              <label style={s.label}>Last Name</label>
              <input style={s.input} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Girma" />
            </div>
          </div>
          <label style={s.label}>Email *</label>
          <input style={s.input} type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" />
          <label style={s.label}>Username *</label>
          <input style={s.input} required value={form.username} onChange={e => set("username", e.target.value)} placeholder="username" />
          <label style={s.label}>
            {form.role === "buyer" ? "Company / Roastery Name" :
             form.role === "exporter" ? "Export Company Name" :
             form.role === "farmer" ? "Cooperative / Farm Name" : "Organization"}
          </label>
          <input style={s.input} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. Nordic Roasters" />
          <div style={s.grid}>
            <div>
              <label style={s.label}>Country</label>
              <input style={s.input} value={form.country} onChange={e => set("country", e.target.value)} placeholder="Ethiopia" />
            </div>
            <div>
              <label style={s.label}>Phone</label>
              <input style={s.input} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+251..." />
            </div>
          </div>
          <div style={s.grid}>
            <div>
              <label style={s.label}>Password *</label>
              <input style={s.input} type="password" required value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div>
              <label style={s.label}>Confirm Password *</label>
              <input style={s.input} type="password" required value={form.password2} onChange={e => set("password2", e.target.value)} placeholder="Repeat password" />
            </div>
          </div>
          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>
        <p style={s.footer}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#D4824A", textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
