import { create } from "zustand";
import { UserStore } from "./types";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import { createCharacterSlice } from "./slices/create-character.slice";
import { createRelicSlice } from "./slices/create-relic.slice";
import { createConnectSlice } from "./slices/create-connect.slice";
import { createBattleSlice } from "./slices/create-battle.slice";
import { createGlobalSlice } from "./slices/create-global.slice";
import { runStoreMigrations } from "./store-migrations";

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export const useUserStore = create<UserStore>()(
  persist(
    (...a) => ({
      ...createCharacterSlice(...a),
      ...createRelicSlice(...a),
      ...createConnectSlice(...a),
      ...createBattleSlice(...a),
      ...createGlobalSlice(...a),
    }),
    {
      name: "relic-FreeSR-config",
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (persistedState: any) => {
        return runStoreMigrations(persistedState);
      },
      partialize: (state) => ({
        // Persist everything except ephemeral state and secrets
        characters: state.characters,
        relics: state.relics,
        connectionType: state.connectionType,
        privateType: state.privateType,
        serverUrl: state.serverUrl,
        battle_type: state.battle_type,
        moc_config: state.moc_config,
        pf_config: state.pf_config,
        as_config: state.as_config,
        ce_config: state.ce_config,
        peak_config: state.peak_config,
        // Intentionally NOT persisting: username, password, isConnectPS, isEnableChangePath, isEnableLua
      }),
    },
  ),
);

