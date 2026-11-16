export interface ExtraData {
    theory_craft?: {
        hp: Record<string, number[]>
        cycle_count: number
        mode: boolean
        stage_id: number
        custom_lineup?: string[]
    }
    setting?: {
        censorship: boolean
        cm: boolean
        first_person: boolean
        hide_ui: boolean
        invasion_percent?: number
    }
    challenge?: {
        skip_node: number
        challenge_peak_group_id: number
        challenge_peak_group_id_list: number[]
    }
    multi_path?: {
        main: number
        march_7: number
        multi_path_main: number[]
        multi_path_march_7: number[]
    },
    lua?: string | null
}
