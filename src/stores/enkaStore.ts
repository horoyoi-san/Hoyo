import { CharacterInfoCardType, EnkaResponse } from '@/types';
import { create } from 'zustand'

interface EnkaState {
    selectedCharacters: CharacterInfoCardType[];
    enkaData: EnkaResponse | null;
    uidInput: string;
    setSelectedCharacters: (newListAvatar: CharacterInfoCardType[]) => void;
    setEnkaData: (newEnkaData: EnkaResponse | null) => void;
    setUidInput: (newUidInput: string) => void;
}

const useEnkaStore = create<EnkaState>((set) => ({
    selectedCharacters: [],
    enkaData: null,
    uidInput: "",
    setUidInput: (newUidInput: string) => set({ uidInput: newUidInput }),
    setSelectedCharacters: (newListAvatar: CharacterInfoCardType[]) => set({ selectedCharacters: newListAvatar }),
    setEnkaData: (newEnkaData: EnkaResponse | null) => set({ enkaData: newEnkaData }),
}));

export default useEnkaStore;
