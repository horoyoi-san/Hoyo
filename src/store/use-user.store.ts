import { create } from "zustand";
import { UserStore } from "./types";
import { persist } from "zustand/middleware";
import { createCharacterSlice } from "./slices/create-character.slice";
import { createRelicSlice } from "./slices/create-relic.slice";
import { runStoreMigrations } from "./store-migrations";

export const useUserStore = create<UserStore>()(
  persist(
    (...a) => ({
      ...createCharacterSlice(...a),
      ...createRelicSlice(...a),
    }),
    {
      name: "relic-FreeSR-config",
      version: 1,
      migrate: (persistedState: any) => {
        return runStoreMigrations(persistedState);
      },
    },
  ),
);
