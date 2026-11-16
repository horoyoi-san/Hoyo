
export interface AvatarDetail {
    ID: number;
    BaseType: string;
    DamageType: string;
    Name: Record<string, string>;
    Image: AvatarImage;
    Release: boolean;
    MaxPromotion: number;
    MaxRank: number;
    SPNeed: number | null;
    Rarity: string;
    BGDesc: Record<string, string>;
    Lightcones: number[];
    Stats: Record<string, StatLevel>;
    Skins: Record<string, AvatarSkin>;
    Ranks: Record<string, RankDetail>;
    ExRanks?: Record<string, ExRankDetail>;
    Skills: Record<string, SkillDetail>;
    Memosprite: Memosprite | null;
    SkillTrees: Record<string, Record<string, SkillTreePoint>>;
    Relics: Relics;
    Teams: AvatarTeams;
    Enhanced: Record<string, EnhancedData> | null;
    Unique: Record<string, GlobalBuff> | null;
    MazeBuff: number[];
}

export interface AvatarImage {
    DefaultAvatarHeadIconPath: string;
    AvatarSideIconPath: string;
    AvatarMiniIconPath: string;
    AvatarGachaResultImgPath: string;
    ActionAvatarHeadIconPath: string;
    SideAvatarHeadIconPath: string;
    WaitingAvatarHeadIconPath: string;
    AvatarCutinImgPath: string;
    AvatarCutinBgImgPath: string;
    AvatarCutinFrontImgPath: string;
    AvatarIconPath: string;
}


export interface StatLevel {
    Promotion: number;
    MaxLevel: number;
    WorldLevelRequirement: number;
    PlayerLevelRequirement: number;
    AttackBase: number;
    AttackAdd: number;
    DefenceBase: number;
    DefenceAdd: number;
    HPBase: number;
    HPAdd: number;
    SpeedBase: number;
    CriticalChance: number;
    CriticalDamage: number;
    BaseAggro: number;
}

export interface AvatarSkin {
    ID: number;
    Type: string;
    PlayerCardID: number;
    Name: Record<string, string>;
    PlayerCardTitleText: Record<string, string>;
    AvatarNameOnDropSkin: Record<string, string>;
    AvatarSkinSynopsis: Record<string, string>;
    Image: AvatarSkinImage;
}

export interface AvatarSkinImage {
    AvatarCutinFrontImgPath: string;
    DefaultAvatarHeadIconPath: string;
    AdventureDefaultAvatarHeadIconPath: string;
    WaitingAvatarHeadIconPath: string;
    ActionAvatarHeadIconPath: string;
    SideAvatarHeadIconPath: string;
    AvatarSideIconPath: string;
    AvatarCutinImgPath: string;
    AvatarCutinBgImgPath: string;
    AvatarMiniIconPath: string;
    DressIconPath: string;
}

export interface RankDetail {
    Rank: number;
    Name: Record<string, string>;
    Desc: Record<string, string>;
    RankAbility: string[];
    SkillAddLevelList: Record<string, number>;
    Icon: string;
    Image: string;
    Param: number[];
    Extra: Record<string, ExtraEffect>;
}

export interface ExRankDetail {
    Rank: number;
    Name: Record<string, string>;
    Desc: Record<string, string>;
    Tag?: Record<string, string>;
    RankAbility: string[];
    Icon: string;
    Image: string;
    Param: number[];
    Cost?: { ItemID: number; ItemNum: number };
}

export interface ExtraEffect {
    ID: number;
    Desc: Record<string, string>;
    Name: Record<string, string>;
    Icon: string;
    Param: number[];
    EffectType: number;
}

export interface SkillDetail {
    ID: number;
    Name: Record<string, string>;
    Tag: Record<string, string>;
    TypeDesc: Record<string, string>;
    MaxLevel: number;
    Level: Record<string, SkillLevel>;
    Icon: string;
    Desc: Record<string, string>;
    SimpleDesc: Record<string, string>;
    RatedSkillTreeID: number[];
    RatedRankID: number[];
    Extra: Record<string, ExtraEffect>;
    SimpleExtra: Record<string, ExtraEffect>;
    SPBase: number | null;
    StanceDamageDisplay: number;
    SPMultipleRatio: number | null;
    BPNeed: number | null;
    BPAdd: number | null;
    StanceDamageType: string | null;
    AttackType: string | null;
    SkillEffect: string;
}

export interface SkillLevel {
    Level: number;
    Param: number[];
}

export interface Memosprite {
    ID: number;
    Name: Record<string, string>;
    Image: MemospriteImage;
    Skills: Record<string, SkillDetail>;
    HPBase?: number | null;
    HPInherit?: number | null;
    HPSkill?: number | null;
    SpeedBase?: number | null;
    SpeedInherit?: number | null;
    SpeedSkill?: number | null;
    Aggro?: number | null;
}

export interface MemospriteImage {
    HeadIcon: string;
    UnCreateHeadIconPath: string;
    WaitingServantHeadIconPath: string;
    ActionServantHeadIconPath: string;
    ServantSideIconPath: string;
    ServantMiniIconPath: string;
}

export interface SkillTreePoint {
    PointID: number;
    PointType: number;
    AnchorType: string;
    Level: number;
    MaxLevel: number;
    PrePoint: number[];
    StatusAddList: StatusAdd[];
    LevelUpSkillID: number[];
    Icon: string;
    PointName: Record<string, string>;
    PointDesc: Record<string, string>;
    Extra: Record<string, ExtraEffect>;
    Param: number[];
}


export interface StatusAdd {
    PropertyType: string;
    Value: number;
}

export interface Relics {
    Set4IDList: number[];
    Set2IDList: number[];
    PropertyList3: string[];
    PropertyList4: string[];
    PropertyList5: string[];
    PropertyList6: string[];
    PropertyList: RelicProperty[];
    SubAffixPropertyList: string[];
    ScoreRankList: number[];
    LocalCriticalChance: { Value: number };
}

export interface RelicProperty {
    RelicType: string;
    PropertyType: string;
}

export interface AvatarTeams {
    TeamID: number;
    Position: number;
    MemberList: number[];
    BackupList1: number[];
    BackupList2: number[];
    BackupList3: number[];
    BackupGroupList1: number[];
    BackupGroupList2: number[];
    BackupGroupList3: number[];
}

export interface EnhancedData {
    EnhancedID: number;
    SPNeed: number | null;
    Ranks: Record<string, RankDetail>;
    ExRanks?: Record<string, ExRankDetail>;
    Skills: Record<string, SkillDetail>;
    SkillTrees: Record<string, Record<string, SkillTreePoint>> | null;
}

export interface GlobalBuff {
    ID: number;
    AvatarID: number;
    Name: Record<string, string>;
    Tag: Record<string, string>;
    Desc: Record<string, string>;
    Param: number[];
    Extra: Record<string, ExtraEffect>;
    MazeBuffID: number | null;
}

// Parts of an avatar served separately and merged once loaded.
export type AvatarHeavyDetail = Pick<AvatarDetail, "Skills" | "SkillTrees" | "Ranks" | "ExRanks" | "Enhanced" | "Memosprite">;
