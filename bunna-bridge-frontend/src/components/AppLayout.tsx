import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { TopBar } from "./TopBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sidebarWidth = collapsed ? 64 : 260;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F5F0" }}>
      <style>{`
        .app-shell { margin-left: ${sidebarWidth}px; transition: margin-left 0.3s ease; }
        .bb-topbar  { left: ${sidebarWidth}px !important; transition: left 0.3s ease; }
        @media (max-width: 768px) {
          .app-shell { margin-left: 0 !important; }
          .bb-topbar  { left: 0 !important; }
        }
      `}</style>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 49,
        }} />
      )}

      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar onMenuToggle={() => setMobileOpen(true)} />
        <main style={{ flex: 1, paddingTop: "56px", background: "#F7F5F0" }}>
          <div style={{ padding: "clamp(16px, 4vw, 24px)" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
