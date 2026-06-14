import { useI18nStore } from "@/src/store/use-i18n.store";
import { thTranslations } from "@/src/lib/translations";

export const useTranslation = () => {
  const language = useI18nStore((state) => state.language);

  const t = (key: string): string => {
    if (language === "th") {
      return thTranslations[key] || key;
    }
    // Return original key as English fallback
    // Or you can map it if the keys are not exact English phrases,
    // but the user's provided dictionary has English keys.
    // e.g. "skillType" -> "Skill Type"
    // To make it look nice, we capitalize if it's returning the key directly:
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return { t, language };
};
