import { StateCreator } from "zustand";
import { RelicSlice, UserStore } from "../types";

export const createRelicSlice: StateCreator<UserStore, [], [], RelicSlice> = (
  set,
) => ({
  relics: {},
  addRelic: (relic) =>
    set((state) => {
      const id = crypto.randomUUID();

      return {
        relics: {
          ...state.relics,
          [id]: {
            ...relic,
            id,
          },
        },
      };
    }),

  editRelic: (id, updatedRelic) =>
    set((state) => ({
      relics: {
        ...state.relics,
        [id]: {
          ...state.relics[id],
          ...updatedRelic,
          id,
        },
      },
    })),

  deleteRelic: (id) =>
    set((state) => {
      const newRelics = { ...state.relics };
      delete newRelics[id];

      // Clean up character references to the deleted relic
      const newCharacters = { ...state.characters };
      Object.entries(newCharacters).forEach(([charId, char]) => {
        const updatedRelics = { ...char.relics };
        let changed = false;
        (Object.keys(updatedRelics) as Array<keyof typeof updatedRelics>).forEach((slot) => {
          if (updatedRelics[slot] === id) {
            updatedRelics[slot] = null;
            changed = true;
          }
        });
        if (changed) {
          newCharacters[charId] = { ...char, relics: updatedRelics };
        }
      });

      return {
        relics: newRelics,
        characters: newCharacters,
      };
    }),
});
