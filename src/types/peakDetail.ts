import { BattleTarget, InfiniteWave, Invasion, MazeBuff } from "./pfDetail";

export interface PeakGroupDetail {
    ID: number;
    ChallengeGroupType: string;
    Name: Record<string, string>;
    PreLevel: PeakMazeConfig[];
    BossLevel: PeakMazeConfig | null;
    BossConfig: PeakBossConfig | null;
}

export interface PeakMazeConfig {
    ID: number;
    Name: Record<string, string>;
    BattleTarget: BattleTarget[];
    DamageType: string[];
    MazeBuff: MazeBuff[];
    TurnLimit: number;
    EventList: PeakEvent[];
}

export interface PeakBossConfig {
    ID: number;
    Name: Record<string, string>;
    BuffList: MazeBuff[];
    BattleTarget: BattleTarget[];
    MazeBuff: MazeBuff[];
    TurnLimit: number;
    EventList: PeakEvent[];
}

export interface PeakEvent {
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