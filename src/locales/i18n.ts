import { useLang } from "../context/LangContext";
import es from "./es.json";
import en from "./en.json";
import pt from "./pt.json";

// Type definitions to help make the translation system safe and structured
type TranslationSchema = typeof es;
const translations: Record<string, any> = { es, en, pt };

export const useTranslation = () => {
  const { lang } = useLang();
  const tData = translations[lang] || translations.es;

  const t = (path: string, replacements?: Record<string, string | number>): any => {
    const keys = path.split(".");
    let result: any = tData;

    for (const key of keys) {
      if (result && key in result) {
        result = result[key];
      } else {
        // Fallback to ES if translation key is missing in English
        let fallbackResult: any = translations.es;
        for (const fbKey of keys) {
          if (fallbackResult && fbKey in fallbackResult) {
            fallbackResult = fallbackResult[fbKey];
          } else {
            return path; // Fallback to path string if not found anywhere
          }
        }
        result = fallbackResult;
        break;
      }
    }

    if (typeof result === "string" && replacements) {
      let str = result;
      Object.entries(replacements).forEach(([key, val]) => {
        str = str.replace(`{${key}}`, String(val));
      });
      return str;
    }

    return result;
  };

  return { t, lang };
};
