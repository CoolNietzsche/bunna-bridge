import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFarmerProfile, getFarmerLots, updateFarmerProfile } from "../api/farmer";
import type { FarmerProfile } from "../api/farmer";
import AdminShell from "../components/admin/AdminShell";
import PolygonCaptureWidget from "../components/PolygonCaptureWidget";
import FarmMapDisplay from "../components/FarmMapDisplay";
import { LotStatusBadge } from "../components/admin/AdminStatusBadge";
import {
  Sprout, MapPin, Mountain, Ruler, Users,
  Edit2, Check, X, Coffee, ExternalLink, ShieldCheck, AlertTriangle, TrendingUp
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";
import { WidgetStatSimple, WidgetStatProgress } from "../components/admin/AdminWidgets";

export default function MyFarm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<FarmerProfile>>({});
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["farmer-profile"],
    queryFn: getFarmerProfile,
  });

  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ["farmer-lots"],
    queryFn: getFarmerLots,
  });

  const updateMutation = useMutation({
    mutationFn: updateFarmerProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-profile"] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const startEdit = () => {
    setForm({
      farm_name: profile?.farm_name || "",
      farm_region: profile?.farm_region || "",
      farm_kebele: profile?.farm_kebele || "",
      farm_altitude_m: profile?.farm_altitude_m || undefined,
      farm_size_ha: profile?.farm_size_ha || "",
      cooperative: profile?.cooperative || "",
      gps_lat: profile?.gps_lat || "",
      gps_lng: profile?.gps_lng || "",
      phone: profile?.phone || "",
      country: profile?.country || "",
    });
    setEditing(true);
  };

  const handleSave = () => updateMutation.mutate(form);
  const set = (k: keyof FarmerProfile, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };
  const flabel: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" };
  const fval: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.text };
  const field: React.CSSProperties = { marginBottom: "14px" };

  if (profileLoading) {
    return (
      <AdminShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading farm profile…</p>
        </div>
      </AdminShell>
    );
  }

  const p = profile;
  const displayName = p?.farm_name || user?.company_name || "My Farm";

  return (
    <AdminShell>
      <div className="ab-farm-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>{p?.cooperative || "Farm Profile"} · {p?.farm_region || "Ethiopia"}</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>{displayName}</h1>
          {p?.farm_id && (
            <span style={{ ...AC.pill.base, ...AC.pill.green, marginTop: "8px" }}>{p.farm_id}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {saved && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.primaryDark }}>
              <Check size={14} /> Saved
            </span>
          )}
          {editing ? (
            <>
              <button style={AC.btnGhost} onClick={() => setEditing(false)}>
                <X size={13} /> Cancel
              </button>
              <button style={AC.btnPrimary} onClick={handleSave} disabled={updateMutation.isPending}>
                <Check size={13} /> {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
            </>
          ) : (
            <button style={AC.btnGhost} onClick={startEdit}>
              <Edit2 size={13} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <WidgetStatSimple icon={<Mountain size={16} />} value={p?.farm_altitude_m ? `${p.farm_altitude_m}m` : "—"} label="Altitude" tone="green" />
        <WidgetStatSimple icon={<Ruler size={16} />} value={p?.farm_size_ha ? `${p.farm_size_ha} ha` : "—"} label="Farm Size" tone="green" />
        <WidgetStatSimple icon={<Users size={16} />} value={p?.cooperative ? "Yes" : "—"} label="Cooperative" tone="green" />
        <WidgetStatProgress
          icon={<TrendingUp size={16} />}
          value={lots?.length ?? 0}
          label="Linked Lots"
          tone="blue"
          percent={lots && lots.length > 0 ? Math.round((lots.filter((l) => l.export_ready).length / lots.length) * 100) : 0}
          footer={lots && lots.length > 0 ? `${lots.filter((l) => l.export_ready).length} of ${lots.length} export ready` : "No lots linked yet"}
        />
      </div>

      <div className="ab-farm-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={cardTitle}>Farm Identity</p>
            {editing ? (
              <>
                {[
                  { label: "Farm Name", key: "farm_name", placeholder: "Kochere Highland Farm" },
                  { label: "Cooperative", key: "cooperative", placeholder: "Kochere Cooperative" },
                  { label: "Region", key: "farm_region", placeholder: "yirgacheffe" },
                  { label: "Kebele", key: "farm_kebele", placeholder: "Kochere" },
                ].map((f) => (
                  <div key={f.key} style={field}>
                    <label style={flabel}>{f.label}</label>
                    <input style={AC.input} placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key] || ""}
                      onChange={(e) => set(f.key as keyof FarmerProfile, e.target.value)} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { icon: <Sprout size={12} />, label: "Farm Name", val: p?.farm_name || "—" },
                  { icon: <Users size={12} />, label: "Cooperative", val: p?.cooperative || "—" },
                  { icon: <MapPin size={12} />, label: "Region", val: p?.farm_region || "—" },
                  { icon: <MapPin size={12} />, label: "Kebele", val: p?.farm_kebele || "—" },
                ].map((f) => (
                  <div key={f.label} style={field}>
                    <p style={{ ...flabel, margin: "0 0 4px" }}>{f.icon} {f.label}</p>
                    <p style={{ ...fval, margin: 0, textTransform: f.label === "Region" ? "capitalize" : "none" }}>{f.val}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={cardTitle}>Technical Details</p>
            {editing ? (
              <>
                {[
                  { label: "Altitude (masl)", key: "farm_altitude_m", type: "number", placeholder: "1950" },
                  { label: "Farm Size (ha)", key: "farm_size_ha", type: "number", placeholder: "0.4" },
                  { label: "GPS Latitude", key: "gps_lat", type: "number", placeholder: "6.3241" },
                  { label: "GPS Longitude", key: "gps_lng", type: "number", placeholder: "38.2149" },
                ].map((f) => (
                  <div key={f.key} style={field}>
                    <label style={flabel}>{f.label}</label>
                    <input style={AC.input} type={f.type} placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key] || ""}
                      onChange={(e) => set(f.key as keyof FarmerProfile, e.target.value)} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { icon: <Mountain size={12} />, label: "Altitude", val: p?.farm_altitude_m ? `${p.farm_altitude_m} masl` : "—" },
                  { icon: <Ruler size={12} />, label: "Farm Size", val: p?.farm_size_ha ? `${p.farm_size_ha} hectares` : "—" },
                ].map((f) => (
                  <div key={f.label} style={field}>
                    <p style={{ ...flabel, margin: "0 0 4px" }}>{f.icon} {f.label}</p>
                    <p style={{ ...fval, margin: 0 }}>{f.val}</p>
                  </div>
                ))}

                {(p?.gps_lat || p?.gps_lng) && (
                  <div style={{ background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, borderRadius: AT.radius.md, padding: "12px", marginTop: "8px" }}>
                    <p style={{ ...flabel, color: AT.color.primaryDark, margin: "0 0 8px" }}>
                      <MapPin size={12} /> GPS Coordinates
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted }}>Latitude</span>
                      <span style={{ fontFamily: AT.font.mono, fontSize: "0.78rem", color: AT.color.primaryDark }}>{p?.gps_lat}°N</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textMuted }}>Longitude</span>
                      <span style={{ fontFamily: AT.font.mono, fontSize: "0.78rem", color: AT.color.primaryDark }}>{p?.gps_lng}°E</span>
                    </div>
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${AT.color.primary}22`, display: "flex", alignItems: "center", gap: "6px" }}>
                      <ShieldCheck size={12} color={AT.color.primaryDark} />
                      <span style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.primaryDark }}>EUDR-compliant GPS point recorded</span>
                    </div>
                  </div>
                )}

                {!p?.gps_lat && (
                  <div style={{ background: AT.color.redLight, border: `1px solid ${AT.color.red}33`, borderRadius: AT.radius.md, padding: "12px", marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertTriangle size={13} color={AT.color.red} />
                    <p style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.red, margin: 0 }}>
                      GPS coordinates not set — required for EUDR compliance
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={cardTitle}>Contact & Account</p>
            {editing ? (
              <>
                {[
                  { label: "Phone", key: "phone", placeholder: "+251..." },
                  { label: "Country", key: "country", placeholder: "Ethiopia" },
                ].map((f) => (
                  <div key={f.key} style={field}>
                    <label style={flabel}>{f.label}</label>
                    <input style={AC.input} placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key] || ""}
                      onChange={(e) => set(f.key as keyof FarmerProfile, e.target.value)} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: "Full Name", val: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "—" },
                  { label: "Email", val: user?.email || "—" },
                  { label: "Phone", val: p?.phone || "—" },
                  { label: "Country", val: p?.country || "Ethiopia" },
                ].map((f) => (
                  <div key={f.label} style={field}>
                    <p style={{ ...flabel, margin: "0 0 4px" }}>{f.label}</p>
                    <p style={{ fontFamily: AT.font.mono, fontSize: "0.8rem", color: AT.color.text, margin: 0 }}>{f.val}</p>
                  </div>
                ))}

                <div style={{ marginTop: "12px", padding: "10px 12px", background: p?.gps_lat ? AT.color.primaryLight : AT.color.redLight, border: `1px solid ${p?.gps_lat ? AT.color.primary + "33" : AT.color.red + "33"}`, borderRadius: AT.radius.md, display: "flex", alignItems: "center", gap: "8px" }}>
                  {p?.gps_lat ? <ShieldCheck size={13} color={AT.color.primaryDark} /> : <AlertTriangle size={13} color={AT.color.red} />}
                  <p style={{ fontFamily: AT.font.sans, fontSize: "0.72rem", color: p?.gps_lat ? AT.color.primaryDark : AT.color.red, margin: 0 }}>
                    {p?.gps_lat ? "EUDR GPS Profile Complete" : "EUDR GPS Profile Incomplete — Edit profile to add coordinates"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={cardTitle}>Linked Lots ({lotsLoading ? "…" : lots?.length ?? 0})</p>
            {lotsLoading && <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textDisabled, textAlign: "center", padding: "24px 0" }}>Loading lots…</p>}
            {!lotsLoading && (!lots || lots.length === 0) && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Coffee size={20} color={AT.color.textDisabled} style={{ marginBottom: "8px" }} />
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textDisabled, margin: "0 0 4px" }}>No lots linked to your farm yet.</p>
                <p style={{ fontFamily: AT.font.sans, fontSize: "0.68rem", color: AT.color.textDisabled, margin: 0 }}>
                  Lots from your kebele ({p?.farm_kebele || "—"}) will appear here.
                </p>
              </div>
            )}
            {lots && lots.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {lots.map((lot) => (
                  <div key={lot.id} style={{ ...AC.trHover, display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: AT.radius.md }}
                    onClick={() => navigate(`/lots/${lot.id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = AT.color.surfaceSecondary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontFamily: AT.font.mono, fontSize: "0.7rem", color: AT.color.textMuted, minWidth: "110px" }}>{lot.lot_id}</span>
                    <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, flex: 1 }}>{lot.name}</span>
                    {lot.sca_score && <span style={{ fontFamily: AT.font.mono, fontSize: "0.75rem", color: AT.color.primaryDark }}>{lot.sca_score} pts</span>}
                    <LotStatusBadge status={lot.status} />
                    <ExternalLink size={12} color={AT.color.textDisabled} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "8px" }}>
        {p?.boundary && (
          <div style={{ marginBottom: "16px" }}>
            <FarmMapDisplay polygon={p.boundary} label="Farm Boundary" height={240} />
          </div>
        )}
        <PolygonCaptureWidget
          mode="farm"
          existingPolygon={p?.boundary ?? null}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["farmer-profile"] })}
        />
      </div>

      <style>{`
        @media (max-width: 860px) { .ab-farm-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .ab-farm-header { flex-direction: column; } }
      `}</style>
    </AdminShell>
  );
}
