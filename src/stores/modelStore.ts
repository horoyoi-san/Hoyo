import { create } from 'zustand'


interface ModelState {
    isOpenLightcone: boolean;
    isOpenRelic: boolean;
    isOpenCreateProfile: boolean;
    isOpenImport: boolean;
    isOpenCopy: boolean;
    isOpenMonster: boolean;
    isOpenConnect: boolean;
    isOpenAvatars: boolean;
    isOpenQuickView: boolean;
    isOpenExtra: boolean;
    isChangelog: boolean;
    isOpenManageProfiles: boolean;
    isOpenConfigJson: boolean;
    setIsOpenConfigJson: (open: boolean) => void;
    setIsOpenManageProfiles: (open: boolean) => void;
    setIsOpenExtra: (newIsOpenExtra: boolean) => void;
    setIsOpenQuickView: (newIsOpenQuickView: boolean) => void;
    setIsOpenAvatars: (newIsOpenAvatars: boolean) => void;
    setIsOpenConnect: (newIsOpenConnect: boolean) => void;
    setIsOpenMonster: (newIsOpenMonster: boolean) => void;
    setIsOpenLightcone: (newIsOpenLightcone: boolean) => void;
    setIsOpenRelic: (newIsOpenRelic: boolean) => void;
    setIsOpenCreateProfile: (newIsOpenCreateProfile: boolean) => void;
    setIsOpenImport: (newIsOpenImport: boolean) => void;
    setIsOpenCopy: (newIsOpenCopy: boolean) => void;
    setIsChangelog: (newChangelog: boolean) => void;
}

const useModelStore = create<ModelState>((set) => ({
    isOpenLightcone: false,
    isOpenRelic: false,
    isOpenCreateProfile: false,
    isOpenImport: false,
    isOpenCopy: false,
    isOpenMonster: false,
    isOpenConnect: false,
    isOpenAvatars: false,
    isOpenQuickView: false,
    isOpenExtra: false,
    isChangelog: false,
    isOpenManageProfiles: false,
    isOpenConfigJson: false,
    setIsOpenConfigJson: (open: boolean) => set({ isOpenConfigJson: open }),
    setIsOpenManageProfiles: (newIsOpenManageProfiles: boolean) => set({ isOpenManageProfiles: newIsOpenManageProfiles }),
    setIsOpenExtra: (newIsOpenExtra: boolean) => set({ isOpenExtra: newIsOpenExtra }),
    setIsOpenQuickView: (newIsOpenQuickView: boolean) => set({ isOpenQuickView: newIsOpenQuickView }),
    setIsOpenAvatars: (newIsOpenAvatars: boolean) => set({ isOpenAvatars: newIsOpenAvatars }),
    setIsOpenConnect: (newIsOpenConnect: boolean) => set({ isOpenConnect: newIsOpenConnect }),
    setIsOpenMonster: (newIsOpenMonster: boolean) => set({ isOpenMonster: newIsOpenMonster }),
    setIsOpenLightcone: (newIsOpenLightcone: boolean) => set({ isOpenLightcone: newIsOpenLightcone }),
    setIsOpenRelic: (newIsOpenRelic: boolean) => set({ isOpenRelic: newIsOpenRelic }),
    setIsOpenCreateProfile: (newIsOpenCreateProfile: boolean) => set({ isOpenCreateProfile: newIsOpenCreateProfile }),
    setIsOpenImport: (newIsOpenImport: boolean) => set({ isOpenImport: newIsOpenImport }),
    setIsOpenCopy: (newIsOpenCopy: boolean) => set({ isOpenCopy: newIsOpenCopy }),
    setIsChangelog: (newChangelog: boolean) => set({ isChangelog: newChangelog }),
}));

export default useModelStore;