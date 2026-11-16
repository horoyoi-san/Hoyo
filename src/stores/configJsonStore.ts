import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const MAX_TEAM_SIZE = 4

interface ConfigJsonState {
    avatar_ids: number[]
    attacker_id: number | null
    use_step_on_relic: boolean
    toggleAvatar: (avatarId: number) => void
    setAttacker: (avatarId: number | null) => void
    setUseStepOnRelic: (value: boolean) => void
    clearTeam: () => void
}

const useConfigJsonStore = create<ConfigJsonState>()(
    persist(
        (set) => ({
            avatar_ids: [],
            attacker_id: null,
            use_step_on_relic: true,
            toggleAvatar: (avatarId) => set((state) => {
                if (state.avatar_ids.includes(avatarId)) {
                    return {
                        avatar_ids: state.avatar_ids.filter((id) => id !== avatarId),
                        attacker_id: state.attacker_id === avatarId ? null : state.attacker_id,
                    }
                }
                if (state.avatar_ids.length >= MAX_TEAM_SIZE) return state
                return { avatar_ids: [...state.avatar_ids, avatarId] }
            }),
            setAttacker: (avatarId) => set({ attacker_id: avatarId }),
            setUseStepOnRelic: (value) => set({ use_step_on_relic: value }),
            clearTeam: () => set({ avatar_ids: [], attacker_id: null }),
        }),
        {
            name: 'config-json-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                avatar_ids: state.avatar_ids,
                attacker_id: state.attacker_id,
                use_step_on_relic: state.use_step_on_relic,
            }),
        }
    )
)

export default useConfigJsonStore
