import { useId, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2, Send, Mail } from "lucide-react";
import axios from "axios";
import { submitLead, type LeadRole } from "../../api/leads";

const ROLES: { value: LeadRole; label: string }[] = [
  { value: "exporter", label: "Exporter" },
  { value: "cooperative", label: "Cooperative / union" },
  { value: "importer", label: "Importer" },
  { value: "roaster", label: "Roaster" },
  { value: "other", label: "Other" },
];

const VOLUMES: Record<"seller" | "buyer", string[]> = {
  seller: ["Under 1 container a year", "1–5 containers a year", "5–20 containers a year", "Over 20 containers a year", "Not exporting yet"],
  buyer: ["Under 60 bags a year", "60–300 bags a year", "1–5 containers a year", "Over 5 containers a year", "Just exploring"],
};

const CONTACT_EMAIL = "beersheba@paperless.et";

type Errors = Partial<Record<"role" | "name" | "email" | "company" | "country" | "form", string>>;

interface LeadFormProps {
  /** Preselect who is asking (e.g. "exporter" on /exporters). */
  defaultRole?: LeadRole;
  /** Button label. */
  cta?: string;
  /** Placeholder for the message box. */
  messageHint?: string;
}

/**
 * The website enquiry form. Saves to /api/v1/market/leads/, which stores the lead
 * and emails it to the team. Works without an account.
 */
export default function LeadForm({ defaultRole, cta = "Send", messageHint }: LeadFormProps) {
  const uid = useId();
  const { pathname } = useLocation();
  const [role, setRole] = useState<LeadRole | "">(defaultRole ?? "");
  const [values, setValues] = useState({ name: "", email: "", company: "", country: "", phone: "", volume: "", message: "", website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const side = role === "importer" || role === "roaster" ? "buyer" : "seller";
  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const id = (k: string) => `${uid}-${k}`;

  function validate(): Errors {
    const e: Errors = {};
    if (!role) e.role = "Choose the option that fits you best.";
    if (!values.name.trim()) e.name = "Your name, please.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) e.email = "A valid email address, please.";
    if (!values.company.trim()) e.company = "Your company or cooperative.";
    if (!values.country.trim()) e.country = "Where you are based.";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(id(Object.keys(e)[0]))?.focus();
      return;
    }
    setState("sending");
    try {
      await submitLead({ ...values, role: role as LeadRole, source: pathname.slice(0, 60) });
      setState("sent");
    } catch (err) {
      setState("idle");
      if (axios.isAxiosError(err) && err.response?.status === 400 && err.response.data) {
        const data = err.response.data as Record<string, string[]>;
        const mapped: Errors = {};
        for (const k of ["role", "name", "email", "company", "country"] as const) if (data[k]) mapped[k] = data[k][0];
        setErrors(Object.keys(mapped).length ? mapped : { form: "Please check the form and try again." });
      } else if (axios.isAxiosError(err) && err.response?.status === 429) {
        setErrors({ form: `Too many messages from this connection. Please email us at ${CONTACT_EMAIL}.` });
      } else {
        setErrors({ form: `We couldn't send that. Please try again, or email us at ${CONTACT_EMAIL}.` });
      }
    }
  }

  if (state === "sent") {
    return (
      <div role="status" style={{ textAlign: "center", padding: "36px 8px" }}>
        <span className="mk-icon mk-icon-solid" style={{ width: 56, height: 56, borderRadius: 18 }} aria-hidden><CheckCircle2 size={28} /></span>
        <h3 className="mk-h3" style={{ fontSize: "1.5rem", marginTop: 18 }}>Thank you, {values.name.trim().split(" ")[0]}.</h3>
        <p className="mk-body" style={{ marginTop: 10, maxWidth: "44ch", marginInline: "auto" }}>
          We've received your message. A member of the team will reply to <strong style={{ color: "var(--color-ink)" }}>{values.email.trim()}</strong> personally.
        </p>
      </div>
    );
  }

  const err = (k: keyof Errors) => errors[k] ? <span className="mk-err" id={id(`${k}-err`)}>{errors[k]}</span> : null;
  const aria = (k: keyof Errors) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? id(`${k}-err`) : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="mk-form">
      <fieldset className="mk-full" style={{ border: "none", margin: 0, padding: 0 }}>
        <legend className="mk-legend">I am</legend>
        <div className="mk-roles" role="radiogroup" id={id("role")} tabIndex={-1} {...aria("role")}>
          {ROLES.map((r) => (
            <label key={r.value} className="mk-role">
              <input type="radio" name={id("role-radio")} value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
        {err("role")}
      </fieldset>

      <div className="mk-field">
        <label htmlFor={id("name")}>Name</label>
        <input id={id("name")} autoComplete="name" value={values.name} onChange={set("name")} maxLength={120} {...aria("name")} />
        {err("name")}
      </div>
      <div className="mk-field">
        <label htmlFor={id("email")}>Work email</label>
        <input id={id("email")} type="email" autoComplete="email" value={values.email} onChange={set("email")} maxLength={254} {...aria("email")} />
        {err("email")}
      </div>
      <div className="mk-field">
        <label htmlFor={id("company")}>{side === "seller" ? "Company or cooperative" : "Company"}</label>
        <input id={id("company")} autoComplete="organization" value={values.company} onChange={set("company")} maxLength={160} {...aria("company")} />
        {err("company")}
      </div>
      <div className="mk-field">
        <label htmlFor={id("country")}>Country</label>
        <input id={id("country")} autoComplete="country-name" value={values.country} onChange={set("country")} maxLength={80} {...aria("country")} />
        {err("country")}
      </div>
      <div className="mk-field">
        <label htmlFor={id("phone")}>Phone or WhatsApp <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></label>
        <input id={id("phone")} type="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} maxLength={40} />
      </div>
      <div className="mk-field">
        <label htmlFor={id("volume")}>{side === "seller" ? "Export volume" : "Buying volume"} <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></label>
        <select id={id("volume")} value={values.volume} onChange={set("volume")}>
          <option value="">Choose…</option>
          {VOLUMES[side].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="mk-field mk-full">
        <label htmlFor={id("message")}>How can we help? <span style={{ fontWeight: 400, color: "var(--color-text-faint)" }}>(optional)</span></label>
        <textarea id={id("message")} value={values.message} onChange={set("message")} maxLength={4000}
          placeholder={messageHint ?? "Tell us about your coffee, your timeline, or the questions you have about EUDR."} />
      </div>
      {/* Honeypot: hidden from people and screen readers; bots fill it. */}
      <div className="mk-hp" aria-hidden>
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
      </div>

      <div className="mk-full" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px 20px", marginTop: 4 }}>
        <button type="submit" className="mk-btn mk-btn-primary" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : cta} <Send size={16} aria-hidden />
        </button>
        <span className="mk-body" style={{ fontSize: "0.84rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Mail size={14} aria-hidden /> Or email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--color-forest)" }}>{CONTACT_EMAIL}</a>
        </span>
        {errors.form && <p className="mk-err" role="alert" style={{ flexBasis: "100%", margin: 0, fontSize: "0.9rem" }}>{errors.form}</p>}
      </div>
    </form>
  );
}
