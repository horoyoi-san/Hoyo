/**
 * Shape of the `config.json` that SRTools (srtools.neonteam.dev) loads from its
 * export menu. Field names are theirs, not ours: renaming anything here makes
 * the file unusable over there.
 */

export interface ConfigJsonLightcone {
    id: number;
    rank: number;
    level: number;
    promotion: number;
}

export interface ConfigJsonAvatar {
    name: string;
    id: number;
    hp: number;
    sp: number;
    level: number;
    promotion: number;
    rank: number;
    lightcone: ConfigJsonLightcone;
    relics: string[];
    use_technique: boolean;
    buff_id_list: number[];
}

export interface ConfigJsonBattle {
    battle_id: number;
    stage_id: number;
    cycle_count: number;
    monster_wave: number[][];
    monster_level: number;
    blessings: number[];
}

export interface ConfigJson {
    avatar_config: ConfigJsonAvatar[];
    battle_config: ConfigJsonBattle;
}

export interface ConfigJsonWarning {
    key:
        | "configJsonWarnNoBuild"
        | "configJsonWarnNoLightcone"
        | "configJsonWarnRelicCount"
        | "configJsonWarnNoMonster"
        | "configJsonWarnNoStage"
        | "configJsonWarnUnknownElement";
    values?: Record<string, string | number>;
}
