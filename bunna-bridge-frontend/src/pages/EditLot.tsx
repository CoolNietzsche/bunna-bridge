import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLot, updateLot } from "../api/lots";
import PageWrapper from "../components/PageWrapper";

const REGIONS    = ["yirgacheffe","sidama","guji","jimma","harrar","limu","nekemte","other"];
const GRADES     = ["G1","G2","G3"];
const PROCESSING = ["washed","natural","honey"];

type Step = "origin" | "quality" | "compliance" | "review";
const STEPS: Step[] = ["origin", "quality", "compliance", "review"];
const STEP_LABELS: Record<Step, string> = {
  origin:     "01 · Origin & Identity",
  quality:    "02 · Quality",
  compliance: "03 · Compliance",
  review:     "04 · Review & Save",
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
};

export default function EditLot() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
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

  // Pre-fill form when lot loads
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
    });
    setReady(true);
  }, [lot]);

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const stepIndex = STEPS.indexOf(step);

  const s = {
    page:      { padding: "2rem 2.5rem", maxWidth: "860px" },
    hdr:       { marginBottom: "2rem" },
    title:     { fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: "0 0 0.25rem" },
    sub:       { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#D4824A", textTransform: "uppercase" as const },
    stepper:   { display: "flex", gap: "0", marginBottom: "2.5rem", overflowX: "auto" as const },
    stepItem:  (active: boolean, done: boolean) => ({
      flex: 1, padding: "0.75rem 1rem", fontFamily: "monospace",
      fontSize: "0.58rem", letterSpacing: "0.1em", whiteSpace: "nowrap" as const,
      textTransform: "uppercase" as const,
      borderBottom: `2px solid ${active ? "#C1440E" : done ? "#4A7C59" : "rgba(245,237,216,0.1)"}`,
      color: active ? "#C1440E" : done ? "#A8C5A0" : "rgba(245,237,216,0.3)",
      cursor: done ? "pointer" : "default",
    }),
    card:      { background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", padding: "2rem", marginBottom: "1.5rem" },
    cardTitle: { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#D4824A", margin: "0 0 1.5rem" },
    grid2:     { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "1.2rem" },
    grid3:     { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "1.2rem" },
    field:     { display: "flex", flexDirection: "column" as const, gap: "0.4rem" },
    label:     { fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)" },
    input:     { background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", transition: "border-color 0.2s" },
    inputReadonly: { background: "rgba(245,237,216,0.03)", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "rgba(245,237,216,0.35)", fontFamily: "monospace", fontSize: "0.8rem", outline: "none" },
    select:    { background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.8rem", outline: "none" },
    toggle:    (on: boolean) => ({
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem 1rem", borderRadius: "2px", cursor: "pointer",
      background: on ? "rgba(74,124,89,0.15)" : "rgba(245,237,216,0.04)",
      border: `1px solid ${on ? "rgba(74,124,89,0.35)" : "rgba(245,237,216,0.1)"}`,
      transition: "all 0.2s",
    }),
    toggleDot: (on: boolean) => ({
      width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
      background: on ? "#A8C5A0" : "rgba(245,237,216,0.2)",
    }),
    toggleLbl: { fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(245,237,216,0.7)" },
    actions:   { display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "center" },
    btnPrimary:{ background: "#C1440E", border: "none", borderRadius: "2px", padding: "0.8rem 2rem", color: "white", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer" },
    btnGhost:  { background: "none", border: "1px solid rgba(245,237,216,0.15)", borderRadius: "2px", padding: "0.8rem 1.5rem", color: "rgba(245,237,216,0.5)", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, cursor: "pointer" },
    reviewRow: { display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid rgba(245,237,216,0.05)" },
    rLabel:    { fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" as const },
    rVal:      { fontFamily: "monospace", fontSize: "0.72rem", color: "#F5EDD8" },
    err:       { background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#C1440E", marginBottom: "1rem" },
    hint:      { fontFamily: "monospace", fontSize: "0.58rem", color: "rgba(245,237,216,0.2)", marginTop: "0.4rem" },
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name:             form.name,
        region:           form.region,
        kebele:           form.kebele,
        washing_station:  form.washing_station,
        altitude_m:       parseInt(form.altitude_m),
        processing:       form.processing,
        grade:            form.grade,
        varietal:         form.varietal || "Ethiopian Heirloom",
        harvest_date:     form.harvest_date,
        volume_kg:        parseFloat(form.volume_kg),
        price_per_kg:     form.price_per_kg ? parseFloat(form.price_per_kg) : null,
        sca_score:        form.sca_score ? parseFloat(form.sca_score) : null,
        flavor_notes:     form.flavor_notes,
        q_grader_name:    form.q_grader_name,
        q_grader_cert_id: form.q_grader_cert_id,
        cupping_date:     form.cupping_date || null,
        deforestation_free:  form.deforestation_free,
        gps_verified:        form.gps_verified,
        phyto_cert_uploaded: form.phyto_cert_uploaded,
        ecta_license_active: form.ecta_license_active,
        nbe_fx_declared:     form.nbe_fx_declared,
        cta_floor_met:       form.cta_floor_met,
        eudr_dds_ready:      form.eudr_dds_ready,
      };
      if (form.gps_lat && form.gps_lng) {
        payload.farm_location = {
          type: "Point",
          coordinates: [parseFloat(form.gps_lng), parseFloat(form.gps_lat)],
        };
      }
      await updateLot(id!, payload as never);
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

  const Field = ({ label, k, type = "text", placeholder = "", readonly = false }: {
    label: string; k: keyof FormData; type?: string; placeholder?: string; readonly?: boolean;
  }) => (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input
        style={readonly ? s.inputReadonly : s.input}
        type={type}
        placeholder={placeholder}
        value={form[k] as string}
        readOnly={readonly}
        onChange={e => !readonly && set(k, e.target.value)}
        onFocus={e => !readonly && (e.target.style.borderColor = "rgba(193,68,14,0.5)")}
        onBlur={e  => !readonly && (e.target.style.borderColor = "rgba(245,237,216,0.12)")}
      />
      {readonly && <span style={s.hint}>Lot ID cannot be changed after creation</span>}
    </div>
  );

  const Toggle = ({ label, k }: { label: string; k: keyof FormData }) => (
    <div style={s.toggle(form[k] as boolean)} onClick={() => set(k, !(form[k] as boolean))}>
      <div style={s.toggleDot(form[k] as boolean)} />
      <span style={s.toggleLbl}>{form[k] ? "✓ " : ""}{label}</span>
    </div>
  );

  if (lotLoading || !ready) return (
    <PageWrapper>
      <div style={{ padding: "2rem", fontFamily: "monospace", fontSize: "0.75rem", color: "rgba(245,237,216,0.3)" }}>
        Loading lot...
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div style={s.page}>
        <div style={s.hdr}>
          <h1 style={s.title}>Edit Lot — {lot?.lot_id}</h1>
          <p style={s.sub}>Update lot details · Changes saved immediately on submit</p>
        </div>

        <div style={s.stepper}>
          {STEPS.map((st, i) => (
            <div key={st} style={s.stepItem(st === step, i < stepIndex)}
              onClick={() => i < stepIndex && setStep(st)}>
              {STEP_LABELS[st]}
            </div>
          ))}
        </div>

        {/* Step 1: Origin */}
        {step === "origin" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>Lot Identity</p>
              <div style={s.grid2}>
                <Field label="Lot ID" k="lot_id" readonly={true} />
                <Field label="Lot Name *" k="name" placeholder="e.g. Kochere Washed G1" />
              </div>
            </div>
            <div style={s.card}>
              <p style={s.cardTitle}>Origin Details</p>
              <div style={s.grid3}>
                <div style={s.field}>
                  <label style={s.label}>Region *</label>
                  <select style={s.select} value={form.region} onChange={e => set("region", e.target.value)}>
                    {REGIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Grade *</label>
                  <select style={s.select} value={form.grade} onChange={e => set("grade", e.target.value)}>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Processing *</label>
                  <select style={s.select} value={form.processing} onChange={e => set("processing", e.target.value)}>
                    {PROCESSING.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ ...s.grid2, marginTop: "1.2rem" }}>
                <Field label="Kebele"            k="kebele"          placeholder="e.g. Kochere" />
                <Field label="Washing Station"   k="washing_station" placeholder="e.g. Kochere WS" />
                <Field label="Altitude (masl) *" k="altitude_m"      type="number" />
                <Field label="Harvest Date *"    k="harvest_date"    type="date" />
              </div>
            </div>
            <div style={s.card}>
              <p style={s.cardTitle}>GPS Coordinates (EUDR)</p>
              <div style={s.grid2}>
                <Field label="Latitude"  k="gps_lat" type="number" placeholder="e.g. 6.3241" />
                <Field label="Longitude" k="gps_lng" type="number" placeholder="e.g. 38.2149" />
              </div>
            </div>
            <div style={s.card}>
              <p style={s.cardTitle}>Commercial</p>
              <div style={s.grid2}>
                <Field label="Volume (kg) *"  k="volume_kg"    type="number" />
                <Field label="Price / kg ($)" k="price_per_kg" type="number" />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Quality */}
        {step === "quality" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>SCA Cupping Score</p>
              <div style={s.grid3}>
                <Field label="SCA Score (80–100)" k="sca_score"    type="number" />
                <Field label="Cupping Date"        k="cupping_date" type="date" />
                <Field label="Varietal"            k="varietal" />
              </div>
            </div>
            <div style={s.card}>
              <p style={s.cardTitle}>Q-Grader</p>
              <div style={s.grid2}>
                <Field label="Q-Grader Name" k="q_grader_name" />
                <Field label="SCA Cert ID"   k="q_grader_cert_id" />
              </div>
            </div>
            <div style={s.card}>
              <p style={s.cardTitle}>Flavor Notes</p>
              <div style={s.field}>
                <label style={s.label}>Flavor Notes (comma separated)</label>
                <input style={s.input}
                  placeholder="e.g. Jasmine, Bergamot, Lemon Zest"
                  value={form.flavor_notes}
                  onChange={e => set("flavor_notes", e.target.value)}
                  onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = "rgba(245,237,216,0.12)")}
                />
              </div>
              {form.flavor_notes && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.75rem" }}>
                  {form.flavor_notes.split(",").map(f => f.trim()).filter(Boolean).map(f => (
                    <span key={f} style={{ padding: "0.25rem 0.6rem", background: "rgba(201,149,42,0.1)", border: "1px solid rgba(201,149,42,0.2)", borderRadius: "2px", fontFamily: "monospace", fontSize: "0.58rem", color: "#C9952A" }}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 3: Compliance */}
        {step === "compliance" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>EUDR Compliance Gates</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <Toggle label="GPS Coordinates Verified"           k="gps_verified" />
                <Toggle label="Deforestation-Free (post Dec 2020)" k="deforestation_free" />
                <Toggle label="EUDR Due Diligence Statement Ready" k="eudr_dds_ready" />
              </div>
            </div>
            <div style={s.card}>
              <p style={s.cardTitle}>Ethiopian Regulatory Gates</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <Toggle label="Phytosanitary Certificate Uploaded" k="phyto_cert_uploaded" />
                <Toggle label="ECTA Export License Active"          k="ecta_license_active" />
                <Toggle label="NBE FX Declaration Filed (50/50)"    k="nbe_fx_declared" />
                <Toggle label="CTA Floor Price Met"                 k="cta_floor_met" />
              </div>
            </div>
            <div style={{ ...s.card, background: "rgba(30,58,47,0.4)", border: "1px solid rgba(74,124,89,0.2)" }}>
              <p style={{ ...s.cardTitle, color: "#A8C5A0" }}>Live Gate Preview</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {[
                  ["GPS Verified",       form.gps_verified],
                  ["Deforestation Free", form.deforestation_free],
                  ["EUDR DDS",           form.eudr_dds_ready],
                  ["Phyto Cert",         form.phyto_cert_uploaded],
                  ["ECTA License",       form.ecta_license_active],
                  ["NBE FX",             form.nbe_fx_declared],
                  ["CTA Floor",          form.cta_floor_met],
                ].map(([label, pass]) => (
                  <span key={label as string} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.25rem 0.6rem", borderRadius: "2px",
                    fontFamily: "monospace", fontSize: "0.58rem",
                    background: pass ? "rgba(74,124,89,0.2)"  : "rgba(193,68,14,0.15)",
                    border:     pass ? "1px solid rgba(74,124,89,0.4)" : "1px solid rgba(193,68,14,0.3)",
                    color:      pass ? "#A8C5A0" : "#C1440E",
                  }}>
                    {pass ? "✓" : "✗"} {label as string}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 4: Review */}
        {step === "review" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>Review — Identity & Origin</p>
              {[
                ["Lot ID",       form.lot_id],
                ["Name",         form.name],
                ["Region",       form.region],
                ["Grade",        form.grade],
                ["Processing",   form.processing],
                ["Altitude",     form.altitude_m ? `${form.altitude_m} masl` : "—"],
                ["Volume",       form.volume_kg ? `${form.volume_kg} kg` : "—"],
                ["Price/kg",     form.price_per_kg ? `$${form.price_per_kg}` : "—"],
                ["Harvest Date", form.harvest_date],
                ["GPS",          form.gps_lat && form.gps_lng ? `${form.gps_lat}°N, ${form.gps_lng}°E` : "Not set"],
              ].map(([l, v]) => (
                <div key={l} style={s.reviewRow}>
                  <span style={s.rLabel}>{l}</span>
                  <span style={s.rVal}>{v || "—"}</span>
                </div>
              ))}
            </div>
            <div style={s.card}>
              <p style={s.cardTitle}>Review — Compliance Gates</p>
              {[
                ["GPS Verified",       form.gps_verified],
                ["Deforestation Free", form.deforestation_free],
                ["EUDR DDS Ready",     form.eudr_dds_ready],
                ["Phyto Cert",         form.phyto_cert_uploaded],
                ["ECTA License",       form.ecta_license_active],
                ["NBE FX Declared",    form.nbe_fx_declared],
                ["CTA Floor Met",      form.cta_floor_met],
              ].map(([l, v]) => (
                <div key={l as string} style={s.reviewRow}>
                  <span style={s.rLabel}>{l as string}</span>
                  <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: v ? "#A8C5A0" : "#C1440E" }}>
                    {v ? "✓ Pass" : "✗ Fail"}
                  </span>
                </div>
              ))}
            </div>
            {error && <div style={s.err}>{error}</div>}
          </>
        )}

        <div style={s.actions}>
          <button style={s.btnGhost}
            onClick={() => stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : navigate(`/lots/${id}`)}>
            {stepIndex === 0 ? "← Cancel" : "← Back"}
          </button>
          {step !== "review" ? (
            <button style={s.btnPrimary} onClick={() => setStep(STEPS[stepIndex + 1])}>
              Continue →
            </button>
          ) : (
            <button style={{ ...s.btnPrimary, opacity: loading ? 0.6 : 1 }}
              disabled={loading} onClick={handleSave}>
              {loading ? "Saving..." : "✓ Save Changes"}
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
