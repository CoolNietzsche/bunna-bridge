import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Lots from "./pages/Lots";
import LotDetail from "./pages/LotDetail";
import CreateLot from "./pages/CreateLot";
import Marketplace from "./pages/Marketplace";
import CuppingForm from "./pages/CuppingForm";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"       element={<Login />} />
            <Route path="/register"    element={<Register />} />
            <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/lots/new"    element={<ProtectedRoute><CreateLot /></ProtectedRoute>} />
            <Route path="/lots/:id"    element={<ProtectedRoute><LotDetail /></ProtectedRoute>} />
            <Route path="/lots"        element={<ProtectedRoute><Lots /></ProtectedRoute>} />
            <Route path="/lots/:id/cup"    element={<ProtectedRoute><CuppingForm /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="*"            element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
