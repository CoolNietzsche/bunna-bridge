import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { login as apiLogin } from "../api/auth";
import type { LoginCredentials } from "../api/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  user: null | { email: string };
  login: (creds: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<null | { email: string }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) setIsAuthenticated(true);
    setLoading(false);
  }, []);

  const login = async (creds: LoginCredentials) => {
    const tokens = await apiLogin(creds);
    localStorage.setItem("access_token", tokens.access);
    localStorage.setItem("refresh_token", tokens.refresh);
    setIsAuthenticated(true);
    setUser({ email: creds.email });
  };

  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
