import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Contours } from "./marketing";

// EUDR application dates for coffee, Regulation (EU) 2023/1115 as amended by (EU) 2025/2650.
const LARGE = new Date("2026-12-30T00:00:00Z");
const SMALL = new Date("2027-06-30T00:00:00Z");

function daysUntil(d: Date) {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/** Countdown strip to the EUDR application date. Switches wording once a date has passed. */
export default function EudrDeadline() {
  const toLarge = daysUntil(LARGE);
  const toSmall = daysUntil(SMALL);
  const target = toLarge > 0 ? { days: toLarge, who: "large and medium EU operators", when: "30 December 2026" }
    : toSmall > 0 ? { days: toSmall, who: "micro and small EU operators", when: "30 June 2027" } : null;

  return (
    <div className="mk-deadline">
      <Contours style={{ top: "-60%", right: "-8%", width: 420 }} />
      {target ? (
        <div className="mk-deadline-count" aria-label={`${target.days} days until EUDR applies`}>
          <span className="mk-deadline-num">{target.days}</span>
          <span className="mk-deadline-unit">days<br />to go</span>
        </div>
      ) : (
        <span className="mk-deadline-num" style={{ fontSize: "2.4rem" }}>In force</span>
      )}
      <div style={{ position: "relative" }}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.82rem", fontWeight: 600, color: "#7EE0A8", letterSpacing: "0.01em" }}>
          EU Deforestation Regulation
        </p>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.2rem, 2.2vw, 1.6rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2, marginTop: 6 }}>
          {target
            ? <>From {target.when}, {target.who} can only place coffee on the EU market with plot-level proof that it is deforestation-free.</>
            : <>Every coffee placed on the EU market now needs plot-level proof that it is deforestation-free.</>}
        </p>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.92rem", color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
          Ethiopia is rated standard risk, so EU buyers need full due diligence for every Ethiopian lot. No geolocation, no sale.
        </p>
      </div>
      <Link to="/eudr" className="mk-btn mk-btn-light" style={{ position: "relative" }}>
        Read the EUDR guide <ChevronRight size={17} aria-hidden />
      </Link>
    </div>
  );
}
