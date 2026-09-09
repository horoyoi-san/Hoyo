using MemoryPack;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.Database.Friend;

[DbTable("friend_record_data")]
public class FriendRecordData : BaseDatabaseDataHelper
{
    public List<FriendDevelopmentInfoPb> DevelopmentInfos { get; set; } = []; // max 20 entries

    public Dictionary<uint, ChallengeGroupStatisticsPb> ChallengeGroupStatistics { get; set; } =
        []; // cur group statistics

    public uint NextRecordId { get; set; }

    public uint AllocateChallengeRecordId()
    {
        if (NextRecordId == 0) NextRecordId = 1;
        return NextRecordId++;
    }

    public void AddAndRemoveOld(FriendDevelopmentInfoPb info)
    {
        // get same type
        var same = DevelopmentInfos.Where(x => x.DevelopmentType == info.DevelopmentType);

        // if param equal remove
        foreach (var infoPb in same.ToArray())
            // ReSharper disable once UsageOfDefaultStructEquality
            if (infoPb.Params.SequenceEqual(info.Params))
                // remove
                DevelopmentInfos.Remove(infoPb);

        DevelopmentInfos.Add(info);
    }
}

[MemoryPackable]
public partial class FriendDevelopmentInfoPb
{
    public DevelopmentType DevelopmentType { get; set; }
    public long Time { get; set; } = Extensions.GetUnixSec();
    public Dictionary<string, uint> Params { get; set; } = [];

    // TODO 4.3: OHNPAFLKHNA 在 4.3 中已消失或更名，好友发展信息不在登录路径，暂时移除
}

[MemoryPackable]
public partial class ChallengeGroupStatisticsPb
{
    public uint GroupId { get; set; }
    public Dictionary<uint, MemoryGroupStatisticsPb>? MemoryGroupStatistics { get; set; }
    public Dictionary<uint, StoryGroupStatisticsPb>? StoryGroupStatistics { get; set; }
    public Dictionary<uint, BossGroupStatisticsPb>? BossGroupStatistics { get; set; }

    public object ToProto()
    {
        return new { GroupId };
    }
}

[MemoryPackable]
public partial class MemoryGroupStatisticsPb
{
    public uint RecordId { get; set; }
    public uint Level { get; set; }
    public uint RoundCount { get; set; }
    public uint Stars { get; set; }
    public List<List<ChallengeAvatarInfoPb>> Lineups { get; set; } = [];

    public object ToProto()
    {
        return new { RecordId, Level, RoundCount, Stars };
    }
}

[MemoryPackable]
public partial class StoryGroupStatisticsPb
{
    public uint RecordId { get; set; }
    public uint Level { get; set; }
    public uint Score { get; set; }
    public uint BuffOne { get; set; }
    public uint BuffTwo { get; set; }
    public uint Stars { get; set; }
    public List<List<ChallengeAvatarInfoPb>> Lineups { get; set; } = [];

    public object ToProto()
    {
        return new { RecordId, Level, Score, BuffOne, BuffTwo, Stars };
    }
}

[MemoryPackable]
public partial class BossGroupStatisticsPb
{
    public uint RecordId { get; set; }
    public uint Level { get; set; }
    public uint Score { get; set; }
    public uint BuffOne { get; set; }
    public uint BuffTwo { get; set; }
    public uint Stars { get; set; }
    public List<List<ChallengeAvatarInfoPb>> Lineups { get; set; } = [];

    public object ToProto()
    {
        return new { RecordId, Level, Score, BuffOne, BuffTwo, Stars };
    }
}

[MemoryPackable]
public partial class ChallengeAvatarInfoPb
{
    public uint Level { get; set; }
    public uint Index { get; set; }
    public uint Id { get; set; }
    public AvatarType AvatarType { get; set; } = AvatarType.AvatarFormalType;
    public uint SkinId { get; set; }

    public ChallengeAvatarInfo ToProto()
    {
        return new ChallengeAvatarInfo
        {
            Level = Level,
            AvatarType = AvatarType,
            Id = Id,
            Index = Index,
            SkinId = SkinId
        };
    }
}
