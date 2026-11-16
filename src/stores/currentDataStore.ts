import useDetailDataStore from '@/stores/detailDataStore'
import { AvatarDetail, BaseTypeData, MetadataCore } from '@/types'
import { create } from 'zustand'

interface CurrentDataState {
    avatarSelected: AvatarDetail | null;
    skillIDSelected: string | null;
    avatarSearch: string;
    lightconeSearch: string;
    mapAvatarElementActive: Record<string, boolean>;
    mapAvatarPathActive: Record<string, boolean>;
    mapLightconePathActive: Record<string, boolean>;
    mapLightconeRankActive: Record<string, boolean>;
    setSettingData: (newMetaData: MetadataCore) => void;
    setAvatarSelected: (avatar: AvatarDetail | null) => void;
    setSkillIDSelected: (skillID: string | null) => void;
    setAvatarSearch: (avatarSearch: string) => void;
    setLightconeSearch: (lightconeSearch: string) => void;
    setMapAvatarElementActive: (mapAvatarElementActive: Record<string, boolean>) => void;
    setMapAvatarPathActive: (mapAvatarPathActive: Record<string, boolean>) => void;
    setMapLightconePathActive: (mapLightconePathActive: Record<string, boolean>) => void;
    setMapLightconeRankActive: (mapLightconeRankActive: Record<string, boolean>) => void;
    setResetDataLightcone: (avatarSelected: AvatarDetail | null, baseType: Record<string, BaseTypeData>) => void;
}

const useCurrentDataStore = create<CurrentDataState>((set) => ({
    avatarSelected: null,
    skillIDSelected: null,
    mapAvatarElementActive: {},
    mapAvatarPathActive: {},
    mapLightconePathActive: {},
    mapLightconeRankActive: {"3": false, "4": false, "5": false },
    avatarSearch: "",
    lightconeSearch: "",
    setSettingData: (newMetaData: MetadataCore) => set({ 
        mapAvatarElementActive: Object.fromEntries(Object.keys(newMetaData.DamageType).map(key => [key, false])) as Record<string, boolean>,
        mapAvatarPathActive: Object.fromEntries(Object.keys(newMetaData.BaseType).map(key => [key, false])) as Record<string, boolean>,
        mapLightconePathActive: Object.fromEntries(Object.keys(newMetaData.BaseType).map(key => [key, false])) as Record<string, boolean>,
    }),
    setAvatarSearch: (avatarSearch: string) => set({ avatarSearch }),
    setLightconeSearch: (lightconeSearch: string) => set({ lightconeSearch }),
    // Resolve to the list entry so a copy taken before the detail loaded is never selected.
    setAvatarSelected: (avatar: AvatarDetail | null) => set({
        avatarSelected: avatar ? useDetailDataStore.getState().mapAvatar[String(avatar.ID)] ?? avatar : null,
    }),
    setSkillIDSelected: (skillID: string | null) => set({ skillIDSelected: skillID }),
    setMapAvatarElementActive: (mapAvatarElementActive: Record<string, boolean>) => set({ mapAvatarElementActive }),
    setMapAvatarPathActive: (mapAvatarPathActive: Record<string, boolean>) => set({ mapAvatarPathActive }),
    setMapLightconePathActive: (mapLightconePathActive: Record<string, boolean>) => set({ mapLightconePathActive }),
    setMapLightconeRankActive: (mapLightconeRankActive: Record<string, boolean>) => set({ mapLightconeRankActive }),
    setResetDataLightcone: (avatarSelected: AvatarDetail | null, baseType: Record<string, BaseTypeData>) => {
        const newListPath: Record<string, boolean> = Object.fromEntries(Object.keys(baseType).map(key => [key, false]))
        const newListRank: Record<string, boolean> = {"3": false, "4": false, "5": false }
        if (avatarSelected) {
            newListPath[avatarSelected.BaseType] = true
        }
        set({
            mapLightconeRankActive: newListRank,
            mapLightconePathActive: newListPath,
        })
    }
}))

export default useCurrentDataStore;