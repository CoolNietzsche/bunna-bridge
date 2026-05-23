import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFarmerProfile, getFarmerLots, updateFarmerProfile } from "../api/farmer";
import type { FarmerProfile } from "../api/farmer";
import PageWrapper from "../components/PageWrapper";
import PolygonCaptureWidget from '../components/PolygonCaptureWidget';
import FarmMapDisplay from '../components/FarmMapDisplay';
import StatusPill from "../components/StatusPill";
import {
  Sprout, MapPin, Mountain, Ruler, Users,
  Edit2, Check, X, Coffee, ExternalLink
} from "lucide-react";

export default function MyFarm() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<Partial<FarmerProfile>>({});
  const [saved, setSaved]     = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["farmer-profile"],
    queryFn:  getFarmerProfile,
  });

  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ["farmer-lots"],
    queryFn:  getFarmerLots,
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
      farm_name:       profile?.farm_name       || "",
      farm_region:     profile?.farm_region      || "",
      farm_kebele:     profile?.farm_kebele      || "",
      farm_altitude_m: profile?.farm_altitude_m  || undefined,
      farm_size_ha:    profile?.farm_size_ha     || "",
      cooperative:     profile?.cooperative      || "",
      gps_lat:         profile?.gps_lat          || "",
      gps_lng:         profile?.gps_lng          || "",
      phone:           profile?.phone    || "",
      country:         profile?.country  || "",
    });
    setEditing(true);
  };

  const handleSave = () => updateMutation.mutate(form);
  const set = (k: keyof FarmerProfile, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const S = {
    header:    { marginBottom: "24px" },
    title:     { fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: "0 0 4px", fontFamily: "Cormorant Garamond, serif" },
    sub:       { fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#D4824A", textTransform: "uppercase" as const },
    grid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" },
    card:      { background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", padding: "20px" },
    cardTitle: { fontFamily: "DM Mono, monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#D4824A", margin: "0 0 16px" },
    statGrid:  { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" },
    stat:      { background: "rgba(245,237,216,0.03)", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "2px", padding: "12px" },
    statVal:   { fontFamily: "Cormorant Garamond, serif", fontSize: "1.8rem", fontWeight: 300, color: "#C9952A", lineHeight: 1, marginBottom: "4px" },
    statLbl:   { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" as const },
    field:     { marginBottom: "14px" },
    flabel:    { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.35)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" },
    fval:      { fontSize: "0.9rem", color: "#F5EDD8" },
    fvalMono:  { fontFamily: "DM Mono, monospace", fontSize: "0.8rem", color: "#F5EDD8" },
    input:     { width: "100%", background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "8px 10px", color: "#F5EDD8", fontFamily: "DM Mono, monospace", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" as const },
    gpsBox:    { background: "rgba(30,58,47,0.3)", border: "1px solid rgba(74,124,89,0.25)", borderRadius: "2px", padding: "12px", marginTop: "8px" },
    gpsRow:    { display: "flex", justifyContent: "space-between", marginBottom: "4px" },
    gpsLbl:    { fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.3)", letterSpacing: "0.08em" },
    gpsVal:    { fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#A8C5A0" },
    editBtn:   { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "6px 12px", color: "rgba(245,237,216,0.5)", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" },
    saveBtn:   { display: "flex", alignItems: "center", gap: "6px", background: "#1E3A2F", border: "1px solid rgba(74,124,89,0.4)", borderRadius: "2px", padding: "6px 14px", color: "#A8C5A0", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" },
    cancelBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "6px 12px", color: "#C1440E", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" as const, cursor: "pointer" },
    savedMsg:  { display: "flex", alignItems: "center", gap: "6px", fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#A8C5A0" },
    lotRow:    { display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "2px", border: "1px solid transparent", cursor: "pointer", transition: "all 0.15s" },
    lotId:     { fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#C9952A", minWidth: "120px" },
    lotName:   { fontSize: "0.88rem", color: "#F5EDD8", flex: 1 },
    lotSca:    { fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "#C9952A" },
    empty:     { fontFamily: "DM Mono, monospace", fontSize: "0.72rem", color: "rgba(245,237,216,0.25)", textAlign: "center" as const, padding: "24px 0" },
  };

  if (profileLoading) return (
    <PageWrapper>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ fontFamily: "DM Mono, monospace", color: "#D4824A", letterSpacing: "0.2em", fontSize: "0.75rem" }}>
          LOADING FARM PROFILE...
        </p>
      </div>
    </PageWrapper>
  );

  const p = profile;
  const displayName = p?.farm_name || user?.company_name || "My Farm";

  return (
    <PageWrapper>
      {/* Header */}
      <div style={{ ...S.header, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={S.title}>{displayName}</h1>
          <p style={S.sub}>
            {p?.cooperative || "Farm Profile"} · {p?.farm_region || "Ethiopia"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {saved && (
            <span style={S.savedMsg}>
              <Check size={13} /> Saved
            </span>
          )}
          {editing ? (
            <>
              <button style={S.cancelBtn} onClick={() => setEditing(false)}>
                <X size={13} /> Cancel
              </button>
              <button style={S.saveBtn}
                onClick={handleSave}
                disabled={updateMutation.isPending}>
                <Check size={13} />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button style={S.editBtn} onClick={startEdit}>
              <Edit2 size={13} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { icon: <Mountain size={14} />, val: p?.farm_altitude_m ? `${p.farm_altitude_m}m` : "—", lbl: "Altitude" },
          { icon: <Ruler size={14} />,    val: p?.farm_size_ha    ? `${p.farm_size_ha} ha` : "—", lbl: "Farm Size" },
          { icon: <Coffee size={14} />,   val: lots?.length ?? "—",                                lbl: "Linked Lots" },
          { icon: <Users size={14} />,    val: p?.cooperative     ? "✓" : "—",                     lbl: "Cooperative" },
        ].map(s => (
          <div key={s.lbl} style={S.stat}>
            <div style={{ color: "#D4824A", marginBottom: "8px" }}>{s.icon}</div>
            <p style={{ ...S.statVal, margin: "0 0 4px" }}>{s.val}</p>
            <p style={{ ...S.statLbl, margin: 0 }}>{s.lbl}</p>
          </div>
        ))}
      </div>

      <div style={S.grid}>
        {/* Left — Farm details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Farm Identity */}
          <div style={S.card}>
            <p style={S.cardTitle}>Farm Identity</p>
            {editing ? (
              <>
                {[
                  { label: "Farm Name",    key: "farm_name",   placeholder: "Kochere Highland Farm" },
                  { label: "Cooperative",  key: "cooperative", placeholder: "Kochere Cooperative" },
                  { label: "Region",       key: "farm_region", placeholder: "yirgacheffe" },
                  { label: "Kebele",       key: "farm_kebele", placeholder: "Kochere" },
                ].map(f => (
                  <div key={f.key} style={S.field}>
                    <label style={S.flabel}>{f.label}</label>
                    <input style={S.input} placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key] || ""}
                      onChange={e => set(f.key as keyof FarmerProfile, e.target.value)} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { icon: <Sprout size={12} />,  label: "Farm Name",   val: p?.farm_name   || "—" },
                  { icon: <Users size={12} />,   label: "Cooperative", val: p?.cooperative || "—" },
                  { icon: <MapPin size={12} />,  label: "Region",      val: p?.farm_region || "—" },
                  { icon: <MapPin size={12} />,  label: "Kebele",      val: p?.farm_kebele || "—" },
                ].map(f => (
                  <div key={f.label} style={S.field}>
                    <p style={{ ...S.flabel, margin: "0 0 4px" }}>{f.icon} {f.label}</p>
                    <p style={{ ...S.fval, margin: 0, textTransform: f.label === "Region" ? "capitalize" : "none" as const }}>
                      {f.val}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Technical Details */}
          <div style={S.card}>
            <p style={S.cardTitle}>Technical Details</p>
            {editing ? (
              <>
                {[
                  { label: "Altitude (masl)", key: "farm_altitude_m", type: "number", placeholder: "1950" },
                  { label: "Farm Size (ha)",  key: "farm_size_ha",    type: "number", placeholder: "0.4"  },
                  { label: "GPS Latitude",    key: "gps_lat",         type: "number", placeholder: "6.3241" },
                  { label: "GPS Longitude",   key: "gps_lng",         type: "number", placeholder: "38.2149" },
                ].map(f => (
                  <div key={f.key} style={S.field}>
                    <label style={S.flabel}>{f.label}</label>
                    <input style={S.input} type={f.type} placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key] || ""}
                      onChange={e => set(f.key as keyof FarmerProfile, e.target.value)} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { icon: <Mountain size={12} />, label: "Altitude",  val: p?.farm_altitude_m ? `${p.farm_altitude_m} masl` : "—" },
                  { icon: <Ruler size={12} />,    label: "Farm Size", val: p?.farm_size_ha    ? `${p.farm_size_ha} hectares` : "—" },
                ].map(f => (
                  <div key={f.label} style={S.field}>
                    <p style={{ ...S.flabel, margin: "0 0 4px" }}>{f.icon} {f.label}</p>
                    <p style={{ ...S.fval, margin: 0 }}>{f.val}</p>
                  </div>
                ))}

                {/* GPS Box */}
                {(p?.gps_lat || p?.gps_lng) && (
                  <div style={S.gpsBox}>
                    <p style={{ ...S.flabel, margin: "0 0 8px" }}>
                      <MapPin size={12} color="#A8C5A0" /> GPS Coordinates
                    </p>
                    <div style={S.gpsRow}>
                      <span style={S.gpsLbl}>Latitude</span>
                      <span style={S.gpsVal}>{p?.gps_lat}°N</span>
                    </div>
                    <div style={S.gpsRow}>
                      <span style={S.gpsLbl}>Longitude</span>
                      <span style={S.gpsVal}>{p?.gps_lng}°E</span>
                    </div>
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(74,124,89,0.2)" }}>
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#A8C5A0" }}>
                        ✓ EUDR-compliant GPS point recorded
                      </span>
                    </div>
                  </div>
                )}

                {!p?.gps_lat && (
                  <div style={{ ...S.gpsBox, background: "rgba(193,68,14,0.08)", borderColor: "rgba(193,68,14,0.2)" }}>
                    <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.65rem", color: "#C1440E", margin: 0 }}>
                      ⚠ GPS coordinates not set — required for EUDR compliance
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right — Contact + Lots */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Contact */}
          <div style={S.card}>
            <p style={S.cardTitle}>Contact & Account</p>
            {editing ? (
              <>
                {[
                  { label: "Phone",   key: "phone",   placeholder: "+251..." },
                  { label: "Country", key: "country", placeholder: "Ethiopia" },
                ].map(f => (
                  <div key={f.key} style={S.field}>
                    <label style={S.flabel}>{f.label}</label>
                    <input style={S.input} placeholder={f.placeholder}
                      value={(form as Record<string, string>)[f.key] || ""}
                      onChange={e => set(f.key as keyof FarmerProfile, e.target.value)} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: "Full Name", val: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "—" },
                  { label: "Email",     val: user?.email    || "—" },
                  { label: "Phone",     val: p?.phone       || "—" },
                  { label: "Country",   val: p?.country     || "Ethiopia" },
                ].map(f => (
                  <div key={f.label} style={S.field}>
                    <p style={{ ...S.flabel, margin: "0 0 4px" }}>{f.label}</p>
                    <p style={{ ...S.fvalMono, margin: 0 }}>{f.val}</p>
                  </div>
                ))}

                {/* EUDR status */}
                <div style={{ marginTop: "12px", padding: "10px", background: p?.gps_lat ? "rgba(30,58,47,0.3)" : "rgba(193,68,14,0.08)", border: `1px solid ${p?.gps_lat ? "rgba(74,124,89,0.25)" : "rgba(193,68,14,0.2)"}`, borderRadius: "2px" }}>
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: p?.gps_lat ? "#A8C5A0" : "#C1440E", margin: 0, letterSpacing: "0.05em" }}>
                    {p?.gps_lat
                      ? "🌿 EUDR GPS Profile Complete"
                      : "⚠ EUDR GPS Profile Incomplete — Edit profile to add coordinates"}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Linked Lots */}
          <div style={S.card}>
            <p style={S.cardTitle}>
              Linked Lots ({lotsLoading ? "..." : lots?.length ?? 0})
            </p>
            {lotsLoading && (
              <p style={S.empty}>Loading lots...</p>
            )}
            {!lotsLoading && (!lots || lots.length === 0) && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Coffee size={20} style={{ color: "rgba(245,237,216,0.15)", marginBottom: "8px" }} />
                <p style={S.empty}>No lots linked to your farm yet.</p>
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.62rem", color: "rgba(245,237,216,0.2)" }}>
                  Lots from your kebele ({p?.farm_kebele || "—"}) will appear here.
                </p>
              </div>
            )}
            {lots && lots.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {lots.map(lot => (
                  <div key={lot.id} style={S.lotRow}
                    onClick={() => navigate(`/lots/${lot.id}`)}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(245,237,216,0.03)";
                      e.currentTarget.style.borderColor = "rgba(245,237,216,0.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}>
                    <span style={S.lotId}>{lot.lot_id}</span>
                    <span style={S.lotName}>{lot.name}</span>
                    {lot.sca_score && (
                      <span style={S.lotSca}>{lot.sca_score} pts</span>
                    )}
                    <StatusPill status={lot.status} />
                    <ExternalLink size={12} color="rgba(245,237,216,0.2)" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Farm Boundary */}
      <div style={{ marginTop: "24px" }}>
        {p?.boundary && (
          <div style={{ marginBottom: "16px" }}>
            <FarmMapDisplay
              polygon={p.boundary}
              label="Farm Boundary"
              height={240}
            />
          </div>
        )}
        <PolygonCaptureWidget
          mode="farm"
          existingPolygon={p?.boundary ?? null}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['farmer-profile'] })}
        />
      </div>
    </PageWrapper>
  );
}
