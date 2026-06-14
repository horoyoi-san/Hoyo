import { create } from "zustand";
import { SubAffixData } from "../../types/affixes.type";

export type CreateRelicType = {
  id?: string;
  equipped_by?: number[];
  relic_id?: number;
  relic_set_id?: number;
  type?: string;
  level?: number;
  main_affix_id?: number;
  sub_affixes: { sub_affix_id?: number; count?: number; steps?: number[] }[];
};

interface CreateRelicStore {
  relic: CreateRelicType;
  updateRelic: (updates: Partial<CreateRelicType>) => void;
  updateSubStat: (
    index: number,
    data: Partial<{ sub_affix_id?: number; count?: number; steps?: number[] }>,
  ) => void;
  addSubRoll: (index: number, stepQuality: number) => void;
  removeSubRoll: (index: number) => void;
  randomizeStat: (
    mainAffixProperty: string,
    subAffixData?: SubAffixData,
  ) => void;
  randomizeRolls: () => void;
}

export const DEFAULT_CREATE_RELIC: CreateRelicType = {
  id: undefined,
  equipped_by: [],
  relic_id: undefined,
  relic_set_id: undefined,
  type: undefined,
  level: 15,
  main_affix_id: undefined,
  sub_affixes: [
    {
      sub_affix_id: undefined,
      count: undefined,
      steps: undefined,
    },
    {
      sub_affix_id: undefined,
      count: undefined,
      steps: undefined,
    },
    {
      sub_affix_id: undefined,
      count: undefined,
      steps: undefined,
    },
    {
      sub_affix_id: undefined,
      count: undefined,
      steps: undefined,
    },
  ],
};

export const useCreateRelicStore = create<CreateRelicStore>((set) => ({
  relic: DEFAULT_CREATE_RELIC,

  updateRelic: (updates) =>
    set((state) => {
      return {
        relic: {
          ...state.relic,
          ...updates,
        },
      };
    }),

  updateSubStat: (index, data) =>
    set((state) => {
      const newSubs = [...state.relic.sub_affixes];
      newSubs[index] = { ...newSubs[index], ...data };
      return { relic: { ...state.relic, sub_affixes: newSubs } };
    }),

  addSubRoll: (index, stepQuality) =>
    set((state) => {
      const currentSub = state.relic.sub_affixes[index];
      const newSteps = [...(currentSub.steps || [])];

      newSteps.push(stepQuality);
      const newSubs = [...state.relic.sub_affixes];
      newSubs[index] = {
        ...currentSub,
        count: newSteps.length,
        steps: newSteps,
      };
      return { relic: { ...state.relic, sub_affixes: newSubs } };
    }),

  removeSubRoll: (index) =>
    set((state) => {
      const currentSub = state.relic.sub_affixes[index];
      const newSteps = [...(currentSub.steps || [])];

      if (newSteps.length > 1) {
        newSteps.pop();
        const newSubs = [...state.relic.sub_affixes];
        newSubs[index] = {
          ...currentSub,
          count: newSteps.length,
          steps: newSteps,
        };
        return { relic: { ...state.relic, sub_affixes: newSubs } };
      }
      return state;
    }),

  randomizeStat: (mainAffixProperty, subAffixData) =>
    set((state) => {
      const allOptions = Object.values(subAffixData?.[5] ?? {});

      // REMOVE OPTION SUB STAT === MAIN STAT
      const availableOptions = allOptions.filter(
        (opt) => opt.Property !== mainAffixProperty,
      );

      // RANDOM AND GET 4
      const shuffled = [...availableOptions].sort(() => 0.5 - Math.random());
      const selected4 = shuffled.slice(0, 4);

      const newSubs = selected4.map((opt) => ({
        sub_affix_id: opt.AffixID,
        count: 1,
        steps: [Math.floor(Math.random() * 3)], // RANDOMIZE STEP QUALITY
      }));

      return { relic: { ...state.relic, sub_affixes: newSubs } };
    }),

  randomizeRolls: () =>
    set((state) => {
      const newSubs = state.relic.sub_affixes.map((sub) => ({
        ...sub,
        count: sub.sub_affix_id ? 1 : 0,
        steps: sub.sub_affix_id
          ? [sub.steps?.[0] ?? Math.floor(Math.random() * 3)]
          : [],
      }));

      const filledSlots = newSubs.filter((s) => s.sub_affix_id).length;
      if (filledSlots === 0) return state;

      for (let i = 0; i < 5; i++) {
        const validIndices = newSubs
          .map((s, idx) => (s.sub_affix_id ? idx : -1))
          .filter((idx) => idx !== -1);
        const randomIdx =
          validIndices[Math.floor(Math.random() * validIndices.length)];

        if (newSubs[randomIdx].count < 6) {
          newSubs[randomIdx].count! += 1;
          newSubs[randomIdx].steps!.push(Math.floor(Math.random() * 3));
        } else {
          i--;
        }
      }

      return { relic: { ...state.relic, sub_affixes: newSubs } };
    }),
}));
