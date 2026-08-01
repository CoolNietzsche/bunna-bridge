import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import type { CoffeeLot } from "../api/lots";
import AdminShell from "../components/admin/AdminShell";
import { useWatchlist } from "../hooks/useWatchlist";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck, Award, MapPin, Calendar, Mountain,
  TrendingUp, FlaskConical, Heart, ArrowLeft, BadgeCheck
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

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

  if (profileLoading) {
    return (
      <AdminShell>
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, textAlign: "center", padding: "80px 0" }}>Loading…</p>
      </AdminShell>
    );
  }

  if (!profile) {
    return (
      <AdminShell>
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.9rem", color: AT.color.textMuted, textAlign: "center", padding: "80px 0" }}>Exporter not found.</p>
      </AdminShell>
    );
  }

  const memberSince = new Date(profile.date_joined).getFullYear();

  return (
    <AdminShell>
      <button
        onClick={() => navigate("/marketplace")}
        style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: AT.color.textMuted, fontFamily: AT.font.sans, fontSize: "0.82rem", cursor: "pointer", marginBottom: "20px", padding: 0 }}
      >
        <ArrowLeft size={14} /> Back to Marketplace
      </button>

      <div className="ab-storefront-hero" style={{ ...AC.card, ...AC.cardPad, marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: AT.radius.md, background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: AT.font.sans, fontSize: "1.4rem", fontWeight: 700, color: AT.color.primaryDark, flexShrink: 0 }}>
                {profile.company_name?.[0] || profile.full_name?.[0]}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <h1 style={{ fontFamily: AT.font.sans, fontSize: "1.4rem", fontWeight: 700, color: AT.color.text, margin: 0, lineHeight: 1.2 }}>
                    {profile.company_name || profile.full_name}
                  </h1>
                  {profile.is_verified && <BadgeCheck size={16} color={AT.color.primaryDark} />}
                </div>
                {profile.company_name && (
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textMuted, margin: 0 }}>
                    {profile.full_name}
                  </p>
                )}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted }}>
                    <MapPin size={11} /> {profile.country}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted }}>
                    <Calendar size={11} /> Member since {memberSince}
                  </span>
                  {profile.ecta_license_number && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500, color: AT.color.primaryDark }}>
                      <ShieldCheck size={11} /> ECTA {profile.ecta_license_number}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {profile.bio && (
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {profile.bio}
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: AT.color.border, borderRadius: AT.radius.md, overflow: "hidden", alignSelf: "flex-start", minWidth: "260px" }}>
            {[
              ["Active Lots", profile.lots_count],
              ["Exported", profile.exported_count],
              ["Avg SCA", profile.avg_sca_score ? profile.avg_sca_score.toFixed(1) : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ background: AT.color.surface, padding: "16px", textAlign: "center" }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.5rem", fontWeight: 700, color: AT.color.text, margin: "0 0 3px", lineHeight: 1 }}>{value}</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.62rem", color: AT.color.textDisabled, letterSpacing: "0.04em", margin: 0, textTransform: "uppercase" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <p style={AC.eyebrow}>Active Lots · {lots.length}</p>
      </div>

      {lotsLoading && (
        <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted, textAlign: "center", padding: "40px 0" }}>Loading lots…</p>
      )}

      {!lotsLoading && lots.length === 0 && (
        <div style={{ ...AC.card, ...AC.cardPad, textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", color: AT.color.textMuted, margin: 0 }}>No active lots at the moment.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {lots.map((lot) => (
          <div
            key={lot.id}
            style={{ ...AC.card, ...AC.cardPad, cursor: "pointer" }}
            onClick={() => navigate(`/marketplace/${lot.id}`)}
          >
            <div className="ab-store-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: AT.font.mono, fontSize: "0.68rem", color: AT.color.textMuted, margin: "0 0 3px" }}>{lot.lot_id}</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.05rem", fontWeight: 600, color: AT.color.text, margin: "0 0 8px", lineHeight: 1.25 }}>
                  {lot.name}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, textTransform: "capitalize" }}>
                    <Mountain size={11} /> {lot.region} · {lot.altitude_m}m
                  </span>
                  <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted, textTransform: "capitalize" }}>
                    {lot.processing} · {lot.grade}
                  </span>
                  {lot.is_eudr_ready && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: AT.font.sans, fontSize: "0.72rem", fontWeight: 500, color: AT.color.primaryDark }}>
                      <ShieldCheck size={11} /> EUDR
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textDisabled }}>
                    <Award size={11} /> {lot.compliance_score ?? 0}/7
                  </span>
                </div>
                {lot.flavor_tags?.length > 0 && (
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginTop: "10px" }}>
                    {lot.flavor_tags.slice(0, 4).map((tag) => (
                      <span key={tag} style={{ padding: "3px 10px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.pill, fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textSecondary }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.3rem", fontWeight: 700, color: AT.color.text, margin: 0, lineHeight: 1 }}>
                  {lot.fob_price_usd ? `$${parseFloat(lot.fob_price_usd).toFixed(2)}` : "POA"}
                </p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.6rem", color: AT.color.textDisabled, margin: 0 }}>per kg FOB</p>
                {lot.latest_sca_score && (
                  <p style={{ fontFamily: AT.font.mono, fontSize: "0.85rem", color: AT.color.primaryDark, margin: "4px 0 0" }}>
                    {parseFloat(String(lot.latest_sca_score)).toFixed(1)} SCA
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => navigate(`/marketplace/${lot.id}`)} style={AC.btnGhost}>
                View Lot
              </button>
              {isBuyer && (
                <button onClick={() => navigate(`/marketplace/${lot.id}?offer=1`)} style={AC.btnPrimary}>
                  <TrendingUp size={13} /> Make Offer
                </button>
              )}
              {isBuyer && (
                <button onClick={() => navigate(`/marketplace/${lot.id}?sample=1`)} style={AC.btnGhost}>
                  <FlaskConical size={13} /> Sample
                </button>
              )}
              {isBuyer && (
                <button
                  onClick={() => toggle(lot.id)}
                  style={{ ...AC.btnGhost, color: isWatched(lot.id) ? AT.color.primaryDark : AT.color.textMuted, borderColor: isWatched(lot.id) ? `${AT.color.primary}44` : AT.color.border, marginLeft: "auto" }}
                >
                  <Heart size={13} fill={isWatched(lot.id) ? AT.color.primaryDark : "none"} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`@media (max-width: 640px){ .ab-storefront-hero > div { flex-direction: column; } .ab-store-row { flex-direction: column; } .ab-store-row > div:last-child { align-items: flex-start !important; flex-direction: row !important; gap: 12px !important; } }`}</style>
    </AdminShell>
  );
}
