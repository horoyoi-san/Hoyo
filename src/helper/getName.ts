import { listCurrentLanguageApi } from "@/constant/constant";
import { AvatarDetail } from "@/types";
import { useTranslations } from "next-intl"

type TFunc = ReturnType<typeof useTranslations>
function cleanText(text: string): string {
  if (!text) return ""
  return text.replace(/<unbreak>(.*?)<\/unbreak>/g, "$1")
}

export function getNameChar(
  locale: string,
  t: TFunc,
  data: AvatarDetail | undefined
): string {
  if (!data) return "";

  const normalizedLocale = (locale || "en").toLowerCase();
  const langKey = (listCurrentLanguageApi[normalizedLocale as keyof typeof listCurrentLanguageApi] || normalizedLocale).toLowerCase();

  let text = (langKey && data.Name?.[langKey]) ? data.Name[langKey] : "";

  if (!text) {
    text = data.Name?.["en"] || data.Name?.["cn"] || data.Name?.["vi"] || Object.values(data.Name || {}).find((v) => Boolean(v)) || "";
  }

  if (data.ID > 8000) {
    text = `${t("trailblazer")} • ${t(data?.BaseType?.toLowerCase() ?? "")}`;
  }

  return cleanText(text)
}

export function getLocaleName(locale: string, data: Record<string, string> | undefined | null): string {
    if (!data) {
        return ""
    }
    
    const normalizedLocale = (locale || "en").toLowerCase();
    const langKey = (listCurrentLanguageApi[normalizedLocale as keyof typeof listCurrentLanguageApi] || normalizedLocale).toLowerCase();

    let text = (langKey && data[langKey]) ? data[langKey] : "";

    if (!text) {
        text = data["en"] || data["cn"] || data["vi"] || Object.values(data).find((v) => Boolean(v)) || "";
    }
    
    return cleanText(text)
}

export function parseRuby(text: string): string {
    const rubyRegex = /\{RUBY_B#(.*?)\}(.*?)\{RUBY_E#\}/gs;
    return text.replace(rubyRegex, (_match, furigana, kanji) => {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
    });
}