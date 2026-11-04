import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBoundarySync } from './hooks/useBoundarySync';
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
const LicenseReviews = lazy(() => import("./pages/LicenseReviews"));
import Landing from "./pages/Landing";
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Lots = lazy(() => import("./pages/Lots"));
const LotDetail = lazy(() => import("./pages/LotDetail"));
const CreateLot = lazy(() => import("./pages/CreateLot"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const MyFarm = lazy(() => import("./pages/MyFarm"));
const MyRoastery = lazy(() => import("./pages/MyRoastery"));
const Certifications = lazy(() => import("./pages/Certifications"));
const WashingStations = lazy(() => import("./pages/WashingStations"));
const Producers = lazy(() => import("./pages/Producers"));
const ProducerDetail = lazy(() => import("./pages/ProducerDetail"));
const Team = lazy(() => import("./pages/Team"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));
const Intake = lazy(() => import("./pages/Intake"));
const Supply = lazy(() => import("./pages/Supply"));
const FieldApp = lazy(() => import("./pages/FieldApp"));
const Contracts = lazy(() => import("./pages/Contracts"));
const ContractDetail = lazy(() => import("./pages/ContractDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const FloorPrices = lazy(() => import("./pages/FloorPrices"));
const LotCupping = lazy(() => import("./pages/LotCupping"));
const CuppingSessions = lazy(() => import("./pages/CuppingSessions"));
const CuppingSessionDetail = lazy(() => import("./pages/CuppingSessionDetail"));
const RoastEquipmentPage = lazy(() => import("./pages/RoastEquipment"));
const RoastBatches = lazy(() => import("./pages/RoastBatches"));
const LotPipeline = lazy(() => import("./pages/LotPipeline"));
const EditLot = lazy(() => import("./pages/EditLot"));
const FarmerLotsMap = lazy(() => import("./pages/FarmerLotsMap"));
const SampleRequests = lazy(() => import("./pages/SampleRequests"));
const Settings = lazy(() => import("./pages/Settings"));
const CuppingForm = lazy(() => import("./pages/CuppingForm"));
const BuyerOffers = lazy(() => import("./pages/BuyerOffers"));
const BuyerWatchlist = lazy(() => import("./pages/BuyerWatchlist"));
const ExporterStorefront = lazy(() => import("./pages/ExporterStorefront"));
const ExporterOffers = lazy(() => import("./pages/ExporterOffers"));
const MarketplaceLotDetail = lazy(() => import("./pages/MarketplaceLotDetail"));
const LotStory = lazy(() => import("./pages/LotStory"));
const Select = lazy(() => import("./pages/Select"));
const SelectProgramme = lazy(() => import("./pages/SelectProgramme"));
const EuStock = lazy(() => import("./pages/EuStock"));
const Learn = lazy(() => import("./pages/Learn"));
const LearnArticle = lazy(() => import("./pages/LearnArticle"));

// Pages are code-split per route; the landing page stays in the main bundle
// so first paint for visitors doesn't wait on a second request.
const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="bb-spinner" aria-hidden />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Loading…</span>
    </div>
  );
}

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
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/"            element={<RootRoute />} />
            <Route path="/story/:id"   element={<LotStory />} />
            <Route path="/login"       element={<Login />} />
            <Route path="/register"    element={<Register />} />
            <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/lots/new"    element={<ProtectedRoute><CreateLot /></ProtectedRoute>} />
            <Route path="/lots/:id"    element={<ProtectedRoute><LotDetail /></ProtectedRoute>} />
            <Route path="/lots"        element={<ProtectedRoute><Lots /></ProtectedRoute>} />
            <Route path="/lots/:id/cup"    element={<ProtectedRoute><LotCupping /></ProtectedRoute>} />
            <Route path="/lots/:id/cup/classic" element={<ProtectedRoute><CuppingForm /></ProtectedRoute>} />
            <Route path="/cupping-sessions" element={<ProtectedRoute><CuppingSessions /></ProtectedRoute>} />
            <Route path="/cupping-sessions/:id" element={<ProtectedRoute><CuppingSessionDetail /></ProtectedRoute>} />
            <Route path="/map"            element={<ProtectedRoute><FarmerLotsMap /></ProtectedRoute>} />
            <Route path="/lots/:id/edit"  element={<ProtectedRoute><EditLot /></ProtectedRoute>} />
            <Route path="/pipeline"      element={<ProtectedRoute><LotPipeline /></ProtectedRoute>} />
            <Route path="/samples"       element={<ProtectedRoute><SampleRequests /></ProtectedRoute>} />
            <Route path="/farm" element={<ProtectedRoute><MyFarm /></ProtectedRoute>} />
            <Route path="/roastery" element={<ProtectedRoute><MyRoastery /></ProtectedRoute>} />
            <Route path="/certifications" element={<ProtectedRoute><Certifications /></ProtectedRoute>} />
            <Route path="/settings/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
            <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/admin/floor-prices" element={<ProtectedRoute><FloorPrices /></ProtectedRoute>} />
            <Route path="/field" element={<ProtectedRoute><FieldApp /></ProtectedRoute>} />
            <Route path="/intake" element={<ProtectedRoute><Intake /></ProtectedRoute>} />
            <Route path="/supply" element={<ProtectedRoute><Supply /></ProtectedRoute>} />
            <Route path="/producers" element={<ProtectedRoute><Producers /></ProtectedRoute>} />
            <Route path="/producers/:id" element={<ProtectedRoute><ProducerDetail /></ProtectedRoute>} />
            <Route path="/washing-stations" element={<ProtectedRoute><WashingStations /></ProtectedRoute>} />
            <Route path="/roast-equipment" element={<ProtectedRoute><RoastEquipmentPage /></ProtectedRoute>} />
            <Route path="/roast-batches" element={<ProtectedRoute><RoastBatches /></ProtectedRoute>} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:id" element={<MarketplaceLotDetail />} />
            <Route path="/buyer/offers"     element={<ProtectedRoute><BuyerOffers /></ProtectedRoute>} />
            <Route path="/buyer/watchlist"      element={<ProtectedRoute><BuyerWatchlist /></ProtectedRoute>} />
            <Route path="/exporters/:id"        element={<ProtectedRoute><ExporterStorefront /></ProtectedRoute>} />
            <Route path="/offers"       element={<ProtectedRoute><ExporterOffers /></ProtectedRoute>} />
            <Route path="/select"       element={<ProtectedRoute><Select /></ProtectedRoute>} />
            <Route path="/select/:id"   element={<ProtectedRoute><SelectProgramme /></ProtectedRoute>} />
            <Route path="/eu-stock"     element={<ProtectedRoute><EuStock /></ProtectedRoute>} />
            <Route path="/learn"        element={<Learn />} />
            <Route path="/learn/:slug"  element={<LearnArticle />} />
            <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admin/licenses" element={<ProtectedRoute><LicenseReviews /></ProtectedRoute>} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
