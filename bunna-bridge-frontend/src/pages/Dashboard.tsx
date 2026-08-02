import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots, getOffers } from "../api/lots";
import { getFarmerProfile, getFarmerLots } from "../api/farmer";
import { getSampleRequests } from "../api/samples";
import { getRoastBatches, getAvailableLots } from "../api/roasting";
import { getCertifications } from "../api/certifications";
import AdminShell from "../components/admin/AdminShell";
import { LotStatusBadge, ComplianceBadge } from "../components/admin/AdminStatusBadge";
import DonutChart from "../components/charts/DonutChart";
import BarChart from "../components/charts/BarChart";
import {
  Package, ShieldCheck, TrendingUp, AlertTriangle,
  ArrowRight, Plus, Leaf, Mountain, FlaskConical,
  Award, Ruler, Users, Map, Handshake, Mail, Flame,
} from "lucide-react";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";
import { isBuyerRole } from "../lib/utils";
import { WidgetStat, WidgetStatProgress, WidgetStatSimple, type WidgetTone } from "../components/admin/AdminWidgets";

type StatDef =
  | { kind: "trend"; label: string; value: string | number; icon: React.ReactNode; tone: WidgetTone; path: string; sublabel?: string; trend: number[] }
  | { kind: "progress"; label: string; value: string | number; icon?: React.ReactNode; tone: WidgetTone; path: string; percent: number; footer?: string }
  | { kind: "simple"; label: string; value: string | number; icon: React.ReactNode; tone: WidgetTone; path: string; footer?: string };

// ── Small helpers ──────────────────────────────────────────────────

