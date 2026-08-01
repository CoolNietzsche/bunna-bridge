import { useState } from "react";
import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import { AT } from "../../styles/adminTokens";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Back-office shell — dark navy sidebar + top bar, matching Gentelella's
 * real structure. Used by operational pages (Dashboard, Lots, Pipeline,
 * Offers, Samples, Farm, Cupping, Settings…), replacing the public
 * AppShell/SiteHeader for that area. Marketplace and the Lot Story detail
 * keep the public shell — they're the buyer's storefront journey, not
 * back-office.
 */
export default function AdminShell({ children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const contentMargin = collapsed ? AT.spacing.sidebarCollapsedW : AT.spacing.sidebarW;

  return (
    <div style={{ minHeight: "100vh", background: AT.color.bodyBg, fontFamily: AT.font.sans }}>
      <AdminSidebar collapsed={collapsed} onCollapse={setCollapsed} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(26,35,50,0.4)", zIndex: 55 }} className="ab-scrim" />
      )}

      <div className="ab-content" style={{ marginLeft: contentMargin, transition: "margin-left 0.18s ease", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AdminTopBar onMobileMenu={() => setMobileOpen(true)} />
        <main style={{ flex: 1, padding: "24px" }}>{children}</main>
      </div>

      <style>{`@media (max-width: 860px){ .ab-content { margin-left: 0 !important; } }`}</style>
    </div>
  );
}
