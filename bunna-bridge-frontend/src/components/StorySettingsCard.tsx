import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, ExternalLink, ImageUp, Trash2 } from "lucide-react";
import { getStorySettings, saveStorySettings, type StorySettings } from "../api/lots";
import { apiError } from "../api/traceability";
import { ErrorNote, Field, Muted } from "./trace/ui";
import { grid } from "./trace/styles";
import { AT } from "../styles/adminTokens";
import { AC } from "../styles/adminComponents";

/**
 * How this lot's public story page (/story/<id>) is presented: partner header,
 * place line, partner reference, top picture, order button, partner statements
 * and grower names. The verified checklist on that page is always worked out
 * from the lot's records and cannot be edited here.
 */
export default function StorySettingsCard({ lotId, listed }: { lotId: string; listed: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["story-settings", lotId], queryFn: () => getStorySettings(lotId) });
  const [draft, setDraft] = useState<(StorySettings & { statementsText: string }) | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!data) return null;
  const f = draft ?? { ...data, statementsText: (data.statements || []).join("\n") };
  const set = (patch: Partial<typeof f>) => { setSaved(false); setDraft({ ...f, ...patch }); };
  const refresh = (next: StorySettings) => {
    qc.setQueryData(["story-settings", lotId], next);
    setDraft(null);
  };

  const save = async () => {
    setError("");
    setBusy(true);
    try {
      refresh(await saveStorySettings(lotId, {
        partner_line: f.partner_line, place_label: f.place_label, reference: f.reference,
        order_label: f.order_label, order_detail: f.order_detail, order_price: f.order_price, order_url: f.order_url,
        statements_by: f.statements_by, statements: f.statementsText.split("\n"), show_grower_names: f.show_grower_names,
      }));
      setSaved(true);
    } catch (e) { setError(apiError(e)); } finally { setBusy(false); }
  };
  const upload = async (file: File | null) => {
    if (!file) return;
    setError("");
    const fd = new FormData();
    fd.append("hero_image", file);
    try { refresh(await saveStorySettings(lotId, fd)); } catch (e) { setError(apiError(e)); }
  };
  const removeHero = async () => {
    const fd = new FormData();
    fd.append("remove_hero", "true");
    try { refresh(await saveStorySettings(lotId, fd)); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div style={{ ...AC.card, ...AC.cardPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <p style={{ ...AC.cardTitle, display: "flex", alignItems: "center", gap: 6, margin: 0 }}><BookOpen size={15} /> Public story page</p>
        {listed ? (
          <a href={`/story/${lotId}`} target="_blank" rel="noopener noreferrer" style={{ ...AC.btnSm, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ExternalLink size={13} /> Open the story page
          </a>
        ) : <Muted>Visible once the lot is listed.</Muted>}
      </div>
      <Muted style={{ marginBottom: 14 }}>
        What buyers and coffee drinkers see when they scan the lot’s QR code. The checklist on that page is worked out from this lot’s records; partner statements are shown as theirs, not as verified.
      </Muted>
      <ErrorNote>{error}</ErrorNote>

      <div style={grid(220)}>
        <Field label="Partner header" hint="Above the lot name, e.g. a hotel and its roastery.">
          <input style={AC.input} value={f.partner_line} maxLength={120} onChange={(e) => set({ partner_line: e.target.value })} placeholder="Skylight Hotel × Eset Coffee Roastery" />
        </Field>
        <Field label="Place line" hint="Left empty, it uses the washing station and region.">
          <input style={AC.input} value={f.place_label} maxLength={120} onChange={(e) => set({ place_label: e.target.value })} placeholder="Bensa, Sidama Highlands" />
        </Field>
        <Field label="Partner lot reference" hint="Left empty, the Beersheba lot ID is shown.">
          <input style={AC.input} value={f.reference} maxLength={40} onChange={(e) => set({ reference: e.target.value })} placeholder="SKY-SID-001" />
        </Field>
      </div>

      <Field label="Top picture" hint="A forest canopy or farm photo. Without one, the page shows the farm on a satellite map.">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {data.hero_image && <img src={data.hero_image} alt="Current top picture" style={{ width: 120, height: 72, objectFit: "cover", borderRadius: AT.radius.sm }} />}
          <label style={{ ...AC.btnSm, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <ImageUp size={13} /> {data.hero_image ? "Replace" : "Upload"}
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(e) => upload(e.target.files?.[0] ?? null)} />
          </label>
          {data.hero_image && <button type="button" style={{ ...AC.btnSm, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={removeHero}><Trash2 size={13} /> Remove</button>}
        </div>
      </Field>

      <p style={{ ...AC.cardTitle, fontSize: "0.85rem", margin: "6px 0 8px" }}>Order button</p>
      <div style={grid(200)}>
        <Field label="Button text" hint="Leave empty for no button.">
          <input style={AC.input} value={f.order_label} maxLength={60} onChange={(e) => set({ order_label: e.target.value })} placeholder="Take Ethiopia home" />
        </Field>
        <Field label="What is sold">
          <input style={AC.input} value={f.order_detail} maxLength={80} onChange={(e) => set({ order_detail: e.target.value })} placeholder="250 g souvenir box" />
        </Field>
        <Field label="Price">
          <input style={AC.input} value={f.order_price} maxLength={20} onChange={(e) => set({ order_price: e.target.value })} placeholder="$20" />
        </Field>
        <Field label="Shop or WhatsApp link (optional)" hint="Without a link, the button opens an order request that is emailed to the Beersheba team.">
          <input style={AC.input} value={f.order_url} onChange={(e) => set({ order_url: e.target.value })} placeholder="https://…" />
        </Field>
      </div>

      <p style={{ ...AC.cardTitle, fontSize: "0.85rem", margin: "6px 0 8px" }}>Partner statements</p>
      <div style={grid(220)}>
        <Field label="Made by">
          <input style={AC.input} value={f.statements_by} maxLength={120} onChange={(e) => set({ statements_by: e.target.value })} placeholder="Eset Coffee Roastery" />
        </Field>
      </div>
      <Field label="One statement per line (up to 6)" hint="Claims Beersheba cannot check, such as roasting methods. Shown under the partner’s name, never with a verified tick.">
        <textarea style={{ ...AC.input, minHeight: 84 }} value={f.statementsText} onChange={(e) => set({ statementsText: e.target.value })}
          placeholder={"Grown under native Afromontane forest canopy\nRoasted with clean-energy recirculation technology"} />
      </Field>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: AT.font.sans, fontSize: "0.85rem", color: AT.color.text, margin: "4px 0 14px" }}>
        <input type="checkbox" checked={f.show_grower_names} onChange={(e) => set({ show_grower_names: e.target.checked })} style={{ marginTop: 3 }} />
        <span>Name the growers<br /><Muted>Only growers who gave consent to appear on public lot pages are named, and only their plots are drawn on the map.</Muted></span>
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="button" style={AC.btnPrimary} disabled={busy || !draft} onClick={save}><Check size={13} /> Save story page</button>
        {saved && <Muted>Saved.</Muted>}
      </div>
    </div>
  );
}
