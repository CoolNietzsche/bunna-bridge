import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLot } from "../api/lots";
import apiClient from "../api/client";
import PageWrapper from "../components/PageWrapper";
import {
  MapPin, Leaf, FileCheck, Upload, ShieldCheck,
  TrendingUp, Award, CheckCircle, XCircle, ArrowLeft, ArrowRight, Save
} from "lucide-react";

const REGIONS    = ["yirgacheffe","sidama","guji","jimma","harrar","limu","nekemte","other"];
const GRADES     = ["G1","G2","G3"];
const PROCESSING = ["washed","natural","honey"];

type Step = "origin" | "quality" | "compliance" | "review";
const STEPS: Step[] = ["origin","quality","compliance","review"];
const STEP_LABELS: Record<Step, string> = {
  origin:     "Origin & Identity",
  quality:    "Quality",
  compliance: "Compliance",
  review:     "Review & Save",
};

interface FormData {
  lot_id: string; name: string; region: string; kebele: string;
  washing_station: string; altitude_m: string; processing: string;
  grade: string; varietal: string; harvest_date: string;
  volume_kg: string; price_per_kg: string; sca_score: string;
  flavor_notes: string; q_grader_name: string; q_grader_cert_id: string;
  cupping_date: string; gps_lat: string; gps_lng: string;
  deforestation_free: boolean; gps_verified: boolean;
  phyto_cert_uploaded: boolean; ecta_license_active: boolean;
  nbe_fx_declared: boolean; cta_floor_met: boolean; eudr_dds_ready: boolean;
  phyto_cert_file: File | null;
}

const EMPTY: FormData = {
  lot_id: "", name: "", region: "yirgacheffe", kebele: "",
  washing_station: "", altitude_m: "", processing: "washed",
  grade: "G1", varietal: "Ethiopian Heirloom", harvest_date: "",
  volume_kg: "", price_per_kg: "", sca_score: "", flavor_notes: "",
  q_grader_name: "", q_grader_cert_id: "", cupping_date: "",
  gps_lat: "", gps_lng: "",
  deforestation_free: false, gps_verified: false,
  phyto_cert_uploaded: false, ecta_license_active: false,
  nbe_fx_declared: false, cta_floor_met: false, eudr_dds_ready: false,
  phyto_cert_file: null,
};

const GATES = [
  { k: "gps_verified",        label: "GPS Coordinates Verified",           icon: <MapPin size={13} /> },
  { k: "deforestation_free",  label: "Deforestation-Free (post Dec 2020)", icon: <Leaf size={13} /> },
  { k: "eudr_dds_ready",      label: "EUDR Due Diligence Statement Ready", icon: <FileCheck size={13} /> },
  { k: "phyto_cert_uploaded", label: "Phytosanitary Certificate Uploaded", icon: <Upload size={13} /> },
  { k: "ecta_license_active", label: "ECTA Export License Active",         icon: <ShieldCheck size={13} /> },
  { k: "nbe_fx_declared",     label: "NBE FX Declaration Filed (50/50)",   icon: <TrendingUp size={13} /> },
  { k: "cta_floor_met",       label: "CTA Floor Price Met",                icon: <Award size={13} /> },
];

