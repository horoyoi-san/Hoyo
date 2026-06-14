import { CharacterConfigStore } from "../store/types";

export const BASE_URL = {
  enka: "/api/enka",
  neonteam: "/api/neonteam",
  internal: "/api",
  mihomo: "/api/mihomo",
} as const;

export const PATHS = [
  "Priest",
  "Warrior",
  "Elation",
  "Mage",
  "Shaman",
  "Rogue",
  "Warlock",
  "Knight",
  "Memory",
];

export const ELEMENTS = [
  "Fire",
  "Ice",
  "Imaginary",
  "Physical",
  "Quantum",
  "Thunder",
  "Wind",
];

export const DEFAULT_CHAR_CONFIG: CharacterConfigStore = {
  id: 1001,
  rank: 0,
  level: 80,
  promotion: 6,
  lightcone: {
    id: null,
    level: 80,
    promotion: 6,
    rank: 1,
  },
  relics: {
    HEAD: null,
    HAND: null,
    BODY: null,
    FOOT: null,
    NECK: null,
    OBJECT: null,
  },
  sp: 50,
  use_technique: false,
};
