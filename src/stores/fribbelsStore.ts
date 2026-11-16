import { CharacterInfoCardType } from '@/types';
import { ParsedFribbelsData } from '@/helper/converterFribbels';
import { create } from 'zustand';

interface FribbelsState {
    selectedCharacters: CharacterInfoCardType[];
    selectedProfiles: Record<number, string[]>;
    previewProfiles: Record<number, string>;
    fribbelsData: ParsedFribbelsData | null;
    fileName: string | null;
    setSelectedCharacters: (newListAvatar: CharacterInfoCardType[]) => void;
    setSelectedProfiles: (profiles: Record<number, string[]> | ((prev: Record<number, string[]>) => Record<number, string[]>)) => void;
    setPreviewProfiles: (previews: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
    setFribbelsData: (data: ParsedFribbelsData | null) => void;
    setFileName: (name: string | null) => void;
    reset: () => void;
}

const useFribbelsStore = create<FribbelsState>((set) => ({
    selectedCharacters: [],
    selectedProfiles: {},
    previewProfiles: {},
    fribbelsData: null,
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
    setFribbelsData: (data: ParsedFribbelsData | null) => set({ fribbelsData: data }),
    setFileName: (name: string | null) => set({ fileName: name }),
    reset: () =>
        set({
            selectedCharacters: [],
            selectedProfiles: {},
            previewProfiles: {},
            fribbelsData: null,
            fileName: null,
        }),
}));

export default useFribbelsStore;

