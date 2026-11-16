
export interface MonsterDetail {
    ID: number;
    Name: Record<string, string>;
    EliteGroup: number;
    HardLevelGroup: number;
    StanceWeakList: string[];
    Modify: MonsterModify;
    Rank: string;
    StanceCount: number;
    StanceType: string;
    Image: MonsterImage;
    Base: MonsterBase;
    PhaseHPRatios?: number[];
}


export interface MonsterModify {
    AttackModifyRatio: number;
    DefenceModifyRatio: number;
    HPModifyRatio: number;
    SpeedModifyRatio: number;
    StanceModifyRatio: number;
    SpeedModifyValue: number;
    StanceModifyValue: number;
}

export interface MonsterImage {
    IconPath: string;
    RoundIconPath: string;
    ImagePath: string;
    ManikinImagePath: string;
}

export interface MonsterBase {
    AttackBase: number;
    DefenceBase: number;
    HPBase: number;
    SpeedBase: number;
    StanceBase: number;
    CriticalDamageBase: number;
    StatusResistanceBase: number;
    SpeedModifyValue: number;
    StanceModifyValue: number;
    InitialDelayRatio: number;
}