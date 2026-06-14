import { StateCreator } from "zustand";
import {
  CharacterConfigStore,
  CharacterSlice,
  RelicConfigStore,
  UserStore,
} from "../types";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";

export const createCharacterSlice: StateCreator<
  UserStore,
  [],
  [],
  CharacterSlice
> = (set) => ({
  characters: {},
  updateCharacter: (charId, updates) =>
    set((state) => {
      const currentData = state.characters[charId] ?? {
        ...DEFAULT_CHAR_CONFIG,
        id: charId,
      };

      return {
        characters: {
          ...state.characters,
          [charId]: { ...currentData, ...updates },
        },
      };
    }),

  equipRelic: (charId, relicId, slot) =>
    set((state) => {
      const currentData = state.characters[charId] ?? {
        ...DEFAULT_CHAR_CONFIG,
        id: charId,
      };

      const oldRelicId =
        currentData.relics[slot as keyof typeof currentData.relics];
      const newRelics = { ...state.relics };

      if (oldRelicId && oldRelicId !== relicId && newRelics[oldRelicId]) {
        newRelics[oldRelicId] = {
          ...newRelics[oldRelicId],
          equipped_by: (newRelics[oldRelicId].equipped_by || []).filter(
            (id) => id !== charId,
          ),
        };
      }

      if (relicId && newRelics[relicId]) {
        const currentEquippedBy = newRelics[relicId].equipped_by || [];
        if (!currentEquippedBy.includes(charId)) {
          newRelics[relicId] = {
            ...newRelics[relicId],
            equipped_by: [...currentEquippedBy, charId],
          };
        }
      }

      return {
        characters: {
          ...state.characters,
          [charId]: {
            ...currentData,
            relics: {
              ...currentData.relics,
              [slot]: relicId,
            },
          },
        },
        relics: newRelics,
      };
    }),

  unequipRelic: (charId, slot) =>
    set((state) => {
      const currentData = state.characters[charId] ?? {
        ...DEFAULT_CHAR_CONFIG,
        id: charId,
      };

      const oldRelicId =
        currentData.relics[slot as keyof typeof currentData.relics];
      const newRelics = { ...state.relics };

      if (oldRelicId && newRelics[oldRelicId]) {
        newRelics[oldRelicId] = {
          ...newRelics[oldRelicId],
          equipped_by: (newRelics[oldRelicId].equipped_by || []).filter(
            (id) => id !== charId,
          ),
        };
      }

      return {
        characters: {
          ...state.characters,
          [charId]: {
            ...currentData,
            relics: {
              ...currentData.relics,
              [slot]: null,
            },
          },
        },
        relics: newRelics,
      };
    }),

  addImportedData: (
    newRelics: Record<string, RelicConfigStore>,
    newCharacters: Record<number, CharacterConfigStore>,
  ) =>
    set((state) => ({
      relics: { ...state.relics, ...newRelics },
      characters: { ...state.characters, ...newCharacters },
    })),
});
