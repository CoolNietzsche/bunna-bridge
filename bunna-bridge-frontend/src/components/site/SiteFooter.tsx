import { Link } from "react-router-dom";
import { T } from "../../styles/tokens";
import BrandMark from "./BrandMark";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Discover",
    links: [
      { label: "All coffees", to: "/marketplace" },
      { label: "By origin", to: "/marketplace?tab=origins" },
      { label: "By selection", to: "/marketplace?tab=selections" },
      { label: "EUDR-ready lots", to: "/marketplace?eudr_dds_ready=true" },
    ],
  },
  {
    title: "Origins",
    links: [
      { label: "Yirgacheffe", to: "/marketplace?origin=yirgacheffe" },
      { label: "Guji", to: "/marketplace?origin=guji" },
      { label: "Sidama", to: "/marketplace?origin=sidama" },
      { label: "Harrar", to: "/marketplace?origin=harrar" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "How it works", to: "/#how" },
      { label: "Traceability", to: "/#values" },
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/register" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: `1px solid ${T.color.border}`, background: T.color.surface, marginTop: T.spacing.section }}>
      <div className="container-editorial" style={{ paddingTop: "56px", paddingBottom: "40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.4fr) repeat(3, 1fr)", gap: "40px" }} className="bb-footer-grid">
          <div>
            <BrandMark />
            <p style={{ fontFamily: T.font.sans, fontSize: "0.9rem", lineHeight: 1.6, color: T.color.textMuted, margin: "16px 0 0", maxWidth: "34ch" }}>
              Specialty Ethiopian coffee, traceable from farm boundary to FOB — with EUDR, ECTA and NBE compliance built into every lot.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p style={{ fontFamily: T.font.mono, fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: T.color.textFaint, margin: "0 0 16px" }}>
                {col.title}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} style={{ fontFamily: T.font.sans, fontSize: "0.9rem", color: T.color.textMuted, textDecoration: "none" }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${T.color.border}`, display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: T.font.mono, fontSize: "0.68rem", color: T.color.textFaint, margin: 0 }}>
            © {new Date().getFullYear()} Beersheba · Bunna Bridge — Addis Ababa, Ethiopia
          </p>
          <p style={{ fontFamily: T.font.mono, fontSize: "0.68rem", color: T.color.textFaint, margin: 0 }}>
            A demonstration platform · not for commercial trade
          </p>
        </div>
      </div>
      <style>{`@media (max-width: 820px){ .bb-footer-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </footer>
  );
}
