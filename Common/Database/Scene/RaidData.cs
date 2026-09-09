using MemoryPack;
using March7thHoney.Database.Lineup;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.Database.Scene;

[DbTable("RaidData")]
public class RaidData : BaseDatabaseDataHelper
{
    public Dictionary<int, Dictionary<int, RaidRecord>> RaidRecordDatas { get; set; } = [];

    [Obsolete("Using RaidRecordDatas")]
    public Dictionary<int, RaidRecord> RaidRecordData { get; set; } = [];

    public int CurRaidId { get; set; }
    public int CurRaidWorldLevel { get; set; }
}

[MemoryPackable]
public partial class RaidRecord
{
    // Basic Info
    public int RaidId { get; set; }
    public int WorldLevel { get; set; }
    public RaidStatus Status { get; set; }
    public long FinishTimeStamp { get; set; }

    // Lineup Info
    public List<LineupAvatarInfo> Lineup { get; set; } = [];

    // Scene Info
    public Position Pos { get; set; } = new();
    public Position Rot { get; set; } = new();
    public int PlaneId { get; set; }
    public int FloorId { get; set; }
    public int EntryId { get; set; }

    public Position OldPos { get; set; } = new();
    public Position OldRot { get; set; } = new();
    public int OldEntryId { get; set; }
}
