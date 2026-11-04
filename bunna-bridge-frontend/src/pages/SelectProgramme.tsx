import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, Check, Gavel, Timer } from "lucide-react";
import AppShell from "../components/AppShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import { getProgramme, nominateLot, placeBid, programmeStep } from "../api/market";
import type { Entry, ProgrammeDetail } from "../api/market";
import { getLots } from "../api/lots";
import { apiError } from "../api/traceability";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const STEPS = ["nominations", "jury", "catalogue", "auction", "closed"] as const;
const STEP_LABEL = { nominations: "Nominations", jury: "Jury", catalogue: "Catalogue", auction: "Auction", closed: "Closed" };

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function left(ms: number) {
  if (ms <= 0) return "Closed";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
}

export default function SelectProgramme() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { data: p } = useQuery({ queryKey: ["programme", id], queryFn: async () => { const d = await getProgramme(id); return { ...d, skew: new Date(d.server_time).getTime() - Date.now() }; }, refetchInterval: (q) => (q.state.data?.status === "auction" ? 8000 : false) });
  const [error, setError] = useState("");
  const now = useNow(p?.status === "auction");
  const skew = p?.skew ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["programme", id] });
  if (!p) return <AppShell><Muted style={{ padding: 48, textAlign: "center" }}>Loading…</Muted></AppShell>;
  const step = STEPS.indexOf(p.status);
  const canBid = isAuthenticated && ["buyer", "importer", "roaster"].includes(user?.role ?? "");
  const shown = p.status === "nominations" || p.status === "jury" ? p.entries : p.entries.filter((e) => ["selected", "sold", "unsold"].includes(e.status));

  return (
    <AppShell>
      <div className="container-editorial" style={{ paddingBlock: 32 }}>
        <Link to="/select" style={{ ...AC.btnGhost, display: "inline-flex", marginBottom: 14, textDecoration: "none" }}><ArrowLeft size={14} /> Select</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <Award size={30} color={AT.color.primary} />
          <h1 style={{ ...AC.pageTitle, fontSize: "clamp(1.8rem, 4vw, 2.4rem)", margin: 0 }}>{p.name} {p.season}</h1>
        </div>
        {p.description && <p style={AC.pageSubtitle}>{p.description}</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "14px 0 20px" }}>
          {STEPS.map((sname, i) => (
            <span key={sname} style={{ ...AC.pill.base, ...(i < step ? AC.pill.green : i === step ? AC.pill.blue : AC.pill.muted) }}>{i + 1}. {STEP_LABEL[sname]}</span>
          ))}
          {p.status === "auction" && p.auction_ends && <span style={{ ...AC.pill.base, ...AC.pill.red }}><Timer size={12} /> closes {new Date(p.auction_ends).toLocaleString()}</span>}
        </div>
        <ErrorNote>{error}</ErrorNote>
        {p.is_admin && <AdminSteps p={p} onError={setError} onDone={refresh} />}
        {p.status === "nominations" && (user?.role === "exporter" || user?.role === "roaster") && <Nominate p={p} onDone={refresh} />}
        {p.status === "nominations" && <Muted style={{ marginBottom: 16 }}>Nominations close {formatDate(p.nominations_close)}. Lots must be listed, EUDR-ready and from a verified exporter; the jury's minimum is {Number(p.min_jury_score)} points.</Muted>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 16 }}>
          {shown.map((e) => <EntryCard key={e.id} e={e} p={p} now={now + skew} canBid={canBid} onDone={refresh} />)}
        </div>
        {shown.length === 0 && <Muted>{p.status === "nominations" ? "No nominations yet." : "No lots in the catalogue."}</Muted>}
      </div>
    </AppShell>
  );
}

