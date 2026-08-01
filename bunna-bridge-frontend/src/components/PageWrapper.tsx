import type { ReactNode } from "react";
import AppShell from "./AppShell";
import { T } from "../styles/tokens";

interface PageWrapperProps {
  children: ReactNode;
  /** Optional contextual side rail (dense operational screens). */
  rail?: ReactNode;
  /** Widen the content column (defaults to the editorial max width). */
  wide?: boolean;
}

/**
 * Standard wrapper for authenticated app pages: the shared shell (top nav) plus
 * a constrained content column, optionally paired with a light contextual rail.
 */
export default function PageWrapper({ children, rail, wide = false }: PageWrapperProps) {
  return (
    <AppShell>
      <div
        className="container-editorial"
        style={{
          maxWidth: wide ? "1360px" : T.spacing.maxW,
          paddingTop: "36px",
          paddingBottom: "72px",
        }}
      >
        {rail ? (
          <div className="bb-rail-grid" style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", gap: "40px", alignItems: "start" }}>
            {rail}
            <div style={{ minWidth: 0 }}>{children}</div>
          </div>
        ) : (
          children
        )}
        <style>{`@media (max-width: 900px){ .bb-rail-grid { grid-template-columns: 1fr !important; } .bb-rail-grid > aside { display: none; } }`}</style>
      </div>
    </AppShell>
  );
}
