
export interface RelicSetDetail {
    ID: number;
    Name: Record<string, string>;
    Image: RelicSetImage;
    Release: boolean;
    ReleaseVersion: string;
    IsPlanarSuit: boolean;
    DisplayItemID: number;
    DisplayItemIDRarity4: number;
    SkillList: number[];
    Skills: Record<string, RelicSkill>;
    Parts: Record<string, RelicPart>;
}

export interface RelicSetImage {
    SetIconPath: string;
    SetIconFigurePath: string;
}

export interface RelicSkill {
    RequireNum: number;
    Desc: Record<string, string>;
    AbilityName: string;
    Param: number[];
    Bonus: RelicSkillBonus[];
}

export interface RelicSkillBonus {
    PropertyType: string;
    Value: number;
}

export interface RelicPart {
    Type: string;
    Image: RelicPartImage;
    Name: Record<string, string>;
    Desc: Record<string, string>;
    Data: Record<string, RelicPartData> | null;
}

export interface RelicPartImage {
    IconPath: string;
    ItemFigureIconPath: string;
}

export interface RelicPartData {
    ID: number;
    SetID: number;
    Type: string;
    Rarity: string;
    MainAffixGroup: number;
    SubAffixGroup: number;
    MaxLevel: number;
    ExpType: number;
    ExpProvide: number;
    CoinCost: number;
    Mode: string;
}