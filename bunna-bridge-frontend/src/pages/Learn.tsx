import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarDays, Plus } from "lucide-react";
import AppShell from "../components/AppShell";
import { Muted, Pill } from "../components/trace/ui";
import { formatDate } from "../components/trace/styles";
import { getArticles } from "../api/market";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

const KINDS: [string, string][] = [["", "All"], ["origin", "Origins"], ["harvest", "Harvest reports"], ["guide", "Guides"], ["webinar", "Webinars"]];

/** Education hub: origin guides, harvest reports and buyer guides (M-7). Public. */
export default function Learn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kind, setKind] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["articles", kind], queryFn: () => getArticles(kind) });
  const isAdmin = user?.role === "admin";
  return (
    <AppShell footer>
      <div className="container-editorial" style={{ paddingBlock: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={AC.eyebrow}>Learn</p>
            <h1 style={{ ...AC.pageTitle, fontSize: "clamp(2rem, 4vw, 2.6rem)", marginTop: 4 }}>Ethiopian coffee, explained</h1>
            <p style={AC.pageSubtitle}>Origin guides, harvest reports and practical guides to buying Ethiopian coffee under the EUDR.</p>
          </div>
          {isAdmin && <button style={AC.btnPrimary} onClick={() => navigate("/learn/new")}><Plus size={14} /> New article</button>}
        </div>
        <div style={{ display: "flex", gap: 6, margin: "18px 0", flexWrap: "wrap" }}>
          {KINDS.map(([k, label]) => <button key={k} onClick={() => setKind(k)} style={kind === k ? AC.btnPrimary : AC.btnGhost}>{label}</button>)}
        </div>
        {isLoading && <Muted>Loading…</Muted>}
        {!isLoading && data.length === 0 && <Muted>Nothing published here yet.</Muted>}
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))" }}>
          {data.map((a) => (
            <Link key={a.id} to={`/learn/${a.slug}`} style={{ textDecoration: "none", ...AC.card, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {a.cover_image_url ? (
                <img src={a.cover_image_url} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ aspectRatio: "16 / 9", background: AT.color.primaryLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={32} color={AT.color.primary} />
                </div>
              )}
              <div style={{ ...AC.cardPad, display: "grid", gap: 6 }}>
                <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Pill tone="blue">{a.kind_label}</Pill>
                  {a.region && <Pill tone="muted">{a.region}</Pill>}
                  {!a.published_at && <Pill tone="yellow">Draft</Pill>}
                </span>
                <span style={{ fontFamily: AT.font.sans, fontWeight: 600, fontSize: "1.05rem", color: AT.color.text }}>{a.title}</span>
                <Muted>{a.summary}</Muted>
                {a.kind === "webinar" && a.event_at && <Muted><CalendarDays size={12} style={{ verticalAlign: "-2px" }} /> {new Date(a.event_at).toLocaleString()}</Muted>}
                {a.published_at && <Muted>{formatDate(a.published_at)}{a.author_name ? ` · ${a.author_name}` : ""}</Muted>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
