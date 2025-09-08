import { MocDetail, EventBasic, PFDetail, ASDetail, PeakDetail } from '@/types';
import { create } from 'zustand'


interface EventState {
    MOCEvent: EventBasic[];
    mapMOCInfo: Record<string, MocDetail[]>;
    PFEvent: EventBasic[];
    mapPFInfo: Record<string, PFDetail>;
    ASEvent: EventBasic[];
    mapASInfo: Record<string, ASDetail>;
    PEAKEvent: EventBasic[];
    mapPEAKInfo: Record<string, PeakDetail>;
    setMOCEvent: (newListEvent: EventBasic[]) => void;
    setMapMOCInfo: (newMapMOCInfo: Record<string, MocDetail[]>) => void;
    setPFEvent: (newListEvent: EventBasic[]) => void;
    setMapPFInfo: (newMapPFInfo: Record<string, PFDetail>) => void;
    setASEvent: (newListEvent: EventBasic[]) => void;
    setMapASInfo: (newMapASInfo: Record<string, ASDetail>) => void;
    setPEAKEvent: (newListEvent: EventBasic[]) => void;
    setMapPEAKInfo: (newMapPEAKInfo: Record<string, PeakDetail>) => void;
}

const useEventStore = create<EventState>((set) => ({
    MOCEvent: [],
    mapMOCInfo: {},
    PFEvent: [],
    mapPFInfo: {},
    ASEvent: [],
    mapASInfo: {},
    PEAKEvent: [],
    mapPEAKInfo: {},
    setMOCEvent: (newListEvent: EventBasic[]) => set({ MOCEvent: newListEvent }),
    setMapMOCInfo: (newMapMOCInfo: Record<string, MocDetail[]>) => set({ mapMOCInfo: newMapMOCInfo }),
    setPFEvent: (newListEvent: EventBasic[]) => set({ PFEvent: newListEvent }),
    setMapPFInfo: (newMapPFInfo: Record<string, PFDetail>) => set({ mapPFInfo: newMapPFInfo }),
    setASEvent: (newListEvent: EventBasic[]) => set({ ASEvent: newListEvent }),
    setMapASInfo: (newMapASInfo: Record<string, ASDetail>) => set({ mapASInfo: newMapASInfo }),
    setPEAKEvent: (newListEvent: EventBasic[]) => set({ PEAKEvent: newListEvent }),
    setMapPEAKInfo: (newMapPEAKInfo: Record<string, PeakDetail>) => set({ mapPEAKInfo: newMapPEAKInfo }),
}));

export default useEventStore;