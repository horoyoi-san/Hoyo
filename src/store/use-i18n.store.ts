import { create } from "zustand";
import { persist } from "zustand/middleware";

interface I18nStore {
  language: "th" | "en";
  setLanguage: (lang: "th" | "en") => void;
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      language: "th",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "relic-FreeSR-i18n",
    }
  )
);
