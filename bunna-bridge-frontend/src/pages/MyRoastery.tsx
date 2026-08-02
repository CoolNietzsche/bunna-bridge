import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRoasterProfile, updateRoasterProfile } from "../api/roaster";
import type { RoasterProfile, RoasteryType } from "../api/roaster";
import AdminShell from "../components/admin/AdminShell";
import {
  Coffee, Globe, Calendar, Package, Flame, Leaf,
  Edit2, Check, X, ShoppingBag, TrendingUp, ClipboardCheck,
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";
import { WidgetStatSimple, WidgetStatProgress } from "../components/admin/AdminWidgets";

const ROASTERY_TYPES: { value: RoasteryType | ""; label: string }[] = [
  { value: "", label: "Not set" },
  { value: "micro", label: "Micro-roastery (under 500kg/month)" },
  { value: "commercial", label: "Commercial roastery" },
  { value: "cafe", label: "Café with in-house roasting" },
  { value: "other", label: "Other" },
];

const roasteryTypeLabel = (t?: string) => ROASTERY_TYPES.find((r) => r.value === t)?.label || "—";

function tagList(csv?: string) {
  return (csv || "").split(",").map((t) => t.trim()).filter(Boolean);
}

export default function MyRoastery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<RoasterProfile>>({});
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["roaster-profile"],
    queryFn: getRoasterProfile,
  });

  const updateMutation = useMutation({
    mutationFn: updateRoasterProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roaster-profile"] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const startEdit = () => {
    setForm({
      company_name: profile?.company_name || "",
      roastery_type: profile?.roastery_type || "",
      roastery_monthly_capacity_kg: profile?.roastery_monthly_capacity_kg ?? undefined,
      roastery_roast_styles: profile?.roastery_roast_styles || "",
      roastery_preferred_origins: profile?.roastery_preferred_origins || "",
      roastery_established_year: profile?.roastery_established_year ?? undefined,
      roastery_website: profile?.roastery_website || "",
      phone: profile?.phone || "",
      country: profile?.country || "",
    });
    setEditing(true);
  };

  const handleSave = () => updateMutation.mutate(form);
  const set = (k: keyof RoasterProfile, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const cardTitle: React.CSSProperties = { ...AC.cardTitle, marginBottom: "16px" };
  const flabel: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.62rem", letterSpacing: "0.05em", textTransform: "uppercase", color: AT.color.textDisabled, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" };
  const fval: React.CSSProperties = { fontFamily: AT.font.sans, fontSize: "0.88rem", color: AT.color.text };
  const field: React.CSSProperties = { marginBottom: "14px" };

  if (profileLoading) {
    return (
      <AdminShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textMuted }}>Loading roastery profile…</p>
        </div>
      </AdminShell>
    );
  }

  const p = profile;
  const displayName = p?.company_name || "My Roastery";
  const roastStyles = tagList(p?.roastery_roast_styles);
  const preferredOrigins = tagList(p?.roastery_preferred_origins);

  const profileFields = [
    p?.company_name, p?.roastery_type, p?.roastery_monthly_capacity_kg,
    p?.roastery_roast_styles, p?.roastery_preferred_origins, p?.roastery_established_year,
    p?.roastery_website, p?.phone, p?.country,
  ];
  const profileCompleteness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  return (
    <AdminShell>
      <div className="ab-roastery-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>{roasteryTypeLabel(p?.roastery_type)} · {p?.country || "Ethiopia"}</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>{displayName}</h1>
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
        <WidgetStatSimple icon={<Package size={16} />} value={p?.roastery_monthly_capacity_kg ? `${p.roastery_monthly_capacity_kg} kg` : "—"} label="Monthly Capacity" tone="green" />
        <WidgetStatSimple icon={<Flame size={16} />} value={roastStyles.length || "—"} label="Roast Styles" tone="green" />
        <WidgetStatSimple icon={<Leaf size={16} />} value={preferredOrigins.length || "—"} label="Preferred Origins" tone="green" />
        <WidgetStatSimple icon={<Calendar size={16} />} value={p?.roastery_established_year || "—"} label="Established" tone="green" />
        <WidgetStatProgress
          icon={<ClipboardCheck size={16} />}
          value={`${profileCompleteness}%`}
          label="Profile Completeness"
          tone="blue"
          percent={profileCompleteness}
          footer={profileCompleteness < 100 ? "Complete your profile to help exporters find you" : "Profile fully complete"}
        />
      </div>

      <div className="ab-roastery-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={cardTitle}>Roastery Identity</p>
            {editing ? (
              <>
                <div style={field}>
                  <label style={flabel}>Roastery Name</label>
                  <input style={AC.input} placeholder="Nordic Roasters" value={form.company_name || ""} onChange={(e) => set("company_name", e.target.value)} />
                </div>
                <div style={field}>
                  <label style={flabel}>Roastery Type</label>
                  <select style={AC.input} value={form.roastery_type || ""} onChange={(e) => set("roastery_type", e.target.value)}>
                    {ROASTERY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={field}>
                  <label style={flabel}>Established Year</label>
                  <input style={AC.input} type="number" placeholder="2018" value={form.roastery_established_year ?? ""} onChange={(e) => set("roastery_established_year", e.target.value)} />
                </div>
                <div style={field}>
                  <label style={flabel}>Website</label>
                  <input style={AC.input} placeholder="https://…" value={form.roastery_website || ""} onChange={(e) => set("roastery_website", e.target.value)} />
                </div>
              </>
            ) : (
              <>
                {[
                  { icon: <Coffee size={12} />, label: "Roastery Name", val: p?.company_name || "—" },
                  { icon: <Flame size={12} />, label: "Type", val: roasteryTypeLabel(p?.roastery_type) },
                  { icon: <Calendar size={12} />, label: "Established", val: p?.roastery_established_year || "—" },
                  { icon: <Globe size={12} />, label: "Website", val: p?.roastery_website || "—" },
                ].map((f) => (
                  <div key={f.label} style={field}>
                    <p style={{ ...flabel, margin: "0 0 4px" }}>{f.icon} {f.label}</p>
                    <p style={{ ...fval, margin: 0 }}>{f.val}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={cardTitle}>Sourcing Profile</p>
            {editing ? (
              <>
                <div style={field}>
                  <label style={flabel}>Monthly Roasting Capacity (kg)</label>
                  <input style={AC.input} type="number" placeholder="300" value={form.roastery_monthly_capacity_kg ?? ""} onChange={(e) => set("roastery_monthly_capacity_kg", e.target.value)} />
                </div>
                <div style={field}>
                  <label style={flabel}>Roast Styles (comma separated)</label>
                  <input style={AC.input} placeholder="light, medium, dark" value={form.roastery_roast_styles || ""} onChange={(e) => set("roastery_roast_styles", e.target.value)} />
                </div>
                <div style={field}>
                  <label style={flabel}>Preferred Origins (comma separated)</label>
                  <input style={AC.input} placeholder="Yirgacheffe, Guji" value={form.roastery_preferred_origins || ""} onChange={(e) => set("roastery_preferred_origins", e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div style={field}>
                  <p style={{ ...flabel, margin: "0 0 4px" }}><Package size={12} /> Monthly Capacity</p>
                  <p style={{ ...fval, margin: 0 }}>{p?.roastery_monthly_capacity_kg ? `${p.roastery_monthly_capacity_kg} kg` : "—"}</p>
                </div>
                <div style={field}>
                  <p style={{ ...flabel, margin: "0 0 6px" }}><Flame size={12} /> Roast Styles</p>
                  {roastStyles.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {roastStyles.map((t) => (
                        <span key={t} style={{ padding: "3px 10px", background: AT.color.surfaceSecondary, border: `1px solid ${AT.color.border}`, borderRadius: AT.radius.pill, fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.textSecondary, textTransform: "capitalize" }}>{t}</span>
                      ))}
                    </div>
                  ) : <p style={{ ...fval, margin: 0 }}>—</p>}
                </div>
                <div style={field}>
                  <p style={{ ...flabel, margin: "0 0 6px" }}><Leaf size={12} /> Preferred Origins</p>
                  {preferredOrigins.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {preferredOrigins.map((t) => (
                        <span key={t} style={{ padding: "3px 10px", background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, borderRadius: AT.radius.pill, fontFamily: AT.font.sans, fontSize: "0.72rem", color: AT.color.primaryDark, textTransform: "capitalize" }}>{t}</span>
                      ))}
                    </div>
                  ) : <p style={{ ...fval, margin: 0 }}>—</p>}
                </div>
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
                  { label: "Phone", key: "phone", placeholder: "+46…" },
                  { label: "Country", key: "country", placeholder: "Sweden" },
                ].map((f) => (
                  <div key={f.key} style={field}>
                    <label style={flabel}>{f.label}</label>
                    <input style={AC.input} placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key] || ""}
                      onChange={(e) => set(f.key as keyof RoasterProfile, e.target.value)} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: "Full Name", val: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "—" },
                  { label: "Email", val: user?.email || "—" },
                  { label: "Phone", val: p?.phone || "—" },
                  { label: "Country", val: p?.country || "—" },
                ].map((f) => (
                  <div key={f.label} style={field}>
                    <p style={{ ...flabel, margin: "0 0 4px" }}>{f.label}</p>
                    <p style={{ fontFamily: AT.font.mono, fontSize: "0.8rem", color: AT.color.text, margin: 0 }}>{f.val}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{ ...AC.card, ...AC.cardPad }}>
            <p style={cardTitle}>Quick Actions</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button onClick={() => navigate("/marketplace")} style={AC.btnPrimary}>
                <ShoppingBag size={14} /> <span style={{ flex: 1, textAlign: "left" }}>Browse Marketplace</span>
              </button>
              <button onClick={() => navigate("/buyer/offers")} style={AC.btnGhost}>
                <TrendingUp size={14} /> <span style={{ flex: 1, textAlign: "left" }}>My Offers</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) { .ab-roastery-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .ab-roastery-header { flex-direction: column; } }
      `}</style>
    </AdminShell>
  );
}
