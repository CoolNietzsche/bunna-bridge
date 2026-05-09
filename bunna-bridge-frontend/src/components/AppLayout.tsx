import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 260;

  return (
    <div style={{ minHeight: "100vh", background: "#1A0F07", display: "flex" }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <div style={{ flex: 1, marginLeft: `${sidebarWidth}px`, transition: "margin-left 0.3s ease", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <TopBar sidebarWidth={sidebarWidth} />
        <main style={{ flex: 1, paddingTop: "56px" }}>
          <div style={{ padding: "24px" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
