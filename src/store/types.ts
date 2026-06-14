export type UserStore = CharacterSlice & RelicSlice & ConnectSlice & BattleSlice & GlobalSlice;

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
  skills: Record<string, number>;
  enhanced: string | null;
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

// CONNECT — PS Server Connection
export type ConnectSlice = {
  connectionType: string;
  privateType: string;
  serverUrl: string;
  username: string;
  password: string;
  setConnectionType: (type: string) => void;
  setPrivateType: (type: string) => void;
  setServerUrl: (url: string) => void;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
};

// BATTLE CONFIG
export type BattleSlice = {
  battle_type: string;
  moc_config: MOCConfigStore;
  pf_config: PFConfigStore;
  as_config: ASConfigStore;
  ce_config: CEConfigStore;
  peak_config: PEAKConfigStore;
  setBattleType: (type: string) => void;
  setMocConfig: (config: MOCConfigStore) => void;
  setPfConfig: (config: PFConfigStore) => void;
  setAsConfig: (config: ASConfigStore) => void;
  setCeConfig: (config: CEConfigStore) => void;
  setPeakConfig: (config: PEAKConfigStore) => void;
};

export type MOCConfigStore = {
  event_id: number;
  challenge_id: number;
  floor_side: string;
  use_turbulence_buff: boolean;
  use_cycle_count: boolean;
  blessings: number[];
  cycle_count: number;
  stage_id: number;
  monsters: number[][];
};

export type PFConfigStore = {
  event_id: number;
  challenge_id: number;
  buff_id: number;
  floor_side: string;
  blessings: number[];
  cycle_count: number;
  stage_id: number;
  monsters: number[][];
};

export type ASConfigStore = {
  event_id: number;
  challenge_id: number;
  buff_id: number;
  floor_side: string;
  blessings: number[];
  cycle_count: number;
  stage_id: number;
  monsters: number[][];
};

export type CEConfigStore = {
  blessings: number[];
  cycle_count: number;
  stage_id: number;
  monsters: number[][];
};

export type PEAKConfigStore = {
  event_id: number;
  challenge_id: number;
  buff_id: number;
  boss_mode: string;
  blessings: number[];
  cycle_count: number;
  stage_id: number;
  monsters: number[][];
};

// GLOBAL STATE
export type GlobalSlice = {
  isConnectPS: boolean;
  isEnableChangePath: boolean;
  isEnableLua: boolean;
  setIsConnectPS: (val: boolean) => void;
  setIsEnableChangePath: (val: boolean) => void;
  setIsEnableLua: (val: boolean) => void;
};
