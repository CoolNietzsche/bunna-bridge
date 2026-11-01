import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { T } from "../styles/tokens";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.color.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="bb-spinner" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}
