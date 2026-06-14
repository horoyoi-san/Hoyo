import { StateCreator } from "zustand";
import { ConnectSlice, UserStore } from "../types";

export const createConnectSlice: StateCreator<
  UserStore,
  [],
  [],
  ConnectSlice
> = (set) => ({
  connectionType: "FireflyGo",
  privateType: "Local",
  serverUrl: "http://localhost:21000",
  username: "",
  password: "",
  setConnectionType: (type) => set({ connectionType: type }),
  setPrivateType: (type) => set({ privateType: type }),
  setServerUrl: (url) => set({ serverUrl: url }),
  setUsername: (username) => set({ username }),
  setPassword: (password) => set({ password }),
});
