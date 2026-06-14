import { StateCreator } from "zustand";
import { BattleSlice, UserStore } from "../types";

export const createBattleSlice: StateCreator<
  UserStore,
  [],
  [],
  BattleSlice
> = (set) => ({
  battle_type: "",
  moc_config: {
    event_id: 0,
    challenge_id: 0,
    floor_side: "Upper",
    use_turbulence_buff: true,
    use_cycle_count: true,
    blessings: [],
    cycle_count: 0,
    stage_id: 0,
    monsters: [],
  },
  pf_config: {
    event_id: 0,
    challenge_id: 0,
    buff_id: 0,
    floor_side: "Upper",
    blessings: [],
    cycle_count: 0,
    stage_id: 0,
    monsters: [],
  },
  as_config: {
    event_id: 0,
    challenge_id: 0,
    buff_id: 0,
    floor_side: "Upper",
    blessings: [],
    cycle_count: 0,
    stage_id: 0,
    monsters: [],
  },
  ce_config: {
    blessings: [],
    cycle_count: 30,
    stage_id: 0,
    monsters: [],
  },
  peak_config: {
    event_id: 0,
    challenge_id: 0,
    buff_id: 0,
    boss_mode: "Normal",
    blessings: [],
    cycle_count: 0,
    stage_id: 0,
    monsters: [],
  },
  setBattleType: (type) => set({ battle_type: type }),
  setMocConfig: (config) => set({ moc_config: config }),
  setPfConfig: (config) => set({ pf_config: config }),
  setAsConfig: (config) => set({ as_config: config }),
  setCeConfig: (config) => set({ ce_config: config }),
  setPeakConfig: (config) => set({ peak_config: config }),
});