function EntryCard({ e, p, now, canBid, onDone }: { e: Entry; p: ProgrammeDetail; now: number; canBid: boolean; onDone: () => void }) {
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const remaining = e.closes_at ? new Date(e.closes_at).getTime() - now : 0;
  const live = p.status === "auction" && e.status === "selected" && remaining > 0;
  return (
    <div style={{ ...AC.card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {e.photo && <img src={e.photo} alt="" style={{ width: "100%", height: 140, objectFit: "cover" }} />}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textMuted }}>{e.rank ? `#${e.rank} · ` : ""}{e.lot_code}</span>
          <Pill tone={e.status === "sold" ? "green" : e.status === "selected" ? "blue" : e.status === "ineligible" || e.status === "not_selected" || e.status === "unsold" ? "muted" : "yellow"}>{e.status_label}</Pill>
        </div>
        <Link to={`/marketplace/${e.lot}`} style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "1.05rem", color: AT.color.text, textDecoration: "none" }}>{e.lot_name}</Link>
        <Muted>{e.region} · {e.processing} · {e.exporter_name} · {Number(e.quantity_kg).toLocaleString()} kg</Muted>
        {e.jury_score && <p style={{ fontFamily: AT.font.sans, fontSize: "1.6rem", fontWeight: 700, color: AT.color.primaryDark, margin: "4px 0" }}>{Number(e.jury_score).toFixed(2)} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: AT.color.textMuted }}>jury score</span></p>}
        {e.eligibility_notes && <Muted style={{ color: AT.color.red }}>{e.eligibility_notes}</Muted>}
        {(p.status === "auction" || p.status === "closed" || e.status === "sold") && (
          <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${AT.color.borderLight}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: AT.font.sans, fontSize: "0.85rem" }}>
              <span>{e.high_bid_usd ? <>High bid <b>${e.high_bid_usd}/kg</b></> : <>Starts at <b>${e.starting_price_usd}/kg</b></>} · {e.bids_count} bid{e.bids_count === 1 ? "" : "s"}</span>
              {live && <span style={{ color: remaining < 180000 ? AT.color.red : AT.color.textSecondary, display: "flex", gap: 4, alignItems: "center" }}><Timer size={13} /> {left(remaining)}</span>}
            </div>
            {!e.reserve_met && e.high_bid_usd && <Muted>Reserve not met yet.</Muted>}
            {e.my_high_bid_usd && <p style={{ ...AC.status.base, ...(e.i_am_winning ? AC.status.green : AC.status.red), marginTop: 4 }}>{e.i_am_winning ? "You are the highest bidder" : `You were outbid (your bid $${e.my_high_bid_usd})`}</p>}
            {live && canBid && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input aria-label={`Bid for ${e.lot_code}`} style={{ ...AC.input, flex: 1 }} type="number" step="0.05" min={e.next_min_bid_usd} placeholder={`$${e.next_min_bid_usd} or more`} value={price} onChange={(ev) => setPrice(ev.target.value)} />
                <button style={AC.btnPrimary} disabled={!price} onClick={async () => {
                  setError("");
                  try { await placeBid(e.id, price); setPrice(""); onDone(); } catch (err) { setError(apiError(err)); }
                }}><Gavel size={14} /> Bid</button>
              </div>
            )}
            {error && <p style={{ ...AC.status.base, ...AC.status.red, marginTop: 4 }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Nominate({ p, onDone }: { p: ProgrammeDetail; onDone: () => void }) {
  const { data } = useQuery({ queryKey: ["lots", "mine-listed"], queryFn: () => getLots({ status: "listed" }) });
  const [f, setF] = useState({ lot: "", quantity_kg: "", starting_price_usd: "", reserve_price_usd: "" });
  const [error, setError] = useState("");
  const already = new Set(p.entries.map((e) => e.lot));
  const lots = (data?.results ?? []).filter((l) => !already.has(l.id));
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: 16 }}>
      <p style={{ ...AC.cardTitle, marginBottom: 8 }}>Nominate a lot</p>
      <ErrorNote>{error}</ErrorNote>
      <div style={grid(160)}>
        <Field label="Lot">
          <select style={AC.input} value={f.lot} onChange={(e) => { const l = lots.find((x) => x.id === e.target.value); setF({ ...f, lot: e.target.value, quantity_kg: l ? String(l.available_qty_kg) : "", starting_price_usd: l?.fob_price_usd ? String(Number(l.fob_price_usd)) : "" }); }}>
            <option value="">Choose…</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.lot_id} — {l.name}</option>)}
          </select>
        </Field>
        <Field label="Quantity (kg)"><input style={AC.input} type="number" value={f.quantity_kg} onChange={(e) => setF({ ...f, quantity_kg: e.target.value })} /></Field>
        <Field label="Starting price (USD/kg)"><input style={AC.input} type="number" step="0.05" value={f.starting_price_usd} onChange={(e) => setF({ ...f, starting_price_usd: e.target.value })} /></Field>
        <Field label="Reserve (hidden, optional)"><input style={AC.input} type="number" step="0.05" value={f.reserve_price_usd} onChange={(e) => setF({ ...f, reserve_price_usd: e.target.value })} /></Field>
      </div>
      <button style={AC.btnPrimary} disabled={!f.lot || !f.quantity_kg || !f.starting_price_usd} onClick={async () => {
        setError("");
        try { await nominateLot(p.id, { ...f, reserve_price_usd: f.reserve_price_usd || null }); setF({ lot: "", quantity_kg: "", starting_price_usd: "", reserve_price_usd: "" }); onDone(); }
        catch (e) { setError(apiError(e)); }
      }}><Check size={13} /> Nominate</button>
    </div>
  );
}

function AdminSteps({ p, onError, onDone }: { p: ProgrammeDetail; onError: (m: string) => void; onDone: () => void }) {
  const [ends, setEnds] = useState("");
  const run = async (fn: () => Promise<unknown>) => { onError(""); try { await fn(); onDone(); } catch (e) { onError(apiError(e)); } };
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <b style={{ fontFamily: AT.font.sans, fontSize: "0.85rem" }}>Run the programme:</b>
      {p.status === "nominations" && <button style={AC.btnPrimary} onClick={() => run(() => programmeStep(p.id, "start-jury"))}>Send eligible lots to the jury</button>}
      {p.jury_session && <Link to={`/cupping-sessions/${p.jury_session}`} style={{ ...AC.btnGhost, textDecoration: "none" }}>Open jury session</Link>}
      {p.status === "jury" && <button style={AC.btnPrimary} onClick={() => run(() => programmeStep(p.id, "publish"))}>Publish catalogue from jury results</button>}
      {p.status === "catalogue" && p.auction && (
        <>
          <input aria-label="Auction closes" style={{ ...AC.input, width: "auto" }} type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} />
          <button style={AC.btnPrimary} disabled={!ends} onClick={() => run(() => programmeStep(p.id, "start-auction", { ends_at: new Date(ends).toISOString() }))}><Gavel size={14} /> Open auction</button>
        </>
      )}
    </div>
  );
}
