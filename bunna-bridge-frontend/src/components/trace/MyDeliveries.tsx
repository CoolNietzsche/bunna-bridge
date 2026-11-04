import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import "../../i18n";
import { LANGUAGES, setLanguage } from "../../i18n";
import { Muted } from "./ui";
import { formatDate } from "./styles";
import { formatEtb, getMyDeliveries } from "../../api/supply";
import { AT } from "../../styles/adminTokens";
import { AC } from "../../styles/adminComponents";

/** A farmer's own deliveries and payments, as recorded by the station or cooperative. */
export default function MyDeliveries() {
  const { t, i18n } = useTranslation();
  const { data } = useQuery({ queryKey: ["my-deliveries"], queryFn: getMyDeliveries });
  if (!data || data.results.length === 0) return null;
  return (
    <div style={{ ...AC.card, ...AC.cardPad, marginTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
        <p style={AC.cardTitle}>{t("farmer.my_deliveries")}</p>
        <select aria-label="Language" value={i18n.language} onChange={(e) => setLanguage(e.target.value)} style={{ ...AC.input, width: "auto" }}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <Muted style={{ marginBottom: "12px" }}>
        {t("farmer.delivered", { kg: Number(data.summary.weight_kg).toLocaleString() })} · {t("farmer.paid_total", { amount: Number(data.summary.paid_etb).toLocaleString() })}
      </Muted>
      <div style={{ overflowX: "auto" }}>
        <table style={AC.table}>
          <thead><tr><th style={AC.th}>{t("farmer.date")}</th><th style={AC.th}>{t("farmer.receipt")}</th><th style={AC.th}>{t("farmer.weight")}</th><th style={AC.th}>{t("farmer.price")}</th><th style={AC.th}>{t("farmer.paid")}</th><th style={AC.th}>{t("farmer.received_by")}</th></tr></thead>
          <tbody>
            {data.results.map((d) => (
              <tr key={d.id}>
                <td style={AC.td}>{formatDate(d.delivered_on)}</td>
                <td style={{ ...AC.td, fontFamily: AT.font.mono }}>{d.receipt_number}</td>
                <td style={AC.td}>{Number(d.weight_kg).toLocaleString()} kg</td>
                <td style={AC.td}>{d.price_per_kg_etb ? `${formatEtb(d.price_per_kg_etb)}/kg` : "—"}</td>
                <td style={{ ...AC.td, color: Number(d.amount_paid_etb || 0) > 0 ? AT.color.green : AT.color.yellow }}>
                  {Number(d.amount_paid_etb || 0) > 0 ? formatEtb(d.amount_paid_etb) : t("farmer.due", { amount: formatEtb(d.amount_due_etb) })}
                </td>
                <td style={AC.td}>{d.received_by}{d.lot ? ` · lot ${d.lot}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
