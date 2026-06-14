export type UserStore = CharacterSlice & RelicSlice;

// CHARACTER
export type CharacterSlice = {
  characters: Record<string, CharacterConfigStore>;
  updateCharacter: (
    charId: number,
    updates: Partial<CharacterConfigStore>,
  ) => void;
  equipRelic: (charId: number, relicId: string, slot: string) => void;
  unequipRelic: (charId: number, slot: string) => void;
  addImportedData: (
    newRelics: Record<string, RelicConfigStore>,
    newCharacters: Record<number, CharacterConfigStore>,
  ) => void;
};

export type CharacterConfigStore = {
  id: number;
  level: number;
  promotion: number;
  rank: number;
  lightcone: LightconeConfigStore;
  relics: {
    HEAD: string | null;
    HAND: string | null;
    BODY: string | null;
    FOOT: string | null;
    NECK: string | null;
    OBJECT: string | null;
  };
  sp: number;
  use_technique: boolean;
};

// LIGHTCONE
export type LightconeConfigStore = {
  id: number | null;
  promotion: number;
  rank: number;
  level: number;
};

// RELIC
export type RelicSlice = {
  relics: Record<string, RelicConfigStore>;
  addRelic: (relic: RelicConfigStore) => void;
  editRelic: (id: string, updatedRelic: RelicConfigStore) => void;
  deleteRelic: (id: string) => void;
};

export type RelicConfigStore = {
  id?: string;
  relic_id: number;
  relic_set_id: number;
  type: string;
  level: number;
  main_affix_id: number;
  sub_affixes: {
    sub_affix_id: number;
    count: number;
    step: number;
  }[];
  equipped_by?: number[];
};
