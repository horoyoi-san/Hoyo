import { EventStageDetail } from "./mocDetail";
import { InfiniteWave } from "./pfDetail";

export interface PeakDetail {
    Id: number;
    Name: string;
    PreLevel: PeakLevel[];
    BossLevel: PeakLevel;
    BossConfig: BossConfig;
}

export interface PeakLevel {
    Id: number;
    Name: string;
    DamageType: string[];
    MazeGroupID: number;
    NpcMonsterIDList: number[];
    EventIDList: EventStageDetail[];
    TagList: ChallengeTag[];
    InfiniteList: Record<string, InfiniteWave>;
}

export interface BossConfig {
    HardName: string;
    BuffList: ChallengeTag[];
    EventIDList: EventStageDetail[];
    TagList: ChallengeTag[];
    InfiniteList: Record<string, InfiniteWave>;
}

export interface ChallengeTag {
    Id: number;
    Name: string;
    Desc: string;
    Param: number[];
}

