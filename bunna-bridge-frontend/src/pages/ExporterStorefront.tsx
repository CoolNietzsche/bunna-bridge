import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import type { CoffeeLot } from "../api/lots";
import PageWrapper from "../components/PageWrapper";
import { useWatchlist } from "../hooks/useWatchlist";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck, Award, MapPin, Calendar, Mountain,
  TrendingUp, FlaskConical, Heart, ArrowLeft, BadgeCheck
} from "lucide-react";

interface ExporterProfile {
  id: number;
  full_name: string;
  company_name: string;
  country: string;
  bio: string;
  is_verified: boolean;
  date_joined: string;
  ecta_license_number: string;
  ecta_license_expiry: string;
  lots_count: number;
  exported_count: number;
  avg_sca_score: number | null;
}

const PROCESS_COLOR: Record<string, string> = {
  washed:  "#4A7C59",
  natural: "#C1440E",
  honey:   "#C9952A",
};

export default function ExporterStorefront() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggle, isWatched } = useWatchlist();
  const isBuyer = user?.role === "buyer" || user?.role === "admin";

  const { data: profile, isLoading: profileLoading } = useQuery<ExporterProfile>({
    queryKey: ["exporter", id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/auth/exporters/${id}/`);
      return data;
    },
    enabled: !!id,
  });

  const { data: lotsData, isLoading: lotsLoading } = useQuery({
    queryKey: ["exporter-lots", id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/auth/exporters/${id}/lots/`);
      return data;
    },
    enabled: !!id,
  });

  const lots: CoffeeLot[] = lotsData?.results ?? [];

  if (profileLoading) return (
    <PageWrapper>
      <div style={{ textAlign: "center", padding: "80px", fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)" }}>
        Loading...
      </div>
    </PageWrapper>
  );

  if (!profile) return (
    <PageWrapper>
      <div style={{ textAlign: "center", padding: "80px" }}>
        <p style={{ fontFamily: "DM Mono, monospace", color: "rgba(245,237,216,0.3)" }}>Exporter not found.</p>
      </div>
    </PageWrapper>
  );

  const memberSince = new Date(profile.date_joined).getFullYear();

  return (
    <PageWrapper>
      {/* Back */}
      <button onClick={() => navigate("/marketplace")}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "rgba(245,237,216,0.35)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer", marginBottom: "24px", padding: 0 }}>
        <ArrowLeft size={14} /> Back to Marketplace
      </button>

      {/* Profile hero */}
      <div style={{ background: "#1E1208", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "10px", padding: "28px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            {/* Avatar + name */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "6px", background: "rgba(193,68,14,0.12)", border: "1px solid rgba(193,68,14,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cormorant Garamond, serif", fontSize: "1.6rem", color: "#C1440E", flexShrink: 0 }}>
                {profile.company_name?.[0] || profile.full_name?.[0]}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.6rem", fontWeight: 400, color: "#F5EDD8", margin: 0, lineHeight: 1 }}>
                    {profile.company_name || profile.full_name}
                  </h1>
                  {profile.is_verified && (
                    <BadgeCheck size={16} color="#A8C5A0" />
                  )}
                </div>
                {profile.company_name && (
                  <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.82rem", color: "rgba(245,237,216,0.4)", margin: 0 }}>
                    {profile.full_name}
                  </p>
                )}
                <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)" }}>
                    <MapPin size={9} /> {profile.country}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)" }}>
                    <Calendar size={9} /> Member since {memberSince}
                  </span>
                  {profile.ecta_license_number && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#4A7C59" }}>
                      <ShieldCheck size={9} /> ECTA {profile.ecta_license_number}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: "#EDE0C4", lineHeight: 1.7, margin: 0 }}>
                {profile.bio}
              </p>
            )}
          </div>

          {/* Stats block */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(245,237,216,0.05)", borderRadius: "8px", overflow: "hidden", alignSelf: "flex-start", minWidth: "280px" }}>
            {[
              ["Active Lots", profile.lots_count],
              ["Exported",    profile.exported_count],
              ["Avg SCA",     profile.avg_sca_score ? profile.avg_sca_score.toFixed(1) : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "#2C1810", padding: "16px", textAlign: "center" }}>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.8rem", fontWeight: 300, color: "#C9952A", margin: "0 0 3px", lineHeight: 1 }}>{value}</p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(245,237,216,0.3)", letterSpacing: "0.1em", margin: 0, textTransform: "uppercase" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lots section */}
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "rgba(245,237,216,0.3)", textTransform: "uppercase", margin: 0 }}>
          Active Lots · {lots.length}
        </p>
      </div>

      {lotsLoading && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.7rem", color: "rgba(245,237,216,0.25)", textAlign: "center", padding: "40px" }}>Loading lots...</p>
      )}

      {!lotsLoading && lots.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#1E1208", borderRadius: "8px", border: "1px solid rgba(245,237,216,0.05)" }}>
          <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.2rem", color: "rgba(245,237,216,0.3)", margin: 0 }}>No active lots at the moment.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {lots.map(lot => (
          <div key={lot.id}
            style={{ background: "#1E1208", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "8px", padding: "18px 20px", cursor: "pointer" }}
            onClick={() => navigate(`/marketplace/${lot.id}`)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "#C9952A", letterSpacing: "0.15em", margin: "0 0 2px" }}>
                  {lot.lot_id}
                </p>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.15rem", color: "#F5EDD8", margin: "0 0 6px", lineHeight: 1.2 }}>
                  {lot.name}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", textTransform: "capitalize" }}>
                    <Mountain size={9} /> {lot.region} · {lot.altitude_m}m
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: PROCESS_COLOR[lot.processing] || "rgba(245,237,216,0.35)", textTransform: "capitalize" }}>
                    {lot.processing} · {lot.grade}
                  </span>
                  {lot.is_eudr_ready && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "#4A7C59" }}>
                      <ShieldCheck size={9} /> EUDR
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "DM Mono, monospace", fontSize: "0.55rem", color: "rgba(245,237,216,0.3)" }}>
                    <Award size={9} /> {lot.compliance_score ?? 0}/7
                  </span>
                </div>
                {lot.flavor_tags?.length > 0 && (
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "10px" }}>
                    {lot.flavor_tags.slice(0, 4).map(tag => (
                      <span key={tag} style={{ padding: "3px 10px", background: "rgba(74,37,21,0.6)", border: "1px solid rgba(201,149,42,0.15)", borderRadius: "20px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.72rem", color: "#EDE0C4" }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.6rem", fontWeight: 300, color: "#C9952A", margin: 0, lineHeight: 1 }}>
                  {lot.fob_price_usd ? `$${parseFloat(lot.fob_price_usd).toFixed(2)}` : "POA"}
                </p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.5rem", color: "rgba(245,237,216,0.3)", margin: 0 }}>per kg FOB</p>
                {lot.latest_sca_score && (
                  <p style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.1rem", color: "#C9952A", margin: "4px 0 0", opacity: 0.7 }}>
                    {parseFloat(String(lot.latest_sca_score)).toFixed(1)} SCA
                  </p>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }} onClick={e => e.stopPropagation()}>
              <button onClick={() => navigate(`/marketplace/${lot.id}`)}
                style={{ background: "transparent", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "4px", padding: "8px 16px", color: "rgba(245,237,216,0.5)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                View Lot
              </button>
              {isBuyer && (
                <button onClick={() => navigate(`/marketplace/${lot.id}?offer=1`)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "#C1440E", border: "none", borderRadius: "4px", padding: "8px 16px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                  <TrendingUp size={12} /> Make Offer
                </button>
              )}
              {isBuyer && (
                <button onClick={() => navigate(`/marketplace/${lot.id}?sample=1`)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "4px", padding: "8px 12px", color: "#C1440E", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                  <FlaskConical size={12} />
                </button>
              )}
              {isBuyer && (
                <button onClick={() => toggle(lot.id)}
                  style={{ display: "flex", alignItems: "center", background: "transparent", border: `1px solid ${isWatched(lot.id) ? "rgba(193,68,14,0.4)" : "rgba(245,237,216,0.1)"}`, borderRadius: "4px", padding: "8px 10px", color: isWatched(lot.id) ? "#C1440E" : "rgba(245,237,216,0.3)", cursor: "pointer", marginLeft: "auto" }}>
                  <Heart size={12} fill={isWatched(lot.id) ? "#C1440E" : "none"} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
