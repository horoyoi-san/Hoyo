import { create } from 'zustand'
import { ExtraData } from '@/types'

interface GlobalState {
    isConnectPS: boolean;
    extraData?: ExtraData;
    isEnableChangePath: boolean
    isEnableLua: boolean
    setIsEnableChangePath: (newIsEnableChangePath: boolean) => void;
    setIsEnableLua: (newIsEnableLua: boolean) => void;
    setExtraData: (newExtraData: ExtraData | undefined) => void;
    setIsConnectPS: (newIsConnectPS: boolean) => void;
}

const useGlobalStore = create<GlobalState>((set) => ({
    isConnectPS: false,
    extraData: undefined,
    isEnableChangePath: false,
    isEnableLua: false,
    setIsEnableChangePath: (newIsEnableChangePath: boolean) => set({ isEnableChangePath: newIsEnableChangePath }),
    setIsEnableLua: (newIsEnableLua: boolean) => set({ isEnableLua: newIsEnableLua }),
    setExtraData: (newExtraData: ExtraData | undefined) => set({ extraData: newExtraData }),
    setIsConnectPS: (newIsConnectPS: boolean) => set({ isConnectPS: newIsConnectPS }),
}));

export default useGlobalStore;