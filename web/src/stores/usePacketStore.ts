import { create } from 'zustand';
import { DecodedPacket } from '../lib/types';

interface PacketStore {
  packets: DecodedPacket[];
  isSniffing: boolean;
  selectedPacket: DecodedPacket | null;
  filterText: string;
  sourceFilter: 'all' | 'client' | 'server';
  maxPackets: number;
  addPacket: (packet: DecodedPacket) => void;
  /** Bulk insert — call once per flush window instead of per packet. */
  addPackets: (batch: DecodedPacket[]) => void;
  clearPackets: () => void;
  setIsSniffing: (sniffing: boolean) => void;
  setSelectedPacket: (packet: DecodedPacket | null) => void;
  setFilterText: (filterText: string) => void;
  setSourceFilter: (sourceFilter: 'all' | 'client' | 'server') => void;
}

export const usePacketStore = create<PacketStore>((set) => ({
  packets: [],
  isSniffing: false,
  selectedPacket: null,
  filterText: '',
  sourceFilter: 'all',
  maxPackets: 2000,

  addPacket: (packet) =>
    set((state) => {
      const updated = [packet, ...state.packets];
      if (updated.length > state.maxPackets) {
        updated.length = state.maxPackets;
      }
      return { packets: updated };
    }),

  addPackets: (batch) =>
    set((state) => {
      if (batch.length === 0) return state;
      // Batch arrives oldest -> newest; newest-first store means reversing
      // once per flush instead of copying the array per packet.
      const incoming = [...batch].reverse();
      const updated = [...incoming, ...state.packets];
      if (updated.length > state.maxPackets) {
        updated.length = state.maxPackets;
      }
      return { packets: updated };
    }),

  clearPackets: () => set({ packets: [], selectedPacket: null }),
  setIsSniffing: (isSniffing) => set({ isSniffing }),
  setSelectedPacket: (selectedPacket) => set({ selectedPacket }),
  setFilterText: (filterText) => set({ filterText }),
  setSourceFilter: (sourceFilter) => set({ sourceFilter }),
}));
