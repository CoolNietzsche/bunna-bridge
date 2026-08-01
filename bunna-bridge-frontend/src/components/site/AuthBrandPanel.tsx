import { Link } from "react-router-dom";
import { T } from "../../styles/tokens";
import BrandMark from "./BrandMark";

const VALUES = ["Traceable to origin", "EUDR · ECTA · NBE compliance", "Direct from Ethiopian producers"];

/** Editorial brand panel shown beside the auth forms (hidden on mobile). */
export default function AuthBrandPanel() {
  return (
    <div
      className="bb-authpanel"
      style={{
        position: "relative", overflow: "hidden",
        background: "linear-gradient(150deg, #1C5540 0%, #123A2E 55%, #0C2A21 100%)",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "40px",
      }}
    >
      <svg viewBox="0 0 400 400" aria-hidden style={{ position: "absolute", right: "-60px", top: "-40px", width: "380px", opacity: 0.12 }}>
        <path d="M200 40c80-16 128 32 120 112-72 0-128-40-120-112Z" fill="#FFFFFF" />
        <path d="M220 120 300 60" stroke="#FFFFFF" strokeWidth="2" />
      </svg>

      <Link to="/" style={{ textDecoration: "none", position: "relative" }}>
        <BrandMark onDark />
      </Link>

      <div style={{ position: "relative" }}>
        <h2 style={{ fontFamily: T.font.display, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.12, margin: 0, letterSpacing: "-0.01em" }}>
          Specialty Ethiopian coffee,<br />traceable to the tree.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
          {VALUES.map((v) => (
            <span key={v} style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: T.font.sans, fontSize: "0.95rem", color: "rgba(255,255,255,0.86)" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: T.color.mint }} /> {v}
            </span>
          ))}
        </div>
      </div>

      <p style={{ position: "relative", fontFamily: T.font.mono, fontSize: "0.62rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", margin: 0 }}>
        A demonstration platform · Bunna Bridge
      </p>
    </div>
  );
}
