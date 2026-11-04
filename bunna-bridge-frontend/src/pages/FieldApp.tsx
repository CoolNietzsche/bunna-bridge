import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Camera, Check, CloudOff, Footprints, LocateFixed, Package, RefreshCw, Trash2, UserPlus, Wifi,
} from "lucide-react";
import "../i18n";
import { LANGUAGES, setLanguage } from "../i18n";
import { ringAreaHa } from "../api/boundary";
import {
  enqueue, getProducers, getQueue, newId, photoToDataUrl, putProducer, refreshProducerCache, removeFromQueue, syncQueue,
} from "../lib/fieldStore";
import type { CachedProducer, QueueItem } from "../lib/fieldStore";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

type View = "home" | "producer" | "delivery";

/**
 * Offline-first field app for agents and cooperative staff (roadmap O-4):
 * register farmers, record consent, capture farm location and cherry
 * deliveries with no network. Everything is queued on the phone and sent
 * to the server when a connection comes back.
 */
export default function FieldApp() {
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<View>("home");
  const [online, setOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [producers, setProducers] = useState<CachedProducer[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const reload = useCallback(async () => {
    setQueue(await getQueue());
    setProducers(await getProducers());
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const r = await syncQueue();
      await refreshProducerCache().catch(() => undefined);
      setNotice(r.failed ? `${t("field.error")}: ${r.failed}` : t("field.all_synced"));
    } catch {
      setNotice(t("field.error"));
    } finally {
      setSyncing(false);
      reload();
    }
  }, [reload, t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const syncRef = useRef(sync);
  useEffect(() => { syncRef.current = sync; }, [sync]);

  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const up = () => { setOnline(true); syncRef.current(); };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    // Load what's on the phone, then sync if there is a connection.
    const start = setTimeout(() => { reload().then(() => syncRef.current()); }, 0);
    return () => {
      clearTimeout(start);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [reload]);

  const done = (message: string) => { setView("home"); setNotice(message); reload().then(() => { if (navigator.onLine) sync(); }); };

  return (
    <div style={{ minHeight: "100vh", background: AT.color.bodyBg, fontFamily: AT.font.sans }}>
      <header style={{ position: "sticky", top: 0, zIndex: 5, background: AT.color.surface, borderBottom: `1px solid ${AT.color.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
        {view !== "home"
          ? <button aria-label={t("field.back")} onClick={() => setView("home")} style={iconBtn}><ArrowLeft size={20} /></button>
          : <Link to="/dashboard" aria-label="Beersheba" style={{ ...iconBtn, textDecoration: "none" }}><img src="/apple-touch-icon.png" alt="" width={26} height={26} style={{ borderRadius: 6 }} /></Link>}
        <strong style={{ flex: 1, fontSize: "1rem", color: AT.color.text }}>{t("field.title")}</strong>
        <select aria-label="Language" value={i18n.language} onChange={(e) => setLanguage(e.target.value)} style={{ ...AC.input, width: "auto", padding: "6px 8px" }}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "16px" }}>
        <StatusBar online={online} count={queue.length} syncing={syncing} onSync={sync} />
        {notice && view === "home" && <p role="status" style={{ ...AC.status.base, ...AC.status.green, fontSize: "0.85rem", margin: "0 0 12px" }}>{notice}</p>}

        {view === "home" && (
          <>
            <div style={{ display: "grid", gap: "10px", margin: "16px 0 24px" }}>
              <BigButton icon={<UserPlus size={22} />} onClick={() => { setNotice(""); setView("producer"); }}>{t("field.register_producer")}</BigButton>
              <BigButton icon={<Package size={22} />} onClick={() => { setNotice(""); setView("delivery"); }}>{t("field.record_delivery")}</BigButton>
            </div>
            {queue.length > 0 && (
              <Section title={t("field.queue")}>
                {queue.map((q) => (
                  <div key={q.client_id} style={row}>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", color: AT.color.text }}>{q.label}</span>
                      {q.error && <span style={{ fontSize: "0.78rem", color: AT.color.red }}>{q.error}</span>}
                    </span>
                    {q.error && (
                      <button aria-label={t("field.remove")} style={iconBtn} onClick={async () => { await removeFromQueue(q.client_id); reload(); }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </Section>
            )}
            <Section title={t("field.recent")}>
              {producers.length === 0 ? <p style={muted}>{t("field.no_producers")}</p> : producers.slice(0, 50).map((p) => (
                <div key={p.id} style={row}>
                  <span style={{ flex: 1, color: AT.color.text }}>{p.name}</span>
                  <span style={muted}>{p.pending ? <CloudOff size={14} /> : p.external_ref || p.kebele}</span>
                </div>
              ))}
            </Section>
            <p style={{ ...muted, marginTop: "16px" }}>{t("field.install_hint")}</p>
          </>
        )}
        {view === "producer" && <ProducerWizard onDone={() => done(t("field.saved_offline"))} />}
        {view === "delivery" && <DeliveryForm producers={producers} onDone={() => done(t("field.saved_offline"))} />}
      </main>
    </div>
  );
}

function StatusBar({ online, count, syncing, onSync }: { online: boolean; count: number; syncing: boolean; onSync: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", borderRadius: AT.radius.md, background: online ? AT.color.greenLight : AT.color.yellowLight }}>
      {online ? <Wifi size={18} color={AT.color.green} /> : <CloudOff size={18} color={AT.color.yellow} />}
      <span style={{ flex: 1, fontSize: "0.88rem", color: AT.color.text }}>
        {online ? t("field.online") : t("field.offline")}
        {count > 0 && <span style={{ display: "block", fontSize: "0.8rem", color: AT.color.textSecondary }}>{t("field.waiting", { count })}</span>}
      </span>
      {online && count > 0 && (
        <button style={{ ...AC.btnSm, minHeight: 40 }} onClick={onSync} disabled={syncing}>
          <RefreshCw size={14} /> {syncing ? t("field.syncing") : t("field.sync_now")}
        </button>
      )}
    </div>
  );
}

// ── Register a farmer: details → consent → farm location ─────────────────────

function ProducerWizard({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [p, setP] = useState({ name: "", phone: "", external_ref: "", kebele: "", woreda: "", zone: "", language: i18n.language === "en" ? "am" : i18n.language });
  const [consent, setConsent] = useState({ agree: false, method: "witnessed", photo: "" });
  const [plot, setPlot] = useState<{ name: string; area: string; point: [number, number] | null; ring: [number, number][]; photo: string }>({ name: "", area: "", point: null, ring: [], photo: "" });
  const [error, setError] = useState("");

  const save = async (withPlot: boolean) => {
    const pid = newId();
    await enqueue("producer", { ...p }, `${p.name}`, pid);
    await putProducer({ id: `client:${pid}`, name: p.name, external_ref: p.external_ref, kebele: p.kebele, pending: true });
    if (consent.agree) {
      await enqueue("consent", {
        producer: `client:${pid}`, purpose: "eudr_sharing", method: consent.method, granted: true,
        ...(consent.photo ? { evidence: consent.photo } : {}),
      }, `${p.name} — ${t("consent.heading")}`);
    }
    if (withPlot && (plot.point || plot.ring.length >= 4)) {
      const closed = plot.ring.length >= 4 ? [...plot.ring, plot.ring[0]] : null;
      await enqueue("plot", {
        producer: `client:${pid}`, name: plot.name, declared_area_ha: plot.area || null, land_tenure: "owned",
        location: closed ? null : { type: "Point", coordinates: plot.point },
        boundary: closed ? { type: "Polygon", coordinates: [closed] } : null,
        ...(plot.photo ? { photo: plot.photo } : {}),
      }, `${p.name} — ${t("plot.heading")}`);
    }
    onDone();
  };

  return (
    <div>
      <p style={muted}>{t("field.step_of", { step, total: 3 })}</p>
      {error && <p role="alert" style={{ color: AT.color.red, fontSize: "0.85rem" }}>{error}</p>}
      {step === 1 && (
        <Section title={t("producer.heading")}>
          <Input label={t("producer.name")} value={p.name} onChange={(v) => setP({ ...p, name: v })} autoFocus />
          <Input label={t("producer.phone")} value={p.phone} onChange={(v) => setP({ ...p, phone: v })} type="tel" inputMode="tel" placeholder="09…" />
          <Input label={t("producer.ref")} value={p.external_ref} onChange={(v) => setP({ ...p, external_ref: v })} />
          <Input label={t("producer.kebele")} value={p.kebele} onChange={(v) => setP({ ...p, kebele: v })} />
          <Input label={t("producer.woreda")} value={p.woreda} onChange={(v) => setP({ ...p, woreda: v })} />
          <label style={lbl}>{t("producer.language")}
            <select style={input} value={p.language} onChange={(e) => setP({ ...p, language: e.target.value })}>
              <option value="am">አማርኛ</option><option value="om">Afaan Oromoo</option><option value="en">English</option>
            </select>
          </label>
          <BigButton primary disabled={!p.name.trim()} onClick={() => setStep(2)}>{t("field.next")}</BigButton>
        </Section>
      )}
      {step === 2 && (
        <Section title={t("consent.heading")}>
          <p style={{ fontSize: "0.92rem", lineHeight: 1.55, color: AT.color.text, background: AT.color.surfaceSecondary, padding: "12px", borderRadius: AT.radius.sm }}>{t("consent.explain")}</p>
          <label style={{ ...lbl, flexDirection: "row", alignItems: "center", gap: "10px", fontSize: "1rem" }}>
            <input type="checkbox" checked={consent.agree} onChange={(e) => setConsent({ ...consent, agree: e.target.checked })} style={{ width: 22, height: 22 }} />
            {t("consent.agree")}
          </label>
          {consent.agree && (
            <>
              <label style={lbl}>{t("consent.method")}
                <select style={input} value={consent.method} onChange={(e) => setConsent({ ...consent, method: e.target.value })}>
                  <option value="witnessed">{t("consent.witnessed")}</option>
                  <option value="paper">{t("consent.paper")}</option>
                  <option value="sms">{t("consent.sms")}</option>
                </select>
              </label>
              {consent.method === "paper" && (
                <PhotoInput label={t("consent.photo_form")} value={consent.photo} onChange={(v) => setConsent({ ...consent, photo: v })} />
              )}
            </>
          )}
          <BigButton primary onClick={() => {
            if (consent.agree && consent.method === "paper" && !consent.photo) { setError(t("consent.required_photo")); return; }
            setError(""); setStep(3);
          }}>{t("field.next")}</BigButton>
        </Section>
      )}
      {step === 3 && (
        <Section title={t("plot.heading")}>
          <p style={muted}>{t("plot.explain")}</p>
          <Input label={t("plot.name")} value={plot.name} onChange={(v) => setPlot({ ...plot, name: v })} />
          <Input label={t("plot.area")} value={plot.area} onChange={(v) => setPlot({ ...plot, area: v })} inputMode="decimal" />
          <GpsCapture
            onPoint={(pt) => setPlot({ ...plot, point: pt, ring: [] })}
            onRing={(ring) => setPlot({ ...plot, ring, point: null })}
            point={plot.point} ring={plot.ring}
          />
          {plot.point && Number(plot.area) > 4 && <p style={{ color: AT.color.red, fontSize: "0.85rem" }}>{t("plot.need_polygon")}</p>}
          <PhotoInput label={t("plot.photo")} value={plot.photo} onChange={(v) => setPlot({ ...plot, photo: v })} />
          <BigButton primary disabled={!(plot.ring.length >= 4 || (plot.point && !(Number(plot.area) > 4)))} onClick={() => save(true)}>
            <Check size={20} /> {t("field.save")}
          </BigButton>
          <button style={{ ...AC.btnGhost, width: "100%", justifyContent: "center", minHeight: 44, marginTop: 8 }} onClick={() => save(false)}>{t("plot.skip")}</button>
        </Section>
      )}
    </div>
  );
}

function GpsCapture({ point, ring, onPoint, onRing }: {
  point: [number, number] | null; ring: [number, number][];
  onPoint: (p: [number, number]) => void; onRing: (r: [number, number][]) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [walking, setWalking] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const watch = useRef<number | null>(null);
  const pts = useRef<[number, number][]>([]);

  useEffect(() => () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); }, []);

  const locate = () => {
    if (!("geolocation" in navigator)) { setError(t("plot.no_gps")); return; }
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBusy(false); setAccuracy(Math.round(pos.coords.accuracy)); onPoint([round6(pos.coords.longitude), round6(pos.coords.latitude)]); },
      () => { setBusy(false); setError(t("plot.no_gps")); },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    );
  };

  const startWalk = () => {
    if (!("geolocation" in navigator)) { setError(t("plot.no_gps")); return; }
    pts.current = []; setWalking(true); setError("");
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        setAccuracy(Math.round(pos.coords.accuracy));
        if (pos.coords.accuracy > 30) return; // ignore poor fixes
        const next: [number, number] = [round6(pos.coords.longitude), round6(pos.coords.latitude)];
        const last = pts.current[pts.current.length - 1];
        if (!last || metres(last, next) >= 5) { pts.current = [...pts.current, next]; onRing(pts.current); }
      },
      () => setError(t("plot.no_gps")),
      { enableHighAccuracy: true, maximumAge: 0 },
    );
  };
  const stopWalk = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null; setWalking(false);
  };

  const area = ring.length >= 4 ? ringAreaHa([...ring, ring[0]]) : 0;
  return (
    <div style={{ display: "grid", gap: "8px", margin: "8px 0 12px" }}>
      {!walking && (
        <button style={{ ...AC.btnGhost, minHeight: 48, justifyContent: "center" }} onClick={locate} disabled={busy}>
          <LocateFixed size={18} /> {busy ? t("plot.locating") : t("plot.use_location")}
        </button>
      )}
      <button style={{ ...(walking ? AC.btnPrimary : AC.btnGhost), minHeight: 48, justifyContent: "center" }} onClick={walking ? stopWalk : startWalk}>
        <Footprints size={18} /> {walking ? t("plot.walk_stop") : t("plot.walk_start")}
      </button>
      {accuracy !== null && <p style={muted}>{t("plot.accuracy", { m: accuracy })}</p>}
      {point && <p style={{ ...muted, color: AT.color.green }}><Check size={14} /> {t("plot.point_ok")}: {point[1]}, {point[0]}</p>}
      {ring.length > 0 && (
        <p style={{ ...muted, color: ring.length >= 4 ? AT.color.green : AT.color.textSecondary }}>
          {t("plot.points", { count: ring.length })}{ring.length >= 4 ? ` · ${t("plot.polygon_ok")} · ${area.toFixed(2)} ha` : ""}
        </p>
      )}
      {error && <p role="alert" style={{ color: AT.color.red, fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}

// ── Cherry delivery ──────────────────────────────────────────────────────────

function DeliveryForm({ producers, onDone }: { producers: CachedProducer[]; onDone: () => void }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ producer: "", receipt_number: "", delivered_on: new Date().toISOString().slice(0, 10), weight_kg: "", form: "cherry", price_per_kg_etb: "", amount_paid_etb: "" });
  const total = Number(f.weight_kg || 0) * Number(f.price_per_kg_etb || 0);
  const name = producers.find((p) => p.id === f.producer)?.name ?? "";
  const ok = f.producer && f.receipt_number.trim() && Number(f.weight_kg) > 0;
  return (
    <Section title={t("delivery.heading")}>
      <label style={lbl}>{t("delivery.farmer")}
        <select style={input} value={f.producer} onChange={(e) => setF({ ...f, producer: e.target.value })}>
          <option value="">{t("delivery.choose")}</option>
          {producers.map((p) => <option key={p.id} value={p.id}>{p.name}{p.external_ref ? ` (${p.external_ref})` : ""}</option>)}
        </select>
      </label>
      <Input label={t("delivery.receipt")} value={f.receipt_number} onChange={(v) => setF({ ...f, receipt_number: v })} />
      <Input label={t("delivery.date")} type="date" value={f.delivered_on} onChange={(v) => setF({ ...f, delivered_on: v })} />
      <label style={lbl}>{t("delivery.form")}
        <select style={input} value={f.form} onChange={(e) => setF({ ...f, form: e.target.value })}>
          <option value="cherry">{t("delivery.cherry")}</option>
          <option value="parchment">{t("delivery.parchment")}</option>
          <option value="dry_cherry">{t("delivery.dry_cherry")}</option>
        </select>
      </label>
      <Input label={t("delivery.weight")} value={f.weight_kg} onChange={(v) => setF({ ...f, weight_kg: v })} inputMode="decimal" />
      <Input label={t("delivery.price")} value={f.price_per_kg_etb} onChange={(v) => setF({ ...f, price_per_kg_etb: v })} inputMode="decimal" />
      {total > 0 && <p style={{ ...muted, fontSize: "0.95rem", color: AT.color.text }}>{t("delivery.total", { amount: total.toLocaleString() })}</p>}
      <Input label={t("delivery.paid")} value={f.amount_paid_etb} onChange={(v) => setF({ ...f, amount_paid_etb: v })} inputMode="decimal" />
      <BigButton primary disabled={!ok} onClick={async () => {
        const data = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "")) as Record<string, unknown>;
        await enqueue("delivery", data, `${f.receipt_number} — ${name} — ${f.weight_kg} kg`);
        onDone();
      }}><Check size={20} /> {t("field.save")}</BigButton>
    </Section>
  );
}

// ── Small UI pieces (large touch targets for outdoor use) ────────────────────

const input: CSSProperties = { ...AC.input, minHeight: 48, fontSize: "1rem" };
const lbl: CSSProperties = { display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.85rem", fontWeight: 500, color: AT.color.textSecondary, marginBottom: "12px" };
const muted: CSSProperties = { fontSize: "0.82rem", color: AT.color.textMuted, margin: "0 0 8px" };
const row: CSSProperties = { display: "flex", alignItems: "center", gap: "10px", padding: "12px 0", borderBottom: `1px solid ${AT.color.borderLight}`, fontSize: "0.92rem" };
const iconBtn: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, border: "none", background: "transparent", color: AT.color.text, cursor: "pointer" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ ...AC.card, padding: "16px", marginBottom: "16px" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 12px", color: AT.color.text }}>{title}</h2>
      {children}
    </section>
  );
}

function BigButton({ children, onClick, icon, primary, disabled }: { children: ReactNode; onClick: () => void; icon?: ReactNode; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...(primary ? AC.btnPrimary : { ...AC.btnGhost, background: AT.color.surface, border: `1px solid ${AT.color.border}` }),
      width: "100%", minHeight: 56, justifyContent: primary ? "center" : "flex-start", fontSize: "1rem", gap: "12px",
      opacity: disabled ? 0.5 : 1, padding: "0 18px",
    }}>
      {icon}{children}
    </button>
  );
}

function Input({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void; type?: string; inputMode?: "decimal" | "tel" | "text"; placeholder?: string; autoFocus?: boolean }) {
  return (
    <label style={lbl}>{label}
      <input style={input} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

function PhotoInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ ...AC.btnGhost, minHeight: 48, justifyContent: "center", cursor: "pointer", width: "100%" }}>
        <Camera size={18} /> {value ? t("consent.retake") : `${t("consent.take_photo")} — ${label}`}
        <input type="file" accept="image/*" capture="environment" hidden onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onChange(await photoToDataUrl(file));
        }} />
      </label>
      {value && <img src={value} alt={label} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: AT.radius.sm, marginTop: 8 }} />}
    </div>
  );
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function metres(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
