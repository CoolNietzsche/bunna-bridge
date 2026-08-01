import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";
import { ArrowRight } from "lucide-react";
import AuthBrandPanel from "../components/site/AuthBrandPanel";
import { T } from "../styles/tokens";
import { CS } from "../styles/components";

const ROLES = [
  { value: "exporter", label: "Exporter", desc: "I export Ethiopian coffee internationally" },
  { value: "buyer", label: "Buyer", desc: "I source and roast specialty coffee" },
  { value: "farmer", label: "Farmer", desc: "I grow coffee in Ethiopia" },
  { value: "qgrader", label: "Q-Grader", desc: "I cup and grade coffee professionally" },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "", username: "", password: "", password2: "",
    first_name: "", last_name: "", role: "exporter",
    company_name: "", phone: "", country: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
        setError(Object.entries(e.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | "));
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const companyLabel = form.role === "buyer" ? "Company / roastery name"
    : form.role === "exporter" ? "Export company name"
    : form.role === "farmer" ? "Cooperative / farm name" : "Organization";

  return (
    <div className="bb-auth" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr 1fr", background: T.color.paper }}>
      <AuthBrandPanel />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: "480px" }}>
          <Link to="/" style={{ fontFamily: T.font.sans, fontSize: "0.82rem", color: T.color.textMuted, textDecoration: "none" }}>← Back home</Link>

          <h1 style={{ fontFamily: T.font.display, fontSize: "2rem", fontWeight: 400, color: T.color.ink, margin: "20px 0 4px", letterSpacing: "-0.01em" }}>Create your account</h1>
          <p style={{ fontFamily: T.font.sans, fontSize: "0.95rem", color: T.color.textMuted, margin: "0 0 24px" }}>Join the Beersheba coffee network.</p>

          {error && <div style={{ ...CS.errorBanner, marginBottom: "16px" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Role */}
            <p style={CS.label}>I am a…</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              {ROLES.map((r) => {
                const active = form.role === r.value;
                return (
                  <button type="button" key={r.value} onClick={() => set("role", r.value)} style={{
                    textAlign: "left", padding: "12px 14px", borderRadius: T.radius.md, cursor: "pointer",
                    border: `1px solid ${active ? T.color.forest : T.color.border}`,
                    background: active ? T.color.forestLight : T.color.surface, transition: "all 0.15s",
                  }}>
                    <span style={{ display: "block", fontFamily: T.font.sans, fontSize: "0.9rem", fontWeight: 600, color: active ? T.color.forest : T.color.ink, marginBottom: "2px" }}>{r.label}</span>
                    <span style={{ fontFamily: T.font.sans, fontSize: "0.75rem", color: T.color.textFaint, lineHeight: 1.4 }}>{r.desc}</span>
                  </button>
                );
              })}
            </div>

            <Row>
              <Field label="First name"><input style={CS.input} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Abebe" /></Field>
              <Field label="Last name"><input style={CS.input} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Girma" /></Field>
            </Row>

            <Field label="Email *"><input style={CS.input} type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></Field>
            <Field label="Username *"><input style={CS.input} required value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="username" /></Field>
            <Field label={companyLabel}><input style={CS.input} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="e.g. Nordic Roasters" /></Field>

            <Row>
              <Field label="Country"><input style={CS.input} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Ethiopia" /></Field>
              <Field label="Phone"><input style={CS.input} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+251…" /></Field>
            </Row>

            <Row>
              <Field label="Password *"><input style={CS.input} type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min 8 characters" /></Field>
              <Field label="Confirm password *"><input style={CS.input} type="password" required value={form.password2} onChange={(e) => set("password2", e.target.value)} placeholder="Repeat password" /></Field>
            </Row>

            <button type="submit" disabled={loading} style={{ ...CS.btnPrimary, width: "100%", marginTop: "8px", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Creating account…" : <>Create account <ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={{ textAlign: "center", fontFamily: T.font.sans, fontSize: "0.875rem", color: T.color.textMuted, margin: "18px 0 40px" }}>
            Already have an account? <Link to="/login" style={{ color: T.color.forest, textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`@media (max-width: 860px){ .bb-auth { grid-template-columns: 1fr !important; } .bb-auth > .bb-authpanel { display: none !important; } }`}</style>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: "12px" }}><label style={CS.label}>{label}</label>{children}</div>;
}
