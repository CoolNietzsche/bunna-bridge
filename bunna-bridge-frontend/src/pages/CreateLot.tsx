import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createLot } from "../api/lots";
import PageWrapper from "../components/PageWrapper";

const REGIONS = ["yirgacheffe","sidama","guji","jimma","harrar","limu","nekemte","other"];
const GRADES  = ["G1","G2","G3"];
const PROCESSING = ["washed","natural","honey"];

type Step = "origin" | "quality" | "compliance" | "review";
const STEPS: Step[] = ["origin", "quality", "compliance", "review"];
const STEP_LABELS: Record<Step, string> = {
  origin:     "01 · Origin & Identity",
  quality:    "02 · Quality",
  compliance: "03 · Compliance",
  review:     "04 · Review & Submit",
};

interface FormData {
  lot_id: string;
  name: string;
  region: string;
  kebele: string;
  washing_station: string;
  altitude_m: string;
  processing: string;
  grade: string;
  varietal: string;
  harvest_date: string;
  volume_kg: string;
  price_per_kg: string;
  sca_score: string;
  flavor_notes: string;
  q_grader_name: string;
  q_grader_cert_id: string;
  cupping_date: string;
  gps_lat: string;
  gps_lng: string;
  deforestation_free: boolean;
  gps_verified: boolean;
  phyto_cert_uploaded: boolean;
  ecta_license_active: boolean;
  nbe_fx_declared: boolean;
  cta_floor_met: boolean;
  eudr_dds_ready: boolean;
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

export default function CreateLot() {
  const navigate           = useNavigate();
  const [step, setStep]    = useState<Step>("origin");
  const [form, setForm]    = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError]  = useState("");