export default function EditLot() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep]       = useState<Step>("origin");
  const [form, setForm]       = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [ready, setReady]     = useState(false);

  const { data: lot, isLoading: lotLoading } = useQuery({
    queryKey: ["lot", id],
    queryFn:  () => getLot(id!),
    enabled:  !!id,
  });

  useEffect(() => {
    if (!lot) return;
    setForm({
      lot_id:           lot.lot_id,
      name:             lot.name,
      region:           lot.region,
      kebele:           lot.kebele || "",
      washing_station:  lot.washing_station || "",
      altitude_m:       String(lot.altitude_m || ""),
      processing:       lot.processing,
      grade:            lot.grade,
      varietal:         lot.varietal || "Ethiopian Heirloom",
      harvest_date:     lot.harvest_date || "",
      volume_kg:        String(lot.volume_kg || ""),
      price_per_kg:     lot.price_per_kg ? String(lot.price_per_kg) : "",
      sca_score:        lot.sca_score ? String(lot.sca_score) : "",
      flavor_notes:     lot.flavor_notes || "",
      q_grader_name:    lot.q_grader_name || "",
      q_grader_cert_id: lot.q_grader_cert_id || "",
      cupping_date:     lot.cupping_date || "",
      gps_lat:          lot.gps_lat ? String(lot.gps_lat) : "",
      gps_lng:          lot.gps_lng ? String(lot.gps_lng) : "",
      deforestation_free:  lot.deforestation_free,
      gps_verified:        lot.gps_verified,
      phyto_cert_uploaded: lot.phyto_cert_uploaded,
      ecta_license_active: lot.ecta_license_active,
      nbe_fx_declared:     lot.nbe_fx_declared,
      cta_floor_met:       lot.cta_floor_met,
      eudr_dds_ready:      lot.eudr_dds_ready,
      phyto_cert_file:     null,
    });
    setReady(true);
  }, [lot]);

  const set = (k: keyof FormData, v: string | boolean | File | null) =>
    setForm(f => ({ ...f, [k]: v }));

  const stepIndex = STEPS.indexOf(step);

  const inp = {
    width: "100%", background: "rgba(245,237,216,0.04)",
    border: "1px solid rgba(245,237,216,0.09)", borderRadius: "3px",
    padding: "9px 12px", color: "#F5EDD8",
    fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem",
    outline: "none", boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  };

  const inpReadonly = {
    ...inp,
    background: "rgba(245,237,216,0.02)",
    color: "rgba(245,237,216,0.3)",
    cursor: "not-allowed",
  };

  const sel = { ...inp, background: "#1A0F07" };

  const lbl = {
    display: "block", fontFamily: "DM Mono, monospace",
    fontSize: "0.55rem", letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "rgba(245,237,216,0.35)", marginBottom: "5px",
  };

  const card = {
    background: "#2C1810",
    border: "1px solid rgba(245,237,216,0.07)",
    borderRadius: "6px", padding: "24px", marginBottom: "16px",
  };

  const cardTitle = {
    fontFamily: "DM Mono, monospace", fontSize: "0.58rem",
    letterSpacing: "0.2em", textTransform: "uppercase" as const,
    color: "rgba(245,237,216,0.3)", margin: "0 0 18px",
  };

  const Field = ({ label, k, type = "text", placeholder = "", readonly = false }: {
    label: string; k: keyof FormData; type?: string; placeholder?: string; readonly?: boolean;
  }) => (
    <div>
      <label style={lbl}>{label}</label>
      <input
        style={readonly ? inpReadonly : inp}
        type={type} placeholder={placeholder}
        value={form[k] as string}
        readOnly={readonly}
        onChange={e => !readonly && set(k, e.target.value)}
        onFocus={e => !readonly && (e.target.style.borderColor = "rgba(193,68,14,0.4)")}
        onBlur={e  => !readonly && (e.target.style.borderColor = "rgba(245,237,216,0.09)")}
      />
      {readonly && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.52rem", color: "rgba(245,237,216,0.2)", margin: "4px 0 0" }}>
          Lot ID cannot be changed after creation
        </p>
      )}
    </div>
  );

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      // Use FormData for multipart/form-data to support file upload
      const fd = new FormData();

      // Text + boolean fields
      const fields: Record<string, string> = {
        name:             form.name,
        region:           form.region,
        kebele:           form.kebele,
        washing_station:  form.washing_station,
        altitude_m:       form.altitude_m,
        processing:       form.processing,
        grade:            form.grade,
        varietal:         form.varietal || "Ethiopian Heirloom",
        harvest_date:     form.harvest_date,
        volume_kg:        form.volume_kg,
        flavor_notes:     form.flavor_notes,
        q_grader_name:    form.q_grader_name,
        q_grader_cert_id: form.q_grader_cert_id,
      };

      if (form.price_per_kg) fields.price_per_kg = form.price_per_kg;
      if (form.sca_score)    fields.sca_score    = form.sca_score;
      if (form.cupping_date) fields.cupping_date  = form.cupping_date;

      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));

      // Booleans must be sent as strings in FormData
      fd.append("deforestation_free",  String(form.deforestation_free));
      fd.append("gps_verified",        String(form.gps_verified));
      fd.append("phyto_cert_uploaded", String(form.phyto_cert_uploaded));
      fd.append("ecta_license_active", String(form.ecta_license_active));
      fd.append("nbe_fx_declared",     String(form.nbe_fx_declared));
      fd.append("cta_floor_met",       String(form.cta_floor_met));
      fd.append("eudr_dds_ready",      String(form.eudr_dds_ready));

      // GPS point
      if (form.gps_lat && form.gps_lng) {
        fd.append("farm_location", JSON.stringify({
          type: "Point",
          coordinates: [parseFloat(form.gps_lng), parseFloat(form.gps_lat)],
        }));
      }

      // Phytosanitary certificate PDF — only append if a new file was chosen
      if (form.phyto_cert_file) {
        fd.append("phyto_cert_file", form.phyto_cert_file);
      }

      await apiClient.patch(`/v1/lots/${id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate(`/lots/${id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const msgs = Object.entries(err.response.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        setError(msgs);
      } else {
        setError("Failed to save changes. Please check all required fields.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (lotLoading || !ready) return (
    <PageWrapper>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.25)", letterSpacing: "0.2em" }}>
          LOADING LOT...
        </p>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div style={{ maxWidth: "820px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.75rem", fontWeight: 400, color: "#F5EDD8", margin: "0 0 4px" }}>
            Edit Lot — {lot?.lot_id}
          </h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)", margin: 0 }}>
            Update lot details · Changes saved on submit
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", marginBottom: "28px", background: "#2C1810", border: "1px solid rgba(245,237,216,0.07)", borderRadius: "6px", overflow: "hidden" }}>
          {STEPS.map((st, i) => {
            const active = st === step;
            const done   = i < stepIndex;
            return (
              <button key={st} onClick={() => done && setStep(st)}
                style={{
                  flex: 1, padding: "14px 8px", border: "none",
                  borderBottom: `2px solid ${active ? "#C1440E" : done ? "#4A7C59" : "transparent"}`,
                  background: active ? "rgba(193,68,14,0.06)" : "transparent",
                  cursor: done ? "pointer" : "default",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                }}
              >
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: active ? "#C1440E" : done ? "#A8C5A0" : "rgba(245,237,216,0.25)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.75rem", color: active ? "#C1440E" : done ? "#A8C5A0" : "rgba(245,237,216,0.35)", whiteSpace: "nowrap" }}>
                  {STEP_LABELS[st]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Step 1: Origin ── */}
        {step === "origin" && (
          <>
            <div style={card}>
              <p style={cardTitle}>Lot Identity</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
                <Field label="Lot ID" k="lot_id" readonly={true} />
                <Field label="Lot Name *" k="name" placeholder="e.g. Kochere Washed G1" />
              </div>
            </div>
            <div style={card}>
              <p style={cardTitle}>Origin Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "14px", marginBottom: "14px" }}>
                <div><label style={lbl}>Region *</label><select style={sel} value={form.region} onChange={e => set("region", e.target.value)}>{REGIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select></div>
                <div><label style={lbl}>Grade *</label><select style={sel} value={form.grade} onChange={e => set("grade", e.target.value)}>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><label style={lbl}>Processing *</label><select style={sel} value={form.processing} onChange={e => set("processing", e.target.value)}>{PROCESSING.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "14px" }}>
                <Field label="Kebele"            k="kebele"          placeholder="e.g. Kochere" />
                <Field label="Washing Station"   k="washing_station" placeholder="e.g. Kochere WS" />
                <Field label="Altitude (masl) *" k="altitude_m"      type="number" />
                <Field label="Harvest Date *"    k="harvest_date"    type="date" />
              </div>
            </div>
            <div style={card}>
              <p style={cardTitle}>GPS Coordinates</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="Latitude"  k="gps_lat" type="number" placeholder="6.3241" />
                <Field label="Longitude" k="gps_lng" type="number" placeholder="38.2149" />
              </div>
            </div>
            <div style={card}>
              <p style={cardTitle}>Commercial</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="Volume (kg) *"  k="volume_kg"    type="number" />
                <Field label="Price / kg ($)" k="price_per_kg" type="number" />
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Quality ── */}
        {step === "quality" && (
          <>
            <div style={card}>
              <p style={cardTitle}>SCA Cupping Score</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "14px" }}>
                <Field label="SCA Score (80–100)" k="sca_score"    type="number" placeholder="87.5" />
                <Field label="Cupping Date"        k="cupping_date" type="date" />
                <Field label="Varietal"            k="varietal" />
              </div>
            </div>
            <div style={card}>
              <p style={cardTitle}>Q-Grader</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <Field label="Q-Grader Name" k="q_grader_name" />
                <Field label="SCA Cert ID"   k="q_grader_cert_id" />
              </div>
            </div>
            <div style={card}>
              <p style={cardTitle}>Flavor Notes</p>
              <div>
                <label style={lbl}>Flavor notes (comma separated)</label>
                <input style={inp} placeholder="e.g. Jasmine, Bergamot, Lemon Zest"
                  value={form.flavor_notes}
                  onChange={e => set("flavor_notes", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.4)")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(245,237,216,0.09)")}
                />
              </div>
              {form.flavor_notes && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>
                  {form.flavor_notes.split(",").map(f => f.trim()).filter(Boolean).map(f => (
                    <span key={f} style={{ padding: "3px 10px", background: "rgba(201,149,42,0.08)", border: "1px solid rgba(201,149,42,0.2)", borderRadius: "20px", fontFamily: "DM Mono, monospace", fontSize: "0.58rem", color: "#C9952A" }}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 3: Compliance ── */}
        {step === "compliance" && (
          <>
            <div style={card}>
              <p style={cardTitle}>EUDR Compliance Gates</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {GATES.map(g => {
                  const on = form[g.k as keyof FormData] as boolean;
                  return (
                    <div key={g.k}
                      onClick={() => set(g.k as keyof FormData, !on)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px", borderRadius: "4px", cursor: "pointer",
                        background: on ? "rgba(30,58,47,0.2)" : "rgba(245,237,216,0.03)",
                        border: `1px solid ${on ? "rgba(74,124,89,0.3)" : "rgba(245,237,216,0.08)"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: on ? "#4A7C59" : "rgba(245,237,216,0.2)", flexShrink: 0 }}>{g.icon}</span>
                        <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", color: on ? "rgba(245,237,216,0.85)" : "rgba(245,237,216,0.4)" }}>{g.label}</span>
                      </div>
                      {on ? <CheckCircle size={16} color="#4A7C59" /> : <XCircle size={16} color="rgba(245,237,216,0.15)" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phytosanitary Certificate Upload */}
            <div style={card}>
              <p style={cardTitle}>Phytosanitary Certificate</p>
              <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "rgba(245,237,216,0.4)", marginBottom: "16px", lineHeight: 1.5 }}>
                Upload the phytosanitary certificate PDF. Uploading will automatically mark the Phytosanitary Certificate gate as passed.
              </p>
              <div style={{
                background: "#1E1208",
                border: "2px dashed #4A2515",
                borderRadius: "4px", padding: "20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
              }}>
                <Upload size={20} color="rgba(245,237,216,0.2)" />
                <label style={{ ...lbl, color: "#EDE0C4", marginBottom: 0, cursor: "pointer", textAlign: "center" }}>
                  {form.phyto_cert_file
                    ? form.phyto_cert_file.name
                    : "Click to select PDF or drag and drop"
                  }
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    set("phyto_cert_file", file);
                    if (file) set("phyto_cert_uploaded", true);
                  }}
                  style={{
                    color: "#F5EDD8",
                    fontFamily: "Instrument Sans, sans-serif",
                    fontSize: "0.825rem",
                    cursor: "pointer",
                  }}
                />
                {form.phyto_cert_file && (
                  <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#A8C5A0", margin: 0 }}>
                    {(form.phyto_cert_file.size / 1024).toFixed(1)} KB · PDF ready to upload
                  </p>
                )}
              </div>
              {lot?.phyto_cert_uploaded && !form.phyto_cert_file && (
                <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#A8C5A0", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle size={11} /> Certificate already on file — upload a new one to replace it
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Step 4: Review ── */}
        {step === "review" && (
          <>
            <div style={card}>
              <p style={cardTitle}>Identity & Origin</p>
              {[
                ["Lot ID",       form.lot_id],
                ["Name",         form.name],
                ["Region",       form.region],
                ["Grade",        form.grade],
                ["Processing",   form.processing],
                ["Altitude",     form.altitude_m ? `${form.altitude_m} masl` : "—"],
                ["Volume",       form.volume_kg ? `${form.volume_kg} kg` : "—"],
                ["Price/kg",     form.price_per_kg ? `$${form.price_per_kg}` : "—"],
                ["Harvest Date", form.harvest_date || "—"],
                ["GPS",          form.gps_lat && form.gps_lng ? `${form.gps_lat}°N, ${form.gps_lng}°E` : "Not set"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(245,237,216,0.05)" }}>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,216,0.3)" }}>{l}</span>
                  <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#F5EDD8" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={card}>
              <p style={cardTitle}>Compliance Gates</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {GATES.map(g => {
                  const pass = form[g.k as keyof FormData] as boolean;
                  return (
                    <div key={g.k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "3px", background: pass ? "rgba(30,58,47,0.12)" : "rgba(193,68,14,0.06)", border: `1px solid ${pass ? "rgba(74,124,89,0.2)" : "rgba(193,68,14,0.15)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: pass ? "#4A7C59" : "rgba(245,237,216,0.2)" }}>{g.icon}</span>
                        <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: pass ? "rgba(245,237,216,0.75)" : "rgba(245,237,216,0.35)" }}>{g.label}</span>
                      </div>
                      {pass ? <CheckCircle size={14} color="#4A7C59" /> : <XCircle size={14} color="rgba(193,68,14,0.4)" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phyto cert upload summary */}
            {form.phyto_cert_file && (
              <div style={{ ...card, background: "rgba(30,58,47,0.15)", border: "1px solid rgba(74,124,89,0.2)" }}>
                <p style={{ ...cardTitle, color: "#A8C5A0" }}>Phytosanitary Certificate</p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Upload size={14} color="#A8C5A0" />
                  <span style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#A8C5A0" }}>
                    {form.phyto_cert_file.name}
                  </span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "rgba(168,197,160,0.5)", marginLeft: "auto" }}>
                    {(form.phyto_cert_file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: "rgba(193,68,14,0.1)", border: "1px solid rgba(193,68,14,0.25)", borderRadius: "4px", padding: "12px 16px", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.825rem", color: "#C1440E", marginBottom: "16px" }}>
                {error}
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <button
            onClick={() => stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : navigate(`/lots/${id}`)}
            style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "1px solid rgba(245,237,216,0.1)", borderRadius: "3px", padding: "10px 18px", color: "rgba(245,237,216,0.5)", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}
          >
            <ArrowLeft size={14} /> {stepIndex === 0 ? "Cancel" : "Back"}
          </button>

          {step !== "review" ? (
            <button
              onClick={() => setStep(STEPS[stepIndex + 1])}
              style={{ display: "flex", alignItems: "center", gap: "7px", background: "#C1440E", border: "none", borderRadius: "3px", padding: "10px 20px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: "7px", background: loading ? "rgba(193,68,14,0.5)" : "#C1440E", border: "none", borderRadius: "3px", padding: "10px 20px", color: "white", fontFamily: "Instrument Sans, sans-serif", fontSize: "0.875rem", fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}
            >
              <Save size={14} /> {loading ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
