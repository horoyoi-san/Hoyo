export interface PFGroupDetail {
    ID: number;
    ChallengeGroupType: string;
    Name: Record<string, string>;
    BeginTime: string;
    EndTime: string;
    SubOption: MazeBuff[];
    Option: MazeBuff[];
    Level: PFLevel[];
    Tierce: PFTierceLevel | null;
}

export interface MazeBuff {
    ID: number;
    Param: number[];
    Icon: string;
    Name: Record<string, string>;
    Desc: Record<string, string>;
}

export interface Invasion {
    ID: number;
    MazeBuff: MazeBuff;
    Desc: Record<string, string>;
    MonsterList?: number[];
    MonsterInvasionList?: {
        MonsterID: number;
        Params: number[];
    }[];
}

export interface PFTierceLevel {
    ID: number;
    PreChallenge: number;
    Name: Record<string, string>;
    Target: StoryTarget[];
    DamageType: string[];
    TurnLimit: number;
    EventList: PFEvent[];
}

export interface PFLevel {
    Floor: number;
    ID: number;
    StageNum: number;
    Name: Record<string, string>;
    Target: StoryTarget[];
    DamageType1: string[];
    DamageType2: string[];
    MazeBuff: MazeBuff[];
    EventList1: PFEvent[];
    EventList2: PFEvent[];
    TurnLimit: number;
    BattleTarget: BattleTarget[];
    ClearScore: number;
}

export interface StoryTarget {
    ID: number;
    Name: Record<string, string>;
    Param: number[];
}

export interface BattleTarget {
    ID: number;
    Param: number[];
    Name: Record<string, string>;
}
export interface InfiniteWave {
    ID: number;
    MaxMonsterCount: number;
    MonsterList: number[];
    EliteGroup: number;
}
export interface PFEvent {
    ID: number;
    Name: Record<string, string>;
    HardLevelGroup: number;
    EliteGroup: number;
    Level: number;
    Release: boolean;
    MonsterList: number[][];
    Invasion: Invasion | null;
    Infinite?: InfiniteWave[] | null;
}