  const set = (k: keyof FormData, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const stepIndex = STEPS.indexOf(step);

  const s = {
    page:     { padding: "2rem 2.5rem", maxWidth: "860px" },
    hdr:      { marginBottom: "2rem" },
    title:    { fontSize: "1.8rem", fontWeight: 300, color: "#F5EDD8", margin: "0 0 0.25rem" },
    sub:      { fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: "#D4824A", textTransform: "uppercase" as const },
    stepper:  { display: "flex", gap: "0", marginBottom: "2.5rem" },
    stepItem: (active: boolean, done: boolean) => ({
      flex: 1, padding: "0.75rem 1rem", fontFamily: "monospace",
      fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase" as const,
      borderBottom: `2px solid ${active ? "#C1440E" : done ? "#4A7C59" : "rgba(245,237,216,0.1)"}`,
      color: active ? "#C1440E" : done ? "#A8C5A0" : "rgba(245,237,216,0.3)",
      cursor: done ? "pointer" : "default",
    }),
    card:     { background: "#2C1810", border: "1px solid rgba(245,237,216,0.06)", borderRadius: "4px", padding: "2rem", marginBottom: "1.5rem" },
    cardTitle:{ fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "#D4824A", margin: "0 0 1.5rem" },
    grid2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" },
    grid3:    { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.2rem" },
    field:    { display: "flex", flexDirection: "column" as const, gap: "0.4rem" },
    label:    { fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(245,237,216,0.4)" },
    input:    { background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.8rem", outline: "none", transition: "border-color 0.2s" },
    select:   { background: "#1A0F07", border: "1px solid rgba(245,237,216,0.12)", borderRadius: "2px", padding: "0.65rem 0.9rem", color: "#F5EDD8", fontFamily: "monospace", fontSize: "0.8rem", outline: "none" },
    toggle:   (on: boolean) => ({
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem 1rem", borderRadius: "2px", cursor: "pointer",
      background: on ? "rgba(74,124,89,0.15)" : "rgba(245,237,216,0.04)",
      border: `1px solid ${on ? "rgba(74,124,89,0.35)" : "rgba(245,237,216,0.1)"}`,
      transition: "all 0.2s",
    }),
    toggleDot:(on: boolean) => ({
      width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
      background: on ? "#A8C5A0" : "rgba(245,237,216,0.2)",
    }),
    toggleLbl:{ fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.08em", color: "rgba(245,237,216,0.7)" },
    actions:  { display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "center" },
    btnPrimary:{ background: "#C1440E", border: "none", borderRadius: "2px", padding: "0.8rem 2rem", color: "white", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer" },
    btnGhost: { background: "none", border: "1px solid rgba(245,237,216,0.15)", borderRadius: "2px", padding: "0.8rem 1.5rem", color: "rgba(245,237,216,0.5)", fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, cursor: "pointer" },
    reviewRow:{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid rgba(245,237,216,0.05)" },
    rLabel:   { fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" as const },
    rVal:     { fontFamily: "monospace", fontSize: "0.72rem", color: "#F5EDD8" },
    err:      { background: "rgba(193,68,14,0.15)", border: "1px solid rgba(193,68,14,0.3)", borderRadius: "2px", padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.7rem", color: "#C1440E", marginBottom: "1rem" },
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        lot_id:           form.lot_id,
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
        status: "draft",
      };

      if (form.gps_lat && form.gps_lng) {
        payload.farm_location = {
          type: "Point",
          coordinates: [parseFloat(form.gps_lng), parseFloat(form.gps_lat)],
        };
      }

      const lot = await createLot(payload as never);
      navigate(`/lots/${lot.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      if (err.response?.data) {
        const msgs = Object.entries(err.response.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
        setError(msgs);
      } else {
        setError("Failed to create lot. Please check all required fields.");
      }
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, k, type = "text", placeholder = "" }: {
    label: string; k: keyof FormData; type?: string; placeholder?: string;
  }) => (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input style={s.input} type={type} placeholder={placeholder}
        value={form[k] as string}
        onChange={e => set(k, e.target.value)}
        onFocus={e => (e.target.style.borderColor = "rgba(193,68,14,0.5)")}
        onBlur={e  => (e.target.style.borderColor = "rgba(245,237,216,0.12)")}
      />
    </div>
  );

  const Toggle = ({ label, k }: { label: string; k: keyof FormData }) => (
    <div style={s.toggle(form[k] as boolean)} onClick={() => set(k, !(form[k] as boolean))}>
      <div style={s.toggleDot(form[k] as boolean)} />
      <span style={s.toggleLbl}>{form[k] ? "✓ " : ""}{label}</span>
    </div>
  );

  return (
    <PageWrapper>
      <div style={s.page}>
        <div style={s.hdr}>
          <h1 style={s.title}>Register Coffee Lot</h1>
          <p style={s.sub}>Digital Birth Certificate</p>
        </div>

        {/* Stepper */}
        <div style={s.stepper}>
          {STEPS.map((st, i) => (
            <div key={st} style={s.stepItem(st === step, i < stepIndex)}
              onClick={() => i < stepIndex && setStep(st)}>
              {STEP_LABELS[st]}
            </div>
          ))}
        </div>

        {/* ── Step 1: Origin ── */}
        {step === "origin" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>Lot Identity</p>
              <div style={s.grid2}>
                <Field label="Lot ID *"  k="lot_id"  placeholder="e.g. YRG-2026-0001" />
                <Field label="Lot Name *" k="name"   placeholder="e.g. Kochere Washed G1" />
              </div>
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>Origin Details</p>
              <div style={s.grid3}>
                <div style={s.field}>
                  <label style={s.label}>Region *</label>
                  <select style={s.select} value={form.region}
                    onChange={e => set("region", e.target.value)}>
                    {REGIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Grade *</label>
                  <select style={s.select} value={form.grade}
                    onChange={e => set("grade", e.target.value)}>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Processing *</label>
                  <select style={s.select} value={form.processing}
                    onChange={e => set("processing", e.target.value)}>
                    {PROCESSING.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ ...s.grid2, marginTop: "1.2rem" }}>
                <Field label="Kebele"            k="kebele"          placeholder="e.g. Kochere" />
                <Field label="Washing Station"   k="washing_station" placeholder="e.g. Kochere WS" />
                <Field label="Altitude (masl) *" k="altitude_m"      type="number" placeholder="e.g. 1950" />
                <Field label="Harvest Date *"    k="harvest_date"    type="date" />
              </div>
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>GPS Coordinates (EUDR)</p>
              <div style={s.grid2}>
                <Field label="Latitude"  k="gps_lat" type="number" placeholder="e.g. 6.3241" />
                <Field label="Longitude" k="gps_lng" type="number" placeholder="e.g. 38.2149" />
              </div>
              <p style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(245,237,216,0.25)", marginTop: "0.75rem" }}>
                For farms under 4 hectares, a single GPS point is sufficient for EUDR compliance.
              </p>
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>Commercial</p>
              <div style={s.grid2}>
                <Field label="Volume (kg) *" k="volume_kg"    type="number" placeholder="e.g. 3200" />
                <Field label="Price / kg ($)" k="price_per_kg" type="number" placeholder="e.g. 6.42" />
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Quality ── */}
        {step === "quality" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>SCA Cupping Score</p>
              <div style={s.grid3}>
                <Field label="SCA Score (80–100)" k="sca_score"    type="number" placeholder="e.g. 87.5" />
                <Field label="Cupping Date"        k="cupping_date" type="date" />
                <Field label="Varietal"            k="varietal"     placeholder="Ethiopian Heirloom" />
              </div>
              {form.sca_score && (
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(201,149,42,0.08)", border: "1px solid rgba(201,149,42,0.15)", borderRadius: "2px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontFamily: "serif", fontSize: "2rem", fontWeight: 300, color: "#C9952A" }}>{form.sca_score}</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "#C9952A" }}>pts</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(245,237,216,0.35)", marginLeft: "0.5rem" }}>
                      {parseFloat(form.sca_score) >= 90 ? "Outstanding" :
                       parseFloat(form.sca_score) >= 85 ? "Excellent" :
                       parseFloat(form.sca_score) >= 80 ? "Specialty" : "Below Specialty"}
                    </span>
                  </div>
                  <div style={{ height: "4px", background: "rgba(245,237,216,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${((parseFloat(form.sca_score) - 80) / 20) * 100}%`, background: "linear-gradient(to right, #C1440E, #C9952A)", borderRadius: "2px" }} />
                  </div>
                </div>
              )}
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>Q-Grader</p>
              <div style={s.grid2}>
                <Field label="Q-Grader Name"    k="q_grader_name"    placeholder="Full name" />
                <Field label="SCA Cert ID"       k="q_grader_cert_id" placeholder="e.g. SCA-3847" />
              </div>
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>Flavor Notes</p>
              <div style={s.field}>
                <label style={s.label}>Flavor Notes (comma separated)</label>
                <input style={s.input} placeholder="e.g. Jasmine, Bergamot, Lemon Zest, Stone Fruit"
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

        {/* ── Step 3: Compliance ── */}
        {step === "compliance" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>EUDR Compliance Gates</p>
              <p style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "rgba(245,237,216,0.3)", marginBottom: "1.2rem", lineHeight: 1.6 }}>
                All gates must pass before the Export button is unlocked. Toggle each gate as documentation is confirmed.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <Toggle label="GPS Coordinates Verified"      k="gps_verified" />
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

            {/* Live compliance preview */}
            <div style={{ ...s.card, background: "rgba(30,58,47,0.4)", border: "1px solid rgba(74,124,89,0.2)" }}>
              <p style={{ ...s.cardTitle, color: "#A8C5A0" }}>Live Gate Preview</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {[
                  ["GPS Verified",        form.gps_verified],
                  ["Deforestation Free",  form.deforestation_free],
                  ["EUDR DDS",            form.eudr_dds_ready],
                  ["Phyto Cert",          form.phyto_cert_uploaded],
                  ["ECTA License",        form.ecta_license_active],
                  ["NBE FX",              form.nbe_fx_declared],
                  ["CTA Floor",           form.cta_floor_met],
                ].map(([label, pass]) => (
                  <span key={label as string} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.25rem 0.6rem", borderRadius: "2px",
                    fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.08em",
                    background: pass ? "rgba(74,124,89,0.2)"  : "rgba(193,68,14,0.15)",
                    border:     pass ? "1px solid rgba(74,124,89,0.4)" : "1px solid rgba(193,68,14,0.3)",
                    color:      pass ? "#A8C5A0" : "#C1440E",
                  }}>
                    {pass ? "✓" : "✗"} {label as string}
                  </span>
                ))}
              </div>
              <p style={{ fontFamily: "monospace", fontSize: "0.65rem", marginTop: "1rem",
                color: [form.gps_verified, form.deforestation_free, form.eudr_dds_ready,
                        form.phyto_cert_uploaded, form.ecta_license_active,
                        form.nbe_fx_declared, form.cta_floor_met].every(Boolean)
                  ? "#A8C5A0" : "rgba(245,237,216,0.3)" }}>
                {[form.gps_verified, form.deforestation_free, form.eudr_dds_ready,
                  form.phyto_cert_uploaded, form.ecta_license_active,
                  form.nbe_fx_declared, form.cta_floor_met].every(Boolean)
                  ? "✓ All gates pass — Export will be unlocked"
                  : `${[form.gps_verified, form.deforestation_free, form.eudr_dds_ready,
                         form.phyto_cert_uploaded, form.ecta_license_active,
                         form.nbe_fx_declared, form.cta_floor_met].filter(Boolean).length} / 7 gates passing`}
              </p>
            </div>
          </>
        )}

        {/* ── Step 4: Review ── */}
        {step === "review" && (
          <>
            <div style={s.card}>
              <p style={s.cardTitle}>Review — Lot Identity & Origin</p>
              {[
                ["Lot ID",          form.lot_id],
                ["Name",            form.name],
                ["Region",          form.region],
                ["Grade",           form.grade],
                ["Processing",      form.processing],
                ["Altitude",        form.altitude_m ? `${form.altitude_m} masl` : "—"],
                ["Volume",          form.volume_kg ? `${form.volume_kg} kg` : "—"],
                ["Price/kg",        form.price_per_kg ? `$${form.price_per_kg}` : "—"],
                ["Harvest Date",    form.harvest_date],
                ["GPS",             form.gps_lat && form.gps_lng ? `${form.gps_lat}°N, ${form.gps_lng}°E` : "Not set"],
              ].map(([l, v]) => (
                <div key={l} style={s.reviewRow}>
                  <span style={s.rLabel}>{l}</span>
                  <span style={s.rVal}>{v || "—"}</span>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>Review — Quality</p>
              {[
                ["SCA Score",    form.sca_score ? `${form.sca_score} pts` : "Not recorded"],
                ["Q-Grader",     form.q_grader_name || "—"],
                ["Cert ID",      form.q_grader_cert_id || "—"],
                ["Flavor Notes", form.flavor_notes || "—"],
              ].map(([l, v]) => (
                <div key={l} style={s.reviewRow}>
                  <span style={s.rLabel}>{l}</span>
                  <span style={s.rVal}>{v}</span>
                </div>
              ))}
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>Review — Compliance Gates</p>
              {[
                ["GPS Verified",        form.gps_verified],
                ["Deforestation Free",  form.deforestation_free],
                ["EUDR DDS Ready",      form.eudr_dds_ready],
                ["Phyto Cert",          form.phyto_cert_uploaded],
                ["ECTA License",        form.ecta_license_active],
                ["NBE FX Declared",     form.nbe_fx_declared],
                ["CTA Floor Met",       form.cta_floor_met],
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

        {/* Navigation */}
        <div style={s.actions}>
          <button style={s.btnGhost}
            onClick={() => stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : navigate("/lots")}>
            {stepIndex === 0 ? "← Cancel" : "← Back"}
          </button>

          {step !== "review" ? (
            <button style={s.btnPrimary}
              onClick={() => setStep(STEPS[stepIndex + 1])}>
              Continue →
            </button>
          ) : (
            <button
              style={{ ...s.btnPrimary, opacity: loading ? 0.6 : 1 }}
              disabled={loading}
              onClick={handleSubmit}>
              {loading ? "Creating..." : "✓ Create Lot"}
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
