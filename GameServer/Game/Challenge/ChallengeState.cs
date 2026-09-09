using MemoryPack;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Challenge;

// MemoryPack POCO replacements for the former ServerSideProto challenge state (ChallengeDataPb & friends).
// Runtime challenge state, persisted as a MemoryPack blob (Base64) on ChallengeData.ChallengeInstance.

public enum ChallengeLineupType
{
    None = 0,
    Challenge1 = 1,
    Challenge2 = 3,
    Challenge3 = 4
}

public enum ChallengeStateCase
{
    None,
    Memory,
    Story,
    Boss,
    Peak
}

[MemoryPackable]
public partial class MemoryChallengeState
{
    public uint ChallengeMazeId { get; set; }
    public Position StartPos { get; set; } = new();
    public Position StartRot { get; set; } = new();
    public uint CurrentStage { get; set; }
    public uint CurStatus { get; set; }
    public uint DeadAvatarNum { get; set; }
    public uint SavedMp { get; set; }
    public ChallengeLineupType CurrentExtraLineup { get; set; }
    public uint RoundsLeft { get; set; }
    public uint Stars { get; set; }
}

[MemoryPackable]
public partial class StoryChallengeState
{
    public uint ChallengeMazeId { get; set; }
    public Position StartPos { get; set; } = new();
    public Position StartRot { get; set; } = new();
    public uint CurrentStage { get; set; }
    public uint CurStatus { get; set; }
    public uint SavedMp { get; set; }
    public ChallengeLineupType CurrentExtraLineup { get; set; }
    public uint Stars { get; set; }
    public uint ScoreStage1 { get; set; }
    public uint ScoreStage2 { get; set; }
    public List<uint> Buffs { get; set; } = [];
}

[MemoryPackable]
public partial class BossChallengeState
{
    public uint ChallengeMazeId { get; set; }
    public Position StartPos { get; set; } = new();
    public Position StartRot { get; set; } = new();
    public uint CurrentStage { get; set; }
    public uint CurStatus { get; set; }
    public uint SavedMp { get; set; }
    public ChallengeLineupType CurrentExtraLineup { get; set; }
    public uint Stars { get; set; }
    public uint ScoreStage1 { get; set; }
    public uint ScoreStage2 { get; set; }
    public List<uint> Buffs { get; set; } = [];
}

[MemoryPackable]
public partial class PeakChallengeState
{
    public uint CurrentPeakGroupId { get; set; }
    public uint CurrentPeakLevelId { get; set; }
    public List<uint> Buffs { get; set; } = [];
    public uint CurStatus { get; set; }
    public Position StartPos { get; set; } = new();
    public Position StartRot { get; set; } = new();
    public uint SavedMp { get; set; }
    public uint Stars { get; set; }
    public ChallengeLineupType CurrentExtraLineup { get; set; }
    public bool IsHard { get; set; }
    public uint RoundCnt { get; set; }
}

[MemoryPackable]
public partial class ChallengeStateData
{
    public MemoryChallengeState? Memory { get; set; }
    public StoryChallengeState? Story { get; set; }
    public BossChallengeState? Boss { get; set; }
    public PeakChallengeState? Peak { get; set; }

    [MemoryPackIgnore]
    public ChallengeStateCase Case =>
        Memory != null ? ChallengeStateCase.Memory :
        Story != null ? ChallengeStateCase.Story :
        Boss != null ? ChallengeStateCase.Boss :
        Peak != null ? ChallengeStateCase.Peak :
        ChallengeStateCase.None;
}
