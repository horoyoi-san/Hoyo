import { AvatarDetail, AvatarProfileCardType, BaseTypeData, DamageTypeData } from '@/types';
import { create } from 'zustand'

interface CopyProfileState {
    selectedProfiles: AvatarProfileCardType[];
    avatarCopySelected: AvatarDetail | null;
    listElement: Record<string, boolean>;
    listPath: Record<string, boolean>;
    listRank: Record<string, boolean>;
    setListElement: (newListElement: Record<string, boolean>) => void;
    setListPath: (newListPath: Record<string, boolean>) => void;
    setListRank: (newListRank: Record<string, boolean>) => void;
    setSelectedProfiles: (newListAvatar: AvatarProfileCardType[]) => void;
    setAvatarCopySelected: (newAvatarSelected: AvatarDetail | null) => void;
    setResetData: (baseType: Record<string, BaseTypeData>, damageType: Record<string, DamageTypeData>) => void;
}

const useCopyProfileStore = create<CopyProfileState>((set) => ({
    selectedProfiles: [],
    avatarCopySelected: null,
    listElement: {},
    listPath: {},
    listRank: { "4": false, "5": false },
    
    setListElement: (newListElement: Record<string, boolean>) => set({ listElement: newListElement }),
    setListPath: (newListPath: Record<string, boolean>) => set({ listPath: newListPath }),
    setListRank: (newListRank: Record<string, boolean>) => set({ listRank: newListRank }),
    setAvatarCopySelected: (newAvatarSelected: AvatarDetail | null) => set({ avatarCopySelected: newAvatarSelected }),
    setSelectedProfiles: (newListAvatar: AvatarProfileCardType[]) => set({ selectedProfiles: newListAvatar }),
    setResetData: (baseType: Record<string, BaseTypeData>, damageType: Record<string, DamageTypeData>) => {
        set({ 
            listElement: Object.fromEntries(Object.keys(damageType).map(key => [key, false])) as Record<string, boolean>,
            listPath: Object.fromEntries(Object.keys(baseType).map(key => [key, false])) as Record<string, boolean>,
            listRank: { "4": false, "5": false }
        })
    }
}));

export default useCopyProfileStore;