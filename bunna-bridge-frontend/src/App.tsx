import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBoundarySync } from './hooks/useBoundarySync';
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Lots from "./pages/Lots";
import LotDetail from "./pages/LotDetail";
import CreateLot from "./pages/CreateLot";
import Marketplace from "./pages/Marketplace";
import MyFarm from "./pages/MyFarm";
import LotPipeline from "./pages/LotPipeline";
import EditLot from "./pages/EditLot";
import FarmerLotsMap from "./pages/FarmerLotsMap";
import SampleRequests from "./pages/SampleRequests";
import Settings from "./pages/Settings";
import CuppingForm from "./pages/CuppingForm";
import BuyerOffers from "./pages/BuyerOffers";
import BuyerWatchlist from "./pages/BuyerWatchlist";
import ExporterOffers from "./pages/ExporterOffers";
import MarketplaceLotDetail from "./pages/MarketplaceLotDetail";

const queryClient = new QueryClient();

export default function App() {
  useBoundarySync();
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
            <Route path="/map"            element={<ProtectedRoute><FarmerLotsMap /></ProtectedRoute>} />
            <Route path="/lots/:id/edit"  element={<ProtectedRoute><EditLot /></ProtectedRoute>} />
            <Route path="/pipeline"      element={<ProtectedRoute><LotPipeline /></ProtectedRoute>} />
            <Route path="/samples"       element={<ProtectedRoute><SampleRequests /></ProtectedRoute>} />
            <Route path="/farm" element={<ProtectedRoute><MyFarm /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/marketplace/:id" element={<ProtectedRoute><MarketplaceLotDetail /></ProtectedRoute>} />
            <Route path="/buyer/offers"     element={<ProtectedRoute><BuyerOffers /></ProtectedRoute>} />
            <Route path="/buyer/watchlist"  element={<ProtectedRoute><BuyerWatchlist /></ProtectedRoute>} />
            <Route path="/offers"       element={<ProtectedRoute><ExporterOffers /></ProtectedRoute>} />
            <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*"            element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
