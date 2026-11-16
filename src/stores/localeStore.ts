import { ChangelogItemType } from '@/types';
import { create } from 'zustand'
import { persist } from 'zustand/middleware';
import { localePersistedSchema } from '@/zod';
import { createValidatedJSONStorage } from './persistStorage';


interface LocaleState {
    locale: string;
    theme: string;
    currentVersion: string
    changelog: ChangelogItemType[]
    setCurrentVersion: (currentVersion: string) => void;
    setChangelog: (newChangelog: ChangelogItemType[]) => void;
    setTheme: (newTheme: string) => void;
    setLocale: (newLocale: string) => void;
}

type LocalePersistedState = Pick<LocaleState, "locale" | "theme" | "currentVersion" | "changelog">;

const useLocaleStore = create<LocaleState>()(
    persist<LocaleState, [], [], LocalePersistedState>(
        (set) => ({
            locale: "en",
            theme: "night",
            currentVersion: "",
            changelog: [],
            setCurrentVersion: (currentVersion: string) => set({ currentVersion }),
            setChangelog: (newChangelog: ChangelogItemType[]) => set({ changelog: newChangelog }),
            setTheme: (newTheme: string) => set({ theme: newTheme }),
            setLocale: (newLocale: string) => set({ locale: newLocale }),
        }),
        {
            name: 'locale-storage',
            storage: createValidatedJSONStorage(() => localStorage, localePersistedSchema),
            partialize: (state) => ({
                locale: state.locale,
                theme: state.theme,
                currentVersion: state.currentVersion,
                changelog: state.changelog,
            }),
        }
    )
);

export default useLocaleStore;
