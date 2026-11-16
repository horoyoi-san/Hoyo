
export interface CollapseRelicSubAffix {
    AffixID: number;
    Cnt: number;
    Step: number;
}

export interface CollapseRelicData {
    ItemID: number;
    Level: number;
    MainAffixID: number;
    SubAffixes: CollapseRelicSubAffix[];
}

export interface CollapseAvatarData {
    AvatarID: number;
    Rank: number;
    EnhancedID: number;
    EquipmentID: number;
    EquipmentRank: number;
    Relics: CollapseRelicData[];
    ExRankIDs: number[];
}

export interface CollapseConnectionRequest {
    Username: string;
    Password: string;
    Avatars: CollapseAvatarData[];
}

export interface CollapseConnectionResponse {
    retcode: number;
    message: string;
    data?: {
        avatars: number;
        created: number;
        updated: number;
        deleted: number;
        errors: string[];
    } | null;
}
