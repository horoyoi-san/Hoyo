import { CharacterInfoCardType, FreeSRJson } from '@/types';
import { create } from 'zustand';

interface FreeSRState {
    selectedCharacters: CharacterInfoCardType[];
    selectedProfiles: Record<number, string[]>;
    previewProfiles: Record<number, string>;
    freeSRData: FreeSRJson | null;
    fileName: string | null;

    setSelectedCharacters: (newListAvatar: CharacterInfoCardType[]) => void;
    setSelectedProfiles: (profiles: Record<number, string[]> | ((prev: Record<number, string[]>) => Record<number, string[]>)) => void;
    setPreviewProfiles: (previews: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
    setFreeSRData: (newFreeSRData: FreeSRJson | null) => void;
    setFileName: (name: string | null) => void;
    reset: () => void;
}

const useFreeSRStore = create<FreeSRState>((set) => ({
    selectedCharacters: [],
    selectedProfiles: {},
    previewProfiles: {},
    freeSRData: null,
    fileName: null,
    setSelectedCharacters: (newListAvatar: CharacterInfoCardType[]) => set({ selectedCharacters: newListAvatar }),
    setSelectedProfiles: (profiles) =>
        set((state) => ({
            selectedProfiles: typeof profiles === 'function' ? profiles(state.selectedProfiles) : profiles,
        })),
    setPreviewProfiles: (previews) =>
        set((state) => ({
            previewProfiles: typeof previews === 'function' ? previews(state.previewProfiles) : previews,
        })),
    setFreeSRData: (newFreeSRData: FreeSRJson | null) => set({ freeSRData: newFreeSRData }),
    setFileName: (name: string | null) => set({ fileName: name }),
    reset: () =>
        set({
            selectedCharacters: [],
            selectedProfiles: {},
            previewProfiles: {},
            freeSRData: null,
            fileName: null,
        }),
}));

export default useFreeSRStore;