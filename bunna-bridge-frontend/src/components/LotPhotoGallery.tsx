import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { getMediaUrl } from "../api/docs";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

interface Props {
  photos: string[];
  alt: string;
}

export default function LotPhotoGallery({ photos, alt }: Props) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const urls = photos.map((p) => getMediaUrl(p) ?? p);
  const count = urls.length;

  const next = useCallback(() => setActive((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, next, prev]);

  if (count === 0) return null;

  return (
    <div style={{ ...AC.card, overflow: "hidden", marginBottom: "20px" }}>
      <button
        onClick={() => setLightboxOpen(true)}
        aria-label="Open photo in full screen"
        style={{
          position: "relative", display: "block", width: "100%", aspectRatio: "16 / 9",
          padding: 0, border: "none", overflow: "hidden", cursor: "zoom-in",
          background: AT.color.surfaceSecondary,
        }}
      >
        <img
          src={urls[active]}
          alt={`${alt} — photo ${active + 1} of ${count}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <span style={{
          position: "absolute", top: "14px", right: "14px",
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 12px", borderRadius: AT.radius.pill,
          background: "rgba(26,35,50,0.62)", color: "#ffffff",
          fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500,
        }}>
          <Maximize2 size={12} /> {count} photo{count > 1 ? "s" : ""}
        </span>
      </button>

      {count > 1 && (
        <div style={{ display: "flex", gap: "8px", padding: "12px", overflowX: "auto" }}>
          {urls.map((u, i) => (
            <button
              key={u}
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              style={{
                flexShrink: 0, width: "64px", height: "64px", padding: 0, cursor: "pointer",
                borderRadius: AT.radius.sm, overflow: "hidden",
                border: `2px solid ${i === active ? AT.color.primary : "transparent"}`,
                opacity: i === active ? 1 : 0.65,
              }}
            >
              <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} photos`}
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(15,20,28,0.94)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
          }}
        >
          <button onClick={() => setLightboxOpen(false)} aria-label="Close" style={closeBtnStyle}>
            <X size={18} />
          </button>

          <span style={{
            position: "absolute", top: "24px", left: "24px",
            fontFamily: AT.font.sans, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)",
          }}>
            {active + 1} / {count}
          </span>

          {count > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous photo" style={navBtnStyle("left")}>
                <ChevronLeft size={22} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next photo" style={navBtnStyle("right")}>
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <img
            src={urls[active]}
            alt={`${alt} — photo ${active + 1} of ${count}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(90vw, 1100px)", maxHeight: "82vh", objectFit: "contain", borderRadius: AT.radius.md }}
          />
        </div>
      )}
    </div>
  );
}

const closeBtnStyle: CSSProperties = {
  position: "absolute", top: "18px", right: "18px",
  width: "38px", height: "38px", borderRadius: "50%", border: "none",
  background: "rgba(255,255,255,0.1)", color: "#ffffff",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

function navBtnStyle(side: "left" | "right"): CSSProperties {
  return {
    position: "absolute", top: "50%", [side]: "18px", transform: "translateY(-50%)",
    width: "44px", height: "44px", borderRadius: "50%", border: "none",
    background: "rgba(255,255,255,0.1)", color: "#ffffff",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };
}
