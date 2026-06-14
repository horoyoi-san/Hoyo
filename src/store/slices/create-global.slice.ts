import { StateCreator } from "zustand";
import { GlobalSlice, UserStore } from "../types";

export const createGlobalSlice: StateCreator<
  UserStore,
  [],
  [],
  GlobalSlice
> = (set) => ({
  isConnectPS: false,
  isEnableChangePath: false,
  isEnableLua: false,
  setIsConnectPS: (val) => set({ isConnectPS: val }),
  setIsEnableChangePath: (val) => set({ isEnableChangePath: val }),
  setIsEnableLua: (val) => set({ isEnableLua: val }),
});
