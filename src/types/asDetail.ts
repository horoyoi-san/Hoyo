import { ExtraEffect } from "./avatarDetail";
import { InfiniteWave, Invasion, MazeBuff } from "./pfDetail";

export interface ASGroupDetail {
    ID: number;
    ChallengeGroupType: string;
    Name: Record<string, string>;
    BeginTime: string;
    EndTime: string;
    BuffList1: ASBuff[];
    BuffList2: ASBuff[];
    BuffList3: ASBuff[] | null;
    Level: ASLevel[];
    Tierce: ASTierceLevel | null;
}

export interface ASBuff {
    ID: number;
    Param: number[];
    Icon: string;
    Name: Record<string, string>;
    Desc: Record<string, string>;
    ExtraList?: ExtraEffect[];
}

export interface ASTierceLevel {
    ID: number;
    PreChallenge: number;
    Name: Record<string, string>;
    Target: ASTarget[];
    DamageType: string[];
    TurnLimit: number;
    EventList: ASEvent[];
}

export interface ASLevel {
    Floor: number;
    ID: number;
    StageNum: number;
    Name: Record<string, string>;
    Target: ASTarget[];
    DamageType1: string[];
    DamageType2: string[];
    MazeBuff: MazeBuff[];
    TurnLimit: number;
    EventList1: ASEvent[];
    EventList2: ASEvent[];
    Monster1: ASMonster;
    Monster2: ASMonster;
    Monster3: ASMonster | null;
}

export interface ASTarget {
    ID: number;
    Name: Record<string, string>;
    Param: number[];
}

export interface ASEvent {
    ID: number;
    Name: Record<string, string>;
    HardLevelGroup: number;
    EliteGroup: number;
    Level: number;
    Release: boolean;
    MonsterList: number[][];
    Invasion: Invasion | null;
    Infinite: InfiniteWave[] | null;
}

export interface ASMonster {
    ID: number;
    Tag: ASTag[];
    Phase: ASPhase[];
    DifficultyGuide: ASDifficultyGuide[];
    TextGuide: ASTextGuide[];
}

export interface ASTag {
    ID: number;
    Name: Record<string, string>;
    BriefDescription: Record<string, string>;
    Param: number[];
    SkillID: number | null;
    Effect: ASEffect[];
}

export interface ASEffect {
    ID: number;
    Desc: Record<string, string>;
    Name: Record<string, string>;
    Icon: string;
    Param: number[];
    EffectType: number;
}

export interface ASPhase {
    ID: number;
    Name: Record<string, string>;
    Answer: Record<string, string>;
    Description: Record<string, string>;
    SkillList: ASSkillList[];
}

export interface ASSkillList {
    ID: number;
    SkillType: string;
    Name: Record<string, string>;
    TextList: ASTextList[];
}

export interface ASTextList {
    ID: number;
    Description: Record<string, string>;
    Param: number[];
    Effect: ASEffect[];
}

export interface ASDifficultyGuide {
    ID: number;
    Description: Record<string, string>;
    Param: number[];
    SkillID: number | null;
}

export interface ASTextGuide {
    ID: number;
    Description: Record<string, string>;
    Param: number[];
}