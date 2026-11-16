import { CharacterInfoCardType } from '@/types';
import { ParsedImportData } from '@/helper/converterHoyolab';
import { create } from 'zustand';

interface HoyolabState {
    selectedCharacters: CharacterInfoCardType[];
    hoyolabData: ParsedImportData | null;
    jsonInput: string;
    fileName: string | null;
    setSelectedCharacters: (newListAvatar: CharacterInfoCardType[]) => void;
    setHoyolabData: (data: ParsedImportData | null) => void;
    setJsonInput: (input: string) => void;
    setFileName: (name: string | null) => void;
}

const useHoyolabStore = create<HoyolabState>((set) => ({
    selectedCharacters: [],
    hoyolabData: null,
    jsonInput: "",
    fileName: null,
    setSelectedCharacters: (newListAvatar: CharacterInfoCardType[]) => set({ selectedCharacters: newListAvatar }),
    setHoyolabData: (data: ParsedImportData | null) => set({ hoyolabData: data }),
    setJsonInput: (input: string) => set({ jsonInput: input }),
    setFileName: (name: string | null) => set({ fileName: name }),
}));

export default useHoyolabStore;
