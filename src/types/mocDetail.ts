import { InfiniteWave, Invasion, MazeBuff } from "./pfDetail";

export interface MOCGroupDetail {
    ID: number;
    ChallengeGroupType: string;
    Name: Record<string, string>;
    BeginTime: string;
    EndTime: string;
    Level: MoCLevel[];
    Tierce: MoCTierceLevel | null;
}

export interface MoCTierceLevel {
    ID: number;
    PreChallenge: number;
    Name: Record<string, string>;
    Target: MoCTarget[];
    DamageType: string[];
    TurnLimit: number;
    EventList: MoCEvent[];
}

export interface MoCLevel {
    Floor: number;
    ID: number;
    StageNum: number;
    Name: Record<string, string>;
    Target: MoCTarget[];
    TurnLimit: number;
    DamageType1: string[];
    DamageType2: string[];
    MazeBuff: MazeBuff[];
    EventList1: MoCEvent[];
    EventList2: MoCEvent[];
}

export interface MoCTarget {
    ID: number;
    Name: Record<string, string>;
    Param: number[];
}


export interface MoCEvent {
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