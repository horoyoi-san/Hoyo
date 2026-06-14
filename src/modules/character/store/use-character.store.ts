import { create } from "zustand";
import { CharacterDetails } from "../utils/character-detail.type";
import { LightconeDetails } from "../utils/lightcone-detail.type";

interface CharacterStore {
  id?: string;
  setId: (id: string) => void;
  charData?: CharacterDetails;
  setCharData: (char: CharacterDetails) => void;
  lightconeData?: LightconeDetails;
  setLightcone?: (lightconeData: LightconeDetails) => void;
}

export const useCharacterStore = create<CharacterStore>((set) => ({
  id: undefined,
  setId: (id) => set({ id }),
  charData: undefined,
  setCharData: (charData) => set({ charData }),
  lightconeData: undefined,
  setLightcone: (lightconeData) => set({ lightconeData }),
}));