function PipelineBar({ draft, listed, contracted, exported }: {
  draft: number; listed: number; contracted: number; exported: number;
}) {
  const total = draft + listed + contracted + exported || 1;
  const segments = [
    { label: "Draft", value: draft, color: AT.color.textDisabled },
    { label: "Listed", value: listed, color: AT.color.blue },
    { label: "Contracted", value: contracted, color: AT.color.yellow },
    { label: "Exported", value: exported, color: AT.color.primary },
  ];
  return (
    <div>
      <div style={{ display: "flex", height: "8px", borderRadius: AT.radius.sm, overflow: "hidden", gap: "2px", marginBottom: "12px" }}>
        {segments.map((s) => s.value > 0 && (
          <div key={s.label} style={{ background: s.color, flex: s.value / total, transition: "flex 0.4s ease" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textSecondary }}>{s.value} {s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoastBatchPipelineBar({ counts }: { counts: Record<string, number> }) {
  const stages = [
    { key: "queued", label: "Queued", color: AT.color.textDisabled },
    { key: "roasting", label: "Roasting", color: "#b45309" },
    { key: "resting", label: "Resting", color: AT.color.blue },
    { key: "qc", label: "QC", color: AT.color.blue },
    { key: "packaged", label: "Packaged", color: AT.color.primary },
    { key: "shipped", label: "Shipped", color: AT.color.primaryDark },
  ];
  const total = stages.reduce((sum, s) => sum + (counts[s.key] || 0), 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: "8px", borderRadius: AT.radius.sm, overflow: "hidden", gap: "2px", marginBottom: "12px" }}>
        {stages.map((s) => (counts[s.key] || 0) > 0 && (
          <div key={s.key} style={{ background: s.color, flex: (counts[s.key] || 0) / total, transition: "flex 0.4s ease" }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
        {stages.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.textSecondary }}>{counts[s.key] || 0} {s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ActivityEvent { id: string; icon: React.ReactNode; title: string; subtitle: string; date: string; onClick: () => void; }

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textMuted, textAlign: "center", padding: "32px 0" }}>No recent activity.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {events.map((e) => (
        <button
          key={e.id}
          onClick={e.onClick}
          style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 4px", background: "transparent", border: "none", borderBottom: `1px solid ${AT.color.borderLight}`, cursor: "pointer", textAlign: "left", width: "100%" }}
        >
          <span style={{ width: "30px", height: "30px", borderRadius: "999px", background: AT.color.primaryLight, color: AT.color.primaryDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {e.icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.text, fontWeight: 500 }}>{e.title}</p>
            <p style={{ margin: "2px 0 0", fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subtitle}</p>
          </div>
          <span style={{ fontFamily: AT.font.sans, fontSize: "0.7rem", color: AT.color.textDisabled, whiteSpace: "nowrap", flexShrink: 0 }}>{e.date}</span>
        </button>
      ))}
    </div>
  );
}

function certExpiryLabel(expiryDate: string | null, isExpired: boolean): string {
  if (!expiryDate) return "";
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  if (isExpired) return `expired ${Math.abs(days)}d ago`;
  return days <= 0 ? "expires today" : `expires in ${days}d`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main component ────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "exporter";
  const isFarmer = role === "farmer";
  const isRoaster = role === "roaster";
  const isBuyerLike = isBuyerRole(role);
  const canTrack = role === "exporter" || isBuyerLike || role === "admin";

  const { data } = useQuery({ queryKey: ["lots-dashboard", role], queryFn: () => getLots(), enabled: !isFarmer });
  const { data: farmerLots } = useQuery({ queryKey: ["farmer-lots-dashboard"], queryFn: getFarmerLots, enabled: isFarmer });
  const { data: farmProfile } = useQuery({ queryKey: ["farmer-profile-dashboard"], queryFn: getFarmerProfile, enabled: isFarmer });
  const { data: offers } = useQuery({ queryKey: ["offers-dashboard"], queryFn: getOffers, enabled: canTrack });
  const { data: samples } = useQuery({ queryKey: ["samples-dashboard"], queryFn: getSampleRequests, enabled: canTrack });
  const { data: roastBatches } = useQuery({ queryKey: ["roast-batches-dashboard"], queryFn: getRoastBatches, enabled: isRoaster });
  const { data: availableLots } = useQuery({ queryKey: ["available-lots-dashboard"], queryFn: getAvailableLots, enabled: isRoaster });
  const { data: certifications } = useQuery({ queryKey: ["certifications-dashboard"], queryFn: getCertifications, enabled: isRoaster });

  // ── Derived stats ─────────────────────────────────────────────
  const results = isFarmer ? (farmerLots ?? []) : (data?.results ?? []);
  const total = isFarmer ? results.length : (data?.count ?? 0);
  const eudrReady = results.filter((l) => l.eudr_dds_ready).length;
  const exportReady = results.filter((l) => l.export_ready).length;
  const pending = results.filter((l) => !l.export_ready).length;
  const scaScores = results.filter((l) => l.sca_score).map((l) => Number(l.sca_score));
  const avgSca = scaScores.length ? (scaScores.reduce((a, b) => a + b, 0) / scaScores.length).toFixed(1) : "—";
  const regions = new Set(results.map((l) => l.region).filter(Boolean)).size;

  const draftCount = results.filter((l) => l.status === "draft").length;
  const listedCount = results.filter((l) => l.status === "listed").length;
  const contractedCount = results.filter((l) => l.status === "contracted").length;
  const exportedCount = results.filter((l) => l.status === "exported").length;

  // ── Roaster-specific derived stats ────────────────────────────
  const activeBatchCount = (roastBatches ?? []).filter((b) => b.status !== "shipped").length;
  const roastBatchCounts = (roastBatches ?? []).reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  const greenInventoryKg = (availableLots ?? []).reduce((sum, l) => sum + Number(l.volume_kg || 0), 0);
  const now = new Date();
  const expiredCertCount = (certifications ?? []).filter((c) => c.is_expired).length;
  const expiringSoonCerts = (certifications ?? []).filter((c) => {
    if (!c.expiry_date || c.is_expired) return false;
    const days = (new Date(c.expiry_date).getTime() - now.getTime()) / 86_400_000;
    return days <= 60;
  });
  const certAlertCount = expiredCertCount + expiringSoonCerts.length;

  const gatesPassed = (l: (typeof results)[number]) =>
    [l.deforestation_free, l.gps_verified, l.eudr_dds_ready, l.phyto_cert_uploaded,
     l.ecta_license_active, l.nbe_fx_declared, l.cta_floor_met].filter(Boolean).length;
  const complianceBuckets = [
    { label: "Export ready (7/7)", value: results.filter((l) => gatesPassed(l) === 7).length, color: AT.color.primary },
    { label: "Near ready (5–6)", value: results.filter((l) => { const g = gatesPassed(l); return g >= 5 && g <= 6; }).length, color: AT.color.yellow },
    { label: "In progress (2–4)", value: results.filter((l) => { const g = gatesPassed(l); return g >= 2 && g <= 4; }).length, color: AT.color.blue },
    { label: "Just started (0–1)", value: results.filter((l) => gatesPassed(l) <= 1).length, color: AT.color.textDisabled },
  ];

  // Real monthly registration counts, last 6 months — computed from created_at, not fabricated.
  const monthlyRegistrations = (() => {
    const now = new Date();
    const buckets: BarPointT[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const count = results.filter((l) => {
        if (!l.created_at) return false;
        const c = new Date(l.created_at);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      }).length;
      buckets.push({ label, value: count });
    }
    return buckets;
  })();

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = results.filter((l) => l.created_at && new Date(l.created_at).getTime() >= oneWeekAgo).length;
  const newLotsSublabel = newThisWeek > 0 ? `+${newThisWeek} this week` : undefined;
  const registrationTrend = monthlyRegistrations.map((m) => m.value);
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  const greeting = () => {
    const name = user?.first_name || user?.email?.split("@")[0] || "there";
    const h = new Date().getHours();
    return `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, ${name}.`;
  };

  const stats: StatDef[] = isRoaster
    ? [
        { kind: "simple", label: "Active Roast Batches", value: activeBatchCount, icon: <Flame size={18} />, tone: "yellow", path: "/roast-batches" },
        { kind: "simple", label: "Green Inventory", value: `${greenInventoryKg}kg`, icon: <Package size={18} />, tone: "green", path: "/roast-batches" },
        { kind: "simple", label: "Certifications", value: (certifications ?? []).length, icon: <Award size={18} />, tone: certAlertCount > 0 ? "red" : "green", path: "/certifications", footer: certAlertCount > 0 ? `${certAlertCount} need attention` : "All valid" },
        { kind: "simple", label: "Draft Lots", value: draftCount, icon: <Package size={18} />, tone: "blue", path: "/lots" },
      ]
    : isBuyerLike
    ? [
        { kind: "trend", label: "Available Lots", value: total, icon: <Package size={18} />, tone: "green", path: "/marketplace", sublabel: newLotsSublabel, trend: registrationTrend },
        { kind: "progress", label: "EUDR Verified", value: eudrReady, icon: <ShieldCheck size={18} />, tone: "blue", path: "/marketplace?eudr_dds_ready=true", percent: pct(eudrReady, total), footer: `${eudrReady} of ${total} lots` },
        { kind: "simple", label: "Watchlist", value: "—", icon: <Leaf size={18} />, tone: "green", path: "/buyer/watchlist" },
        { kind: "simple", label: "Regions Active", value: regions || 7, icon: <Mountain size={18} />, tone: "yellow", path: "/marketplace" },
      ]
    : isFarmer
    ? [
        { kind: "trend", label: "Linked Lots", value: total, icon: <Package size={18} />, tone: "green", path: "/farm", sublabel: newLotsSublabel, trend: registrationTrend },
        { kind: "progress", label: "Export Ready", value: exportReady, icon: <TrendingUp size={18} />, tone: "blue", path: "/farm", percent: pct(exportReady, total), footer: `${exportReady} of ${total} lots` },
        { kind: "progress", label: "Avg Cup Score", value: avgSca, icon: <ShieldCheck size={18} />, tone: "yellow", path: "/farm", percent: avgSca === "—" ? 0 : Number(avgSca), footer: "Specialty threshold: 80" },
        { kind: "simple", label: "Farm Size", value: farmProfile?.farm_size_ha ? `${farmProfile.farm_size_ha}ha` : "—", icon: <Ruler size={18} />, tone: "green", path: "/farm" },
      ]
    : [
        { kind: "trend", label: "Total Lots", value: total, icon: <Package size={18} />, tone: "green", path: "/lots", sublabel: newLotsSublabel, trend: registrationTrend },
        { kind: "progress", label: "EUDR Ready", value: eudrReady, icon: <ShieldCheck size={18} />, tone: "blue", path: "/lots", percent: pct(eudrReady, total), footer: `${eudrReady} of ${total} lots` },
        { kind: "progress", label: "Export Ready", value: exportReady, icon: <TrendingUp size={18} />, tone: "yellow", path: "/lots", percent: pct(exportReady, total), footer: `${exportReady} of ${total} lots` },
        { kind: "simple", label: "Pending Compliance", value: pending, icon: <AlertTriangle size={18} />, tone: "red", path: "/lots" },
      ];

  const quickActions: Record<string, { label: string; path: string; icon: React.ReactNode; primary?: boolean }[]> = {
    admin: [
      { label: "Register New Lot", path: "/lots/new", icon: <Plus size={14} />, primary: true },
      { label: "Browse All Lots", path: "/lots", icon: <Package size={14} /> },
      { label: "View Marketplace", path: "/marketplace", icon: <Leaf size={14} /> },
      { label: "Offers", path: "/offers", icon: <Handshake size={14} /> },
      { label: "Sample Requests", path: "/samples", icon: <FlaskConical size={14} /> },
    ],
    exporter: [
      { label: "Register New Lot", path: "/lots/new", icon: <Plus size={14} />, primary: true },
      { label: "View My Lots", path: "/lots", icon: <Package size={14} /> },
      { label: "Offers", path: "/offers", icon: <Handshake size={14} /> },
      { label: "Sample Requests", path: "/samples", icon: <FlaskConical size={14} /> },
    ],
    buyer: [
      { label: "Browse Marketplace", path: "/marketplace", icon: <Leaf size={14} />, primary: true },
      { label: "My Offers", path: "/buyer/offers", icon: <Handshake size={14} /> },
      { label: "My Watchlist", path: "/buyer/watchlist", icon: <Package size={14} /> },
      { label: "Sample Requests", path: "/samples", icon: <FlaskConical size={14} /> },
    ],
    roaster: [
      { label: "Browse Marketplace", path: "/marketplace", icon: <Leaf size={14} />, primary: true },
      { label: "Roast Batches", path: "/roast-batches", icon: <Package size={14} /> },
      { label: "Register New Lot", path: "/lots/new", icon: <Plus size={14} /> },
      { label: "My Lots", path: "/lots", icon: <Package size={14} /> },
      { label: "My Roastery Profile", path: "/roastery", icon: <Package size={14} /> },
      { label: "My Offers", path: "/buyer/offers", icon: <Handshake size={14} /> },
      { label: "My Watchlist", path: "/buyer/watchlist", icon: <Package size={14} /> },
      { label: "Sample Requests", path: "/samples", icon: <FlaskConical size={14} /> },
    ],
    farmer: [
      { label: "My Farm Profile", path: "/farm", icon: <Leaf size={14} />, primary: true },
      { label: "Farm Map", path: "/map", icon: <Map size={14} /> },
    ],
    qgrader: [{ label: "Lots to Cup", path: "/lots", icon: <Package size={14} />, primary: true }],
  };
  const actions = quickActions[role] || quickActions.exporter;

  // Merge real offers + samples into one activity feed, sorted by date.
  const actionableOffers = (offers ?? []).filter((o) => (isBuyerLike ? o.status === "countered" : o.status === "pending"));
  const actionableSamples = isBuyerLike ? [] : (samples ?? []).filter((s) => s.status === "pending");
  const attentionCount = actionableOffers.length + actionableSamples.length + certAlertCount;

  const activityEvents: ActivityEvent[] = [
    ...actionableOffers.map((o) => ({
      id: `offer-${o.id}`,
      icon: <Handshake size={14} />,
      title: `${isBuyerLike ? "Counter-offer" : "Offer"} on ${o.lot_name}`,
      subtitle: isBuyerLike ? `Exporter countered at $${o.counter_price}/kg` : `${o.buyer_company || o.buyer_name} · $${o.price_per_kg_usd}/kg`,
      date: relativeTime(o.updated_at || o.created_at),
      onClick: () => navigate(isBuyerLike ? "/buyer/offers" : "/offers"),
    })),
    ...actionableSamples.map((s) => ({
      id: `sample-${s.id}`,
      icon: <Mail size={14} />,
      title: `Sample request for ${s.lot_name}`,
      subtitle: `${s.buyer_company || s.buyer_name} · ${s.quantity_g}g`,
      date: relativeTime(s.created_at),
      onClick: () => navigate("/samples"),
    })),
    ...(isRoaster ? (certifications ?? []).filter((c) => c.is_expired || expiringSoonCerts.includes(c)).map((c) => ({
      id: `cert-${c.id}`,
      icon: <Award size={14} />,
      title: `${c.cert_type.replace("_", " ")} certification ${c.is_expired ? "expired" : "expiring soon"}`,
      subtitle: c.issuing_body || "No issuing body recorded",
      date: certExpiryLabel(c.expiry_date, c.is_expired),
      onClick: () => navigate("/certifications"),
    })) : []),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);

  return (
    <AdminShell>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={AC.eyebrow}>Overview</p>
          <h1 style={{ ...AC.pageTitle, marginTop: "4px" }}>{greeting()}</h1>
        </div>
        {!isFarmer && (
          <button onClick={() => navigate("/lots/new")} style={AC.btnPrimary}>
            <Plus size={15} /> Register New Lot
          </button>
        )}
      </div>

      {/* ── Farm identity strip ─────────────────────────────────── */}
      {isFarmer && farmProfile?.farm_id && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", background: AT.color.primaryLight, border: `1px solid ${AT.color.primary}33`, borderRadius: AT.radius.lg, padding: "12px 16px", marginBottom: "20px" }}>
          <Award size={16} color={AT.color.primaryDark} />
          <span style={{ fontFamily: AT.font.mono, fontSize: "0.8rem", color: AT.color.primaryDark, fontWeight: 600 }}>{farmProfile.farm_id}</span>
          <span style={{ color: AT.color.textDisabled }}>·</span>
          <span style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text }}>{farmProfile.farm_name || "Unnamed Farm"}</span>
          {farmProfile.cooperative && (
            <>
              <span style={{ color: AT.color.textDisabled }}>·</span>
              <span style={{ fontFamily: AT.font.sans, fontSize: "0.8rem", color: AT.color.textSecondary, display: "flex", alignItems: "center", gap: "5px" }}>
                <Users size={12} /> {farmProfile.cooperative}
              </span>
            </>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => navigate("/farm")} style={{ ...AC.btnSm, border: "none", color: AT.color.primaryDark }}>
            View farm profile <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {stats.map((stat) => {
          const onClick = () => navigate(stat.path);
          if (stat.kind === "trend") {
            return <WidgetStat key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} tone={stat.tone} trend={stat.trend} sublabel={stat.sublabel} onClick={onClick} />;
          }
          if (stat.kind === "progress") {
            return <WidgetStatProgress key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} tone={stat.tone} percent={stat.percent} footer={stat.footer} onClick={onClick} />;
          }
          return <WidgetStatSimple key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} tone={stat.tone} footer={stat.footer} onClick={onClick} />;
        })}
      </div>

      {/* ── Chart + Activity feed ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }} className="ab-2col">
        <div style={AC.card}>
          <div style={AC.cardHeader}>
            <p style={AC.cardTitle}>Lot Registrations</p>
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textMuted }}>Last 6 months</span>
          </div>
          <div style={AC.cardPad}>
            <BarChart data={monthlyRegistrations} />
          </div>
        </div>
        <div style={AC.card}>
          <div style={AC.cardHeader}>
            <p style={AC.cardTitle}>Needs Attention</p>
            {attentionCount > 0 && <span style={{ ...AC.pill.base, ...AC.pill.yellow }}>{attentionCount}</span>}
          </div>
          <div style={{ padding: "4px 16px 8px" }}>
            <ActivityFeed events={activityEvents} />
          </div>
        </div>
      </div>

      {/* ── Recent lots table + widgets ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }} className="ab-2col">
        <div style={AC.card}>
          <div style={AC.cardHeader}>
            <p style={AC.cardTitle}>Recent Lots</p>
            <button onClick={() => navigate("/lots")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.primaryDark, fontWeight: 500 }}>
              View registry →
            </button>
          </div>
          {results.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={AC.table}>
                <thead>
                  <tr>
                    <th style={AC.th}>Lot ID</th>
                    <th style={AC.th}>Name</th>
                    <th style={AC.th}>Region</th>
                    <th style={AC.th}>Status</th>
                    <th style={AC.th}>Compliance</th>
                    <th style={{ ...AC.th, textAlign: "right" }}>SCA</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 8).map((lot) => (
                    <tr
                      key={lot.id}
                      onClick={() => navigate(`/lots/${lot.id}`)}
                      style={AC.trHover}
                      onMouseEnter={(e) => (e.currentTarget.style.background = AT.color.surfaceSecondary)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...AC.td, fontFamily: AT.font.mono, fontSize: "0.75rem", color: AT.color.textSecondary }}>{lot.lot_id}</td>
                      <td style={{ ...AC.td, fontWeight: 500 }}>{lot.name}</td>
                      <td style={{ ...AC.td, textTransform: "capitalize", color: AT.color.textSecondary }}>{lot.region}</td>
                      <td style={AC.td}><LotStatusBadge status={lot.status} /></td>
                      <td style={AC.td}><ComplianceBadge passed={gatesPassed(lot)} /></td>
                      <td style={{ ...AC.td, textAlign: "right", fontWeight: 600 }}>{lot.sca_score ? Number(lot.sca_score).toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px", textAlign: "center" }}>
              <Package size={24} color={AT.color.textDisabled} style={{ marginBottom: "8px" }} />
              <p style={{ fontFamily: AT.font.sans, fontSize: "0.82rem", color: AT.color.textMuted, margin: "0 0 8px" }}>
                {isFarmer ? "No lots linked to your farm yet" : "No lots yet"}
              </p>
              {!isFarmer && (
                <button onClick={() => navigate("/lots/new")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: AT.font.sans, fontSize: "0.78rem", color: AT.color.primaryDark, fontWeight: 600 }}>
                  Register first lot →
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {total > 0 && (
            <div style={AC.card}>
              <div style={AC.cardHeader}><p style={AC.cardTitle}>Compliance</p></div>
              <div style={AC.cardPad}>
                <DonutChart segments={complianceBuckets} centerLabel={String(total)} centerSublabel="lots" size={112} thickness={13} />
              </div>
            </div>
          )}
          <div style={AC.card}>
            <div style={AC.cardHeader}><p style={AC.cardTitle}>Quick Actions</p></div>
            <div style={{ ...AC.cardPad, paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {actions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  style={action.primary ? AC.btnPrimary : AC.btnGhost}
                >
                  {action.icon}
                  <span style={{ flex: 1, textAlign: "left" }}>{action.label}</span>
                  <ArrowRight size={12} style={{ opacity: 0.6 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Lot pipeline ────────────────────────────────────────── */}
      {total > 0 && (
        <div style={{ ...AC.card, marginBottom: isRoaster && roastBatches?.length ? "16px" : 0 }}>
          <div style={AC.cardHeader}>
            <p style={AC.cardTitle}>Lot Pipeline</p>
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textMuted }}>{total} total</span>
          </div>
          <div style={AC.cardPad}>
            <PipelineBar draft={draftCount} listed={listedCount} contracted={contractedCount} exported={exportedCount} />
          </div>
        </div>
      )}

      {/* ── Roast batch pipeline ────────────────────────────────── */}
      {isRoaster && !!roastBatches?.length && (
        <div style={AC.card}>
          <div style={AC.cardHeader}>
            <p style={AC.cardTitle}>Roast Batch Pipeline</p>
            <span style={{ fontFamily: AT.font.sans, fontSize: "0.75rem", color: AT.color.textMuted }}>{roastBatches.length} total</span>
          </div>
          <div style={AC.cardPad}>
            <RoastBatchPipelineBar counts={roastBatchCounts} />
          </div>
        </div>
      )}

      {isFarmer && total === 0 && (
        <div style={{ ...AC.card, ...AC.cardPad, borderColor: AT.color.primary }}>
          <p style={{ ...AC.eyebrow, color: AT.color.primaryDark, marginBottom: "6px" }}>Farm Status</p>
          <p style={{ fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.textSecondary, margin: 0 }}>
            No lots linked to your farm yet. Once an exporter links a lot to you, it will show up here.
          </p>
        </div>
      )}

      <style>{`
        .ab-2col > * { min-width: 0; }
        @media (max-width: 960px){ .ab-2col { grid-template-columns: 1fr !important; } }
      `}</style>
    </AdminShell>
  );
}

type BarPointT = { label: string; value: number };
