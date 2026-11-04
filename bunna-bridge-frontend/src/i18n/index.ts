/**
 * Translations for field-agent and farmer screens (roadmap O-5).
 * English is the source. Amharic (am) and Afaan Oromo (om) are first drafts
 * and must be reviewed by native speakers before go-live.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { am } from "./am";
import { om } from "./om";

export const LANGUAGES = [
  { code: "am", label: "አማርኛ" },
  { code: "om", label: "Afaan Oromoo" },
  { code: "en", label: "English" },
] as const;

const STORAGE_KEY = "bb_lang";

function storedLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, am: { translation: am }, om: { translation: om } },
  lng: storedLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(code: string) {
  i18n.changeLanguage(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode — language still changes for this session */
  }
  document.documentElement.lang = code;
}

export default i18n;
