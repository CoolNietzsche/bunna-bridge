import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#1A0F07", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ fontFamily: "monospace", color: "#D4824A", letterSpacing: "0.2em" }}>LOADING...</p>
    </div>
  );
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}
