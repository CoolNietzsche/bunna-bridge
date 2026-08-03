import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBoundarySync } from './hooks/useBoundarySync';
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Lots from "./pages/Lots";
import LotDetail from "./pages/LotDetail";
import CreateLot from "./pages/CreateLot";
import Marketplace from "./pages/Marketplace";
import MyFarm from "./pages/MyFarm";
import MyRoastery from "./pages/MyRoastery";
import Certifications from "./pages/Certifications";
import WashingStations from "./pages/WashingStations";
import RoastEquipmentPage from "./pages/RoastEquipment";
import RoastBatches from "./pages/RoastBatches";
import LotPipeline from "./pages/LotPipeline";
import EditLot from "./pages/EditLot";
import FarmerLotsMap from "./pages/FarmerLotsMap";
import SampleRequests from "./pages/SampleRequests";
import Settings from "./pages/Settings";
import CuppingForm from "./pages/CuppingForm";
import BuyerOffers from "./pages/BuyerOffers";
import BuyerWatchlist from "./pages/BuyerWatchlist";
import ExporterStorefront from "./pages/ExporterStorefront";
import ExporterOffers from "./pages/ExporterOffers";
import MarketplaceLotDetail from "./pages/MarketplaceLotDetail";
import LotStory from "./pages/LotStory";

const queryClient = new QueryClient();

/** Public marketing landing at "/"; authenticated users go to their dashboard. */
function RootRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  useBoundarySync();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"            element={<RootRoute />} />
            <Route path="/story/:id"   element={<LotStory />} />
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
            <Route path="/roastery" element={<ProtectedRoute><MyRoastery /></ProtectedRoute>} />
            <Route path="/certifications" element={<ProtectedRoute><Certifications /></ProtectedRoute>} />
            <Route path="/washing-stations" element={<ProtectedRoute><WashingStations /></ProtectedRoute>} />
            <Route path="/roast-equipment" element={<ProtectedRoute><RoastEquipmentPage /></ProtectedRoute>} />
            <Route path="/roast-batches" element={<ProtectedRoute><RoastBatches /></ProtectedRoute>} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:id" element={<MarketplaceLotDetail />} />
            <Route path="/buyer/offers"     element={<ProtectedRoute><BuyerOffers /></ProtectedRoute>} />
            <Route path="/buyer/watchlist"      element={<ProtectedRoute><BuyerWatchlist /></ProtectedRoute>} />
            <Route path="/exporters/:id"        element={<ProtectedRoute><ExporterStorefront /></ProtectedRoute>} />
            <Route path="/offers"       element={<ProtectedRoute><ExporterOffers /></ProtectedRoute>} />
            <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
