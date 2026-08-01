import type { ReactNode } from "react";
import SiteHeader from "./site/SiteHeader";
import SiteFooter from "./site/SiteFooter";
import { T } from "../styles/tokens";

interface AppShellProps {
  children: ReactNode;
  /** Render the editorial marketing footer (public/discovery pages). */
  footer?: boolean;
}

/**
 * The single app frame: sticky top nav + main content (+ optional footer).
 * Pages control their own inner layout / containers so hero sections can bleed
 * full-width while operational pages stay inside a container.
 */
export default function AppShell({ children, footer = false }: AppShellProps) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: T.color.paper }}>
      <SiteHeader />
      <main style={{ flex: 1 }}>{children}</main>
      {footer && <SiteFooter />}
    </div>
  );
}
