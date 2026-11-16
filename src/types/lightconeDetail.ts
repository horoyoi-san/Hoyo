export interface LightConeDetail {
    ID: number;
    Release: boolean;
    Name: Record<string, string>;
    Desc: Record<string, string>;
    Rarity: string;
    BaseType: string;
    MaxPromotionLevel: number;
    MaxRank: number;
    Skills: LightconeSkill;
    Image: LightconeImage;
    Stats: Record<string, LightconeStatLevel>;
}

export interface LightconeSkill {
    ID: number;
    Name: Record<string, string>;
    Desc: Record<string, string>;
    AbilityName: string;
    Level: Record<string, LightconeSkillLevel>;
}

export interface LightconeSkillLevel {
    Level: number;
    Param: number[];
    Bonus: LightconeSkillBonus[];
}

export interface LightconeSkillBonus {
    PropertyType: string;
    Value: number;
}

export interface LightconeImage {
    ThumbnailPath: string;
    ImagePath: string;
    IconPath: string;
    FigureIconPath: string;
}

export interface LightconeStatLevel {
    Promotion: number;
    PlayerLevelRequire: number;
    WorldLevelRequire: number;
    MaxLevel: number;
    BaseHP: number;
    BaseHPAdd: number;
    BaseAttack: number;
    BaseAttackAdd: number;
    BaseDefence: number;
    BaseDefenceAdd: number;
}