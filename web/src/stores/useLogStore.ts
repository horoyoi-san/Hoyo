import { create } from 'zustand';
import { LogEntry, LogLevel } from '../lib/types';

const MAX_LOGS = 1500;

interface LogStore {
  logs: LogEntry[];
  selectedLevel: LogLevel | 'all';
  searchFilter: string;
  paused: boolean;
  addLog: (log: LogEntry) => void;
  /** Bulk insert — call once per flush window instead of per log line. */
  addLogs: (batch: LogEntry[]) => void;
  clearLogs: () => void;
  setSelectedLevel: (level: LogLevel | 'all') => void;
  setSearchFilter: (search: string) => void;
  setPaused: (paused: boolean) => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  selectedLevel: 'all',
  searchFilter: '',
  paused: false,

  addLog: (log) =>
    set((state) => {
      if (state.paused) return state;
      return { logs: [...state.logs.slice(-MAX_LOGS + 1), log] };
    }),

  addLogs: (batch) =>
    set((state) => {
      if (state.paused || batch.length === 0) return state;
      const merged = state.logs.concat(batch);
      if (merged.length > MAX_LOGS) {
        return { logs: merged.slice(merged.length - MAX_LOGS) };
      }
      return { logs: merged };
    }),

  clearLogs: () => set({ logs: [] }),
  setSelectedLevel: (selectedLevel) => set({ selectedLevel }),
  setSearchFilter: (searchFilter) => set({ searchFilter }),
  setPaused: (paused) => set({ paused }),
}));
