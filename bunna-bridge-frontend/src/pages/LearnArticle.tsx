import { Fragment, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Check, Pencil, PlayCircle, X } from "lucide-react";
import AppShell from "../components/AppShell";
import { ErrorNote, Field, Muted, Pill } from "../components/trace/ui";
import { formatDate, grid } from "../components/trace/styles";
import { createArticle, getArticle, updateArticle, type Article } from "../api/market";
import { apiError } from "../api/traceability";
import { useAuth } from "../context/AuthContext";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

/** Plain-text body: blank lines split paragraphs, a line starting "## " is a heading. No HTML is rendered. */
function Body({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 680 }}>
      {blocks.map((b, i) => (
        <Fragment key={i}>
          {b.startsWith("## ") ? (
            <h2 style={{ fontFamily: AT.font.sans, fontSize: "1.25rem", fontWeight: 600, color: AT.color.text, margin: "10px 0 0" }}>{b.slice(3)}</h2>
          ) : (
            <p style={{ fontFamily: AT.font.sans, fontSize: "1rem", lineHeight: 1.65, color: AT.color.text, margin: 0, whiteSpace: "pre-line" }}>{b}</p>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default function LearnArticle() {
  const { slug = "" } = useParams();
  const isNew = slug === "new";
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError } = useQuery({ queryKey: ["article", slug], queryFn: () => getArticle(slug), enabled: !isNew });
  const [editing, setEditing] = useState(isNew);

  return (
    <AppShell footer>
      <div className="container-editorial" style={{ paddingBlock: 32 }}>
        <Link to="/learn" style={{ ...AC.btnGhost, textDecoration: "none", display: "inline-flex", marginBottom: 16 }}><ArrowLeft size={14} /> Learn</Link>
        {editing && isAdmin ? (
          <Editor key={isNew ? "new" : data?.slug ?? "loading"} article={isNew ? null : data ?? null} onDone={() => setEditing(false)} />
        ) : isLoading ? <Muted>Loading…</Muted> : isError || !data ? <Muted>This article isn't available.</Muted> : (
          <article>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <Pill tone="blue">{data.kind_label}</Pill>
              {data.region && <Pill tone="muted">{data.region}</Pill>}
              {!data.published_at && <Pill tone="yellow">Draft</Pill>}
            </span>
            <h1 style={{ ...AC.pageTitle, fontSize: "clamp(2rem, 4vw, 2.6rem)", maxWidth: 760 }}>{data.title}</h1>
            <p style={{ ...AC.pageSubtitle, maxWidth: 680 }}>{data.summary}</p>
            <Muted style={{ margin: "8px 0 20px" }}>{data.published_at ? formatDate(data.published_at) : "Not published"}{data.author_name ? ` · ${data.author_name}` : ""}</Muted>
            {isAdmin && <button style={{ ...AC.btnGhost, marginBottom: 16 }} onClick={() => setEditing(true)}><Pencil size={13} /> Edit</button>}
            {data.cover_image_url && <img src={data.cover_image_url} alt="" style={{ width: "100%", maxWidth: 760, borderRadius: AT.radius.md, marginBottom: 20, display: "block" }} />}
            {data.kind === "webinar" && (data.event_at || data.video_url) && (
              <div style={{ ...AC.card, ...AC.cardPad, maxWidth: 680, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {data.event_at && <span style={{ fontFamily: AT.font.sans, display: "flex", gap: 6, alignItems: "center" }}><CalendarDays size={15} /> {new Date(data.event_at).toLocaleString()}</span>}
                {data.video_url && <a href={data.video_url} target="_blank" rel="noopener noreferrer" style={{ ...AC.btnPrimary, textDecoration: "none" }}><PlayCircle size={14} /> Watch</a>}
              </div>
            )}
            <Body text={data.body ?? ""} />
          </article>
        )}
      </div>
    </AppShell>
  );
}

function Editor({ article, onDone }: { article: Article | null; onDone: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
  const [f, setF] = useState(() => article ? {
    title: article.title, slug: article.slug, kind: article.kind as string, region: article.region, summary: article.summary, body: article.body ?? "",
    cover_image_url: article.cover_image_url, video_url: article.video_url, event_at: toLocal(article.event_at), published: !!article.published_at,
  } : { title: "", slug: "", kind: "origin", region: "", summary: "", body: "", cover_image_url: "", video_url: "", event_at: "", published: false });
  const [error, setError] = useState("");
  const save = async () => {
    setError("");
    const { published, ...rest } = f;
    const payload = {
      ...rest, slug: f.slug || f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      event_at: f.event_at ? new Date(f.event_at).toISOString() : null,
      published_at: published ? (article?.published_at ?? new Date().toISOString()) : null,
    };
    try {
      const saved = article ? await updateArticle(article.slug, payload) : await createArticle(payload);
      qc.invalidateQueries({ queryKey: ["articles"] });
      qc.setQueryData(["article", saved.slug], saved);
      if (!article || saved.slug !== article.slug) navigate(`/learn/${saved.slug}`, { replace: true });
      onDone();
    } catch (e) { setError(apiError(e)); }
  };
  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <p style={AC.cardTitle}>{article ? "Edit article" : "New article"}</p>
      <ErrorNote>{error}</ErrorNote>
      <div style={grid(200)}>
        <Field label="Title"><input style={AC.input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Link name" hint="Letters, numbers and dashes. Left empty, it comes from the title."><input style={AC.input} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
        <Field label="Kind">
          <select style={AC.input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            <option value="origin">Origin guide</option><option value="harvest">Harvest report</option><option value="guide">Buyer guide</option><option value="webinar">Webinar</option>
          </select>
        </Field>
        <Field label="Region"><input style={AC.input} value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} /></Field>
        <Field label="Cover image (https link)"><input style={AC.input} value={f.cover_image_url} onChange={(e) => setF({ ...f, cover_image_url: e.target.value })} /></Field>
        <Field label="Video link (https)"><input style={AC.input} value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} /></Field>
        {f.kind === "webinar" && <Field label="Webinar date and time"><input style={AC.input} type="datetime-local" value={f.event_at} onChange={(e) => setF({ ...f, event_at: e.target.value })} /></Field>}
      </div>
      <Field label="Summary"><textarea style={{ ...AC.input, minHeight: 56 }} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
      <Field label="Body" hint='Plain text. Leave a blank line between paragraphs; start a line with "## " for a heading.'>
        <textarea style={{ ...AC.input, minHeight: 260, fontFamily: AT.font.sans }} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      </Field>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: AT.font.sans, fontSize: "0.85rem", marginBottom: 12 }}>
        <input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Published
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={AC.btnPrimary} disabled={!f.title.trim()} onClick={save}><Check size={13} /> Save</button>
        <button style={AC.btnGhost} onClick={() => (article ? onDone() : navigate("/learn"))}><X size={13} /> Cancel</button>
      </div>
    </div>
  );
}
