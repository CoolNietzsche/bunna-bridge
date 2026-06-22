import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";
import logoFull from "../assets/logo-full.png";

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
    width: "100%", background: "#FFFFFF",
    border: "1px solid rgba(28,28,26,0.15)", borderRadius: "4px",
    padding: "9px 12px", color: "#1C1C1A",
    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem",
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.15s, box-shadow 0.15s", marginBottom: "12px",
  };

  const lbl = {
    display: "block", fontFamily: "DM Mono, monospace",
    fontSize: "0.58rem", letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "rgba(28,28,26,0.45)", marginBottom: "5px",
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#1B4D35";
    e.target.style.boxShadow = "0 0 0 3px rgba(27,77,53,0.08)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(28,28,26,0.15)";
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F0", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img src={logoFull} alt="Beersheba" style={{ height: "44px", marginBottom: "12px" }} />
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.35)", margin: 0 }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: "#FFFFFF", border: "1px solid rgba(28,28,26,0.08)", borderRadius: "8px", boxShadow: "0 4px 24px rgba(28,28,26,0.08)", padding: "28px" }}>

          {/* Role selector */}
          <p style={{ ...lbl, marginBottom: "10px" }}>I am a...</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "8px", marginBottom: "20px" }}>
            {ROLES.map(r => (
              <div key={r.value}
                onClick={() => set("role", r.value)}
                style={{
                  padding: "12px", borderRadius: "4px", cursor: "pointer",
                  border: `1px solid ${form.role === r.value ? "rgba(27,77,53,0.35)" : "rgba(28,28,26,0.1)"}`,
                  background: form.role === r.value ? "#E8F2EC" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ display: "block", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: form.role === r.value ? "#1B4D35" : "rgba(28,28,26,0.45)", marginBottom: "3px" }}>
                  {r.label}
                </span>
                <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: "rgba(28,28,26,0.4)", lineHeight: 1.4 }}>
                  {r.desc}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: "#FDECEA", border: "1px solid rgba(192,57,43,0.25)", borderRadius: "4px", padding: "10px 14px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#C0392B", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0 12px" }}>
            <div><label style={lbl}>First Name</label><input style={inp} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Abebe" onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label style={lbl}>Last Name</label><input style={inp} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Girma" onFocus={onFocus} onBlur={onBlur} /></div>
          </div>
          <label style={lbl}>Email *</label>
          <input style={inp} type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" onFocus={onFocus} onBlur={onBlur} />
          <label style={lbl}>Username *</label>
          <input style={inp} required value={form.username} onChange={e => set("username", e.target.value)} placeholder="username" onFocus={onFocus} onBlur={onBlur} />
          <label style={lbl}>
            {form.role === "buyer" ? "Company / Roastery Name" : form.role === "exporter" ? "Export Company Name" : form.role === "farmer" ? "Cooperative / Farm Name" : "Organization"}
          </label>
          <input style={inp} value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="e.g. Nordic Roasters" onFocus={onFocus} onBlur={onBlur} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0 12px" }}>
            <div><label style={lbl}>Country</label><input style={inp} value={form.country} onChange={e => set("country", e.target.value)} placeholder="Ethiopia" onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+251..." onFocus={onFocus} onBlur={onBlur} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0 12px" }}>
            <div><label style={lbl}>Password *</label><input style={inp} type="password" required value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min 8 characters" onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label style={lbl}>Confirm Password *</label><input style={inp} type="password" required value={form.password2} onChange={e => set("password2", e.target.value)} placeholder="Repeat password" onFocus={onFocus} onBlur={onBlur} /></div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: "100%", background: loading ? "rgba(27,77,53,0.6)" : "#1B4D35",
            border: "none", borderRadius: "4px", padding: "12px", marginTop: "4px",
            color: "white", fontFamily: "Instrument Sans, sans-serif",
            fontSize: "0.9rem", fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#163D2A"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#1B4D35"; }}
          >
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "rgba(28,28,26,0.4)", marginTop: "16px" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#1B4D35", textDecoration: "none", fontWeight: 500 }}>Sign in →</Link>
        </p>
        <p style={{ textAlign: "center", fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(28,28,26,0.25)", letterSpacing: "0.1em", margin: "16px 0 0" }}>
          Secure Ethiopian coffee export compliance
        </p>
      </div>
    </div>
  );
}
