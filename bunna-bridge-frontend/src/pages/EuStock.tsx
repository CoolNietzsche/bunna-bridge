import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Package, Plus, ShoppingCart, Truck, Warehouse, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import { createStock, getOrders, getStock, orderAction, placeOrder, type Order, type Stock } from "../api/market";
import { getOffers } from "../api/lots";
import { apiError } from "../api/traceability";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const BUYERS = ["buyer", "importer", "roaster"];
const WAREHOUSES: [string, string][] = [["antwerp", "Antwerp"], ["hamburg", "Hamburg"], ["trieste", "Trieste"], ["le_havre", "Le Havre"], ["other", "Other"]];
const ORDER_TONE = { requested: "yellow", confirmed: "blue", released: "green", cancelled: "muted" } as const;
const eur = (v: number | string) => `€${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Tab = "stock" | "orders" | "mine";

/** EU warehouse stock: small-bag orders of Beersheba lots already landed in Europe (M-3). */
export default function EuStock() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "stock";
  const isImporter = user?.role === "importer" || user?.role === "admin";
  const tabs: [Tab, string][] = [["stock", "Available stock"], ["orders", "Orders"], ...(isImporter ? [["mine", "My stock"] as [Tab, string]] : [])];

  return (
    <AppShell>
      <div className="container-editorial" style={{ paddingBlock: 32 }}>
        <p style={AC.eyebrow}>Ready in Europe</p>
        <h1 style={{ ...AC.pageTitle, fontSize: "clamp(2rem, 4vw, 2.6rem)", marginTop: 4 }}>EU stock</h1>
        <p style={AC.pageSubtitle}>Beersheba lots already landed and cleared in European warehouses, with the EUDR due-diligence statement filed. Order by the bag; no container needed.</p>
        <div style={{ display: "flex", gap: 6, margin: "18px 0", flexWrap: "wrap" }}>
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setParams(k === "stock" ? {} : { tab: k })} style={tab === k ? AC.btnPrimary : AC.btnGhost}>{label}</button>
          ))}
        </div>
        {tab === "stock" && <StockBrowser canOrder={BUYERS.includes(user?.role ?? "")} onOrdered={() => setParams({ tab: "orders" })} />}
        {tab === "orders" && <Orders />}
        {tab === "mine" && isImporter && <MyStock />}
      </div>
    </AppShell>
  );
}

function StockBrowser({ canOrder, onOrdered }: { canOrder: boolean; onOrdered: () => void }) {
  const qc = useQueryClient();
  const [warehouse, setWarehouse] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["eu-stock", warehouse], queryFn: () => getStock(warehouse ? { warehouse } : {}) });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [delivery, setDelivery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const all = useQuery({ queryKey: ["eu-stock", ""], queryFn: () => getStock(), enabled: warehouse !== "" }).data ?? data;
  const byId = useMemo(() => Object.fromEntries(all.map((s) => [s.id, s])), [all]);
  const lines = Object.entries(cart).filter(([id, n]) => n > 0 && byId[id]);
  const cartWarehouse = lines.length ? byId[lines[0][0]].warehouse : null;
  const cartPartner = lines.length ? byId[lines[0][0]].partner_name : null;
  const totalKg = lines.reduce((t, [id, n]) => t + n * Number(byId[id].bag_kg), 0);
  const totalEur = lines.reduce((t, [id, n]) => t + n * Number(byId[id].bag_kg) * Number(byId[id].price_eur_per_kg), 0);

  const setBags = (s: Stock, n: number) => {
    setError("");
    if (n > 0 && cartWarehouse && (s.warehouse !== cartWarehouse || s.partner_name !== cartPartner)) {
      setError(`One order ships from one warehouse. Your cart is from ${cartPartner}, ${byId[lines[0][0]].warehouse_label}.`);
      return;
    }
    setCart({ ...cart, [s.id]: Math.max(0, Math.min(n, s.bags_available)) });
  };

  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Warehouse size={16} color={AT.color.textMuted} />
        <select style={{ ...AC.input, maxWidth: 220 }} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} aria-label="Warehouse">
          <option value="">All warehouses</option>
          {WAREHOUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {isLoading && <Muted>Loading stock…</Muted>}
      {!isLoading && data.length === 0 && <Muted>No stock in Europe right now. Importers list stock here once a Beersheba lot lands.</Muted>}
      <div style={{ display: "grid", gap: 12 }}>
        {data.map((s) => {
          const n = cart[s.id] ?? 0;
          return (
            <div key={s.id} style={{ ...AC.card, ...AC.cardPad, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                <p style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "1rem", color: AT.color.text, margin: 0 }}>{s.lot_name} <span style={{ color: AT.color.textMuted, fontWeight: 400 }}>{s.lot_code}</span></p>
                <Muted style={{ marginTop: 2 }}>{s.region} · {s.processing}{s.score ? ` · ${Number(s.score)} pts` : ""}</Muted>
                <Muted style={{ marginTop: 2 }}>{s.partner_name} · {s.warehouse_label}{s.warehouse_name ? ` (${s.warehouse_name})` : ""}{s.landed_on ? ` · landed ${formatDate(s.landed_on)}` : ""}</Muted>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <Pill tone="blue">{s.bags_available} × {Number(s.bag_kg)} kg bags</Pill>
                  {s.dds_reference && <Pill tone="green">DDS {s.dds_reference}</Pill>}
                  {s.sample_available && <Pill tone="muted">Sample available</Pill>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: AT.font.sans, fontSize: "1.2rem", fontWeight: 600, color: AT.color.text, margin: 0 }}>{eur(s.price_eur_per_kg)}<span style={{ fontSize: "0.75rem", color: AT.color.textMuted, fontWeight: 400 }}> /kg</span></p>
                <Muted>minimum {s.min_bags} bag{s.min_bags > 1 ? "s" : ""}</Muted>
                {canOrder && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", marginTop: 8 }}>
                    <button style={AC.btnGhost} aria-label="Fewer bags" disabled={n === 0} onClick={() => setBags(s, n - 1)}><Minus size={13} /></button>
                    <span style={{ fontFamily: AT.font.sans, minWidth: 24, textAlign: "center" }} data-testid={`bags-${s.lot_code}`}>{n}</span>
                    <button style={AC.btnGhost} aria-label="More bags" disabled={n >= s.bags_available} onClick={() => setBags(s, n === 0 ? s.min_bags : n + 1)}><Plus size={13} /></button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {canOrder && lines.length > 0 && (
        <div style={{ ...AC.card, ...AC.cardPad, position: "sticky", bottom: 16, boxShadow: AT.shadow.hover }}>
          <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6 }}><ShoppingCart size={15} /> Your order — {cartPartner}, {byId[lines[0][0]].warehouse_label}</p>
          <ErrorNote>{error}</ErrorNote>
          {lines.map(([id, n]) => <Muted key={id}>{n} × {Number(byId[id].bag_kg)} kg {byId[id].lot_name} — {eur(n * Number(byId[id].bag_kg) * Number(byId[id].price_eur_per_kg))}</Muted>)}
          <p style={{ fontFamily: AT.font.sans, fontWeight: 600, margin: "8px 0" }}>{totalKg.toLocaleString()} kg · {eur(totalEur)} <span style={{ fontWeight: 400, color: AT.color.textMuted, fontSize: "0.8rem" }}>ex-warehouse, before VAT</span></p>
          <Field label="Delivery address, or 'collect'"><input style={AC.input} value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="Roastery address, or collect" /></Field>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={AC.btnPrimary} disabled={busy || !delivery.trim()} onClick={async () => {
              setBusy(true); setError("");
              try {
                await placeOrder(lines.map(([stock, bags]) => ({ stock, bags })), delivery);
                setCart({}); setDelivery("");
                qc.invalidateQueries({ queryKey: ["eu-orders"] });
                onOrdered();
              } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
            }}><Check size={13} /> Request order</button>
            <button style={AC.btnGhost} onClick={() => { setCart({}); setError(""); }}><X size={13} /> Clear</button>
          </div>
        </div>
      )}
      {!(canOrder && lines.length > 0) && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["eu-orders"], queryFn: getOrders });
  const [error, setError] = useState("");
  const act = async (o: Order, action: "confirm" | "release" | "cancel") => {
    setError("");
    try { await orderAction(o.id, action); qc.invalidateQueries({ queryKey: ["eu-orders"] }); qc.invalidateQueries({ queryKey: ["eu-stock"] }); } catch (e) { setError(apiError(e)); }
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ErrorNote>{error}</ErrorNote>
      {isLoading && <Muted>Loading orders…</Muted>}
      {!isLoading && data.length === 0 && <Muted>No orders yet.</Muted>}
      {data.map((o) => (
        <div key={o.id} style={{ ...AC.card, ...AC.cardPad }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
              <Package size={15} /> {o.side === "partner" ? `From ${o.buyer_name}` : `${o.partner_name}`} · {o.warehouse_label}
            </p>
            <Pill tone={ORDER_TONE[o.status]}>{o.status_label}</Pill>
          </div>
          <div style={{ marginTop: 8 }}>
            {o.lines.map((l) => <Muted key={l.stock}>{l.bags} × {Number(l.bag_kg)} kg {l.lot_name} ({l.lot_code}) at {eur(l.price_eur_per_kg)}/kg</Muted>)}
          </div>
          <p style={{ fontFamily: AT.font.sans, fontWeight: 600, margin: "8px 0 2px" }}>{Number(o.total_kg).toLocaleString()} kg · {eur(o.total_eur)}</p>
          <Muted><Truck size={12} style={{ verticalAlign: "-2px" }} /> {o.delivery || "—"} · ordered {formatDate(o.created_at)}</Muted>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {o.side === "partner" && o.status === "requested" && <button style={AC.btnPrimary} onClick={() => act(o, "confirm")}><Check size={13} /> Confirm and reserve</button>}
            {o.side === "partner" && o.status === "confirmed" && <button style={AC.btnPrimary} onClick={() => act(o, "release")}><Truck size={13} /> Mark released</button>}
            {(o.status === "requested" || (o.status === "confirmed" && o.side === "partner")) && <button style={AC.btnGhost} onClick={() => act(o, "cancel")}><X size={13} /> Cancel</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function MyStock() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["eu-stock", "mine"], queryFn: () => getStock({ mine: "1" }) });
  const { data: offers = [] } = useQuery({ queryKey: ["offers"], queryFn: getOffers });
  const bought = useMemo(() => {
    const m = new Map<string, string>();
    offers.filter((o) => o.status === "accepted").forEach((o) => m.set(o.lot, `${o.lot_name} (${o.lot_id_display})`));
    return [...m.entries()];
  }, [offers]);
  const blank = { lot: "", warehouse: "antwerp", warehouse_name: "", bag_kg: "30", bags_total: "", price_eur_per_kg: "", min_bags: "1", landed_on: "", dds_reference: "" };
  const [f, setF] = useState(blank);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!open && <div><button style={AC.btnPrimary} onClick={() => setOpen(true)}><Plus size={14} /> List stock</button></div>}
      {open && (
        <div style={{ ...AC.card, ...AC.cardPad }}>
          <p style={AC.cardTitle}>List a lot you bought as EU stock</p>
          <ErrorNote>{error}</ErrorNote>
          {bought.length === 0 && <Muted style={{ marginBottom: 10 }}>You can list a lot here once an offer you made on it has been accepted.</Muted>}
          <div style={grid(170)}>
            <Field label="Lot">
              <select style={AC.input} value={f.lot} onChange={(e) => setF({ ...f, lot: e.target.value })}>
                <option value="">Choose…</option>
                {bought.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </Field>
            <Field label="Warehouse">
              <select style={AC.input} value={f.warehouse} onChange={(e) => setF({ ...f, warehouse: e.target.value })}>
                {WAREHOUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Warehouse name"><input style={AC.input} value={f.warehouse_name} onChange={(e) => setF({ ...f, warehouse_name: e.target.value })} /></Field>
            <Field label="Bag size (kg)"><input style={AC.input} type="number" value={f.bag_kg} onChange={(e) => setF({ ...f, bag_kg: e.target.value })} /></Field>
            <Field label="Bags"><input style={AC.input} type="number" value={f.bags_total} onChange={(e) => setF({ ...f, bags_total: e.target.value })} /></Field>
            <Field label="Price (EUR/kg)"><input style={AC.input} type="number" step="0.01" value={f.price_eur_per_kg} onChange={(e) => setF({ ...f, price_eur_per_kg: e.target.value })} /></Field>
            <Field label="Minimum bags"><input style={AC.input} type="number" value={f.min_bags} onChange={(e) => setF({ ...f, min_bags: e.target.value })} /></Field>
            <Field label="Landed on"><input style={AC.input} type="date" value={f.landed_on} onChange={(e) => setF({ ...f, landed_on: e.target.value })} /></Field>
            <Field label="DDS reference" hint="The EUDR due-diligence statement you filed for this stock."><input style={AC.input} value={f.dds_reference} onChange={(e) => setF({ ...f, dds_reference: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={AC.btnPrimary} disabled={!f.lot || !f.bags_total || !f.price_eur_per_kg} onClick={async () => {
              setError("");
              try {
                await createStock({ ...f, landed_on: f.landed_on || null });
                setF(blank); setOpen(false);
                qc.invalidateQueries({ queryKey: ["eu-stock"] });
              } catch (e) { setError(apiError(e)); }
            }}><Check size={13} /> List stock</button>
            <button style={AC.btnGhost} onClick={() => setOpen(false)}><X size={13} /></button>
          </div>
        </div>
      )}
      {data.length === 0 && <Muted>You have no stock listed.</Muted>}
      {data.map((s) => (
        <div key={s.id} style={{ ...AC.card, ...AC.cardPad, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: AT.font.sans, fontWeight: 600, margin: 0 }}>{s.lot_name} <span style={{ color: AT.color.textMuted, fontWeight: 400 }}>{s.lot_code}</span></p>
            <Muted>{s.warehouse_label}{s.warehouse_name ? ` (${s.warehouse_name})` : ""} · {eur(s.price_eur_per_kg)}/kg</Muted>
          </div>
          <Pill tone={s.active ? "green" : "muted"}>{s.bags_available} of {s.bags_total} bags available</Pill>
        </div>
      ))}
    </div>
  );
}
