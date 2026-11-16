import { ASGroupDetail, AvatarDetail, BaseTypeData, DamageTypeData, EliteData, HardLevelData, LightConeDetail, MainAffixData, MetadataCore, MOCGroupDetail, MonsterDetail, PeakGroupDetail, PFGroupDetail, RelicSetDetail, SkillMaxLevelData, StageData, SubAffixData } from '@/types'
import { create } from 'zustand'

interface DetailDataState {
  mapMonster: Record<string, MonsterDetail>
  mapRelicSet: Record<string, RelicSetDetail>
  mapAvatar: Record<string, AvatarDetail>
  mapLightCone: Record<string, LightConeDetail>
  mapAS: Record<string, ASGroupDetail>
  mapMoc: Record<string, MOCGroupDetail>
  mapPF: Record<string, PFGroupDetail>
  mapPeak: Record<string, PeakGroupDetail>
  baseType: Record<string, BaseTypeData>;
  damageType: Record<string, DamageTypeData>;
  mainAffix: Record<string, Record<string, MainAffixData>>;
  subAffix: Record<string, Record<string, SubAffixData>>;
  skillConfig: Record<string, SkillMaxLevelData>;
  stage: Record<string, StageData>;
  hardLevelConfig: Record<string, Record<string, HardLevelData>>;
  eliteConfig: Record<string, EliteData>;
  setMetaData: (newMetaData: MetadataCore) => void;
  setStage: (newStage: Record<string, StageData>) => void;
  setMapMonster: (newMonster: Record<string, MonsterDetail>) => void
  setMapRelicSet: (newRelicSet: Record<string, RelicSetDetail>) => void
  setMapAvatar: (newAvatar: Record<string, AvatarDetail>) => void
  avatarDetailLoaded: Record<string, true>
  mergeAvatarDetail: (id: string, heavy: Partial<AvatarDetail>) => AvatarDetail | undefined
  setMapLightCone: (newLightCone: Record<string, LightConeDetail>) => void
  setMapAS: (newAS: Record<string, ASGroupDetail>) => void
  setMapMoc: (newMoc: Record<string, MOCGroupDetail>) => void
  setMapPF: (newPF: Record<string, PFGroupDetail>) => void
  setMapPeak: (newPeak: Record<string, PeakGroupDetail>) => void
}

const useDetailDataStore = create<DetailDataState>((set, get) => ({
  mapMonster: {},
  mapRelicSet: {},
  mapAvatar: {},
  avatarDetailLoaded: {},
  mapLightCone: {},
  mapAS: {},
  mapMoc: {},
  mapPF: {},
  mapPeak: {},
  baseType: {},
  damageType: {},
  mainAffix: {},
  subAffix: {},
  skillConfig: {},
  stage: {},
  hardLevelConfig: {},
  eliteConfig: {},
  setMapMonster: (newMonster) => set({ mapMonster: newMonster }),
  setMapRelicSet: (newRelicSet) => set({ mapRelicSet: newRelicSet }),
  // A refetched list is light again: keep the detail of avatars already merged.
  setMapAvatar: (newAvatar) => set((state) => {
    const loadedIds = Object.keys(state.avatarDetailLoaded).filter((id) => newAvatar[id] && state.mapAvatar[id])
    if (loadedIds.length === 0) return { mapAvatar: newAvatar }
    const next = { ...newAvatar }
    for (const id of loadedIds) {
      const current = state.mapAvatar[id]
      next[id] = {
        ...next[id],
        Skills: current.Skills,
        Ranks: current.Ranks,
        ExRanks: current.ExRanks,
        Memosprite: current.Memosprite,
        Enhanced: current.Enhanced,
        SkillTrees: current.SkillTrees,
      }
    }
    return { mapAvatar: next }
  }),
  mergeAvatarDetail: (id, heavy) => {
    const base = get().mapAvatar[id]
    if (!base) return undefined
    if (get().avatarDetailLoaded[id]) return base
    const merged = { ...base, ...heavy }
    set((state) => ({
      mapAvatar: { ...state.mapAvatar, [id]: merged },
      avatarDetailLoaded: { ...state.avatarDetailLoaded, [id]: true },
    }))
    return merged
  },
  setMapLightCone: (newLightCone) => set({ mapLightCone: newLightCone }),
  setMapAS: (newAS) => set({ mapAS: newAS }),
  setMapMoc: (newMoc) => set({ mapMoc: newMoc }),
  setMapPF: (newPF) => set({ mapPF: newPF }),
  setMapPeak: (newPeak) => set({ mapPeak: newPeak }),
  setStage: (newStage) => set({ stage: newStage }),
  setMetaData: (newMetaData: MetadataCore) => set({ 
    baseType: newMetaData.BaseType,
    damageType: newMetaData.DamageType,
    mainAffix: newMetaData.MainAffix,
    subAffix: newMetaData.SubAffix,
    skillConfig: newMetaData.SkillConfig,
    hardLevelConfig: newMetaData.HardLevelConfig,
    eliteConfig: newMetaData.EliteConfig,
  }),
}))

export default useDetailDataStore
