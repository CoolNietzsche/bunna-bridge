import { T } from "../../styles/tokens";

interface BrandMarkProps {
  /** Show the "Beersheba" wordmark next to the glyph. */
  wordmark?: boolean;
  /** Glyph size in px. */
  size?: number;
  /** Render the wordmark in a light color (for dark surfaces). */
  onDark?: boolean;
}

/** The Beersheba brand mark (real logo asset) and optional wordmark. */
export default function BrandMark({ wordmark = true, size = 32, onDark = false }: BrandMarkProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
      <img
        src="/beersheba-logo.png"
        alt="Beersheba"
        width={size}
        height={size}
        style={{ flexShrink: 0, borderRadius: "6px", objectFit: "contain" }}
      />
      {wordmark && (
        <span
          style={{
            fontFamily: T.font.display,
            fontSize: "1.18rem",
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: onDark ? "#F5F5F7" : T.color.ink,
            lineHeight: 1,
          }}
        >
          Beersheba
        </span>
      )}
    </span>
  );
}
