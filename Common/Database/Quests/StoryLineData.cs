using MemoryPack;
using March7thHoney.Database.Lineup;
using March7thHoney.Util;

namespace March7thHoney.Database.Quests;

[DbTable("StoryLineData")]
public class StoryLineData : BaseDatabaseDataHelper
{
    public int CurStoryLineId { get; set; }

    public int OldPlaneId { get; set; }
    public int OldFloorId { get; set; }
    public int OldEntryId { get; set; }

    public Position OldPos { get; set; } = new();

    public Position OldRot { get; set; } = new();

    public Dictionary<int, StoryLineInfo> RunningStoryLines { get; set; } = []; // finished one will be deleted
}

[MemoryPackable]
public partial class StoryLineInfo
{
    public int StoryLineId { get; set; }

    // Save Data
    public int SavedPlaneId { get; set; }
    public int SavedFloorId { get; set; }
    public int SavedEntryId { get; set; }
    public Position SavedPos { get; set; } = new();
    public Position SavedRot { get; set; } = new();
    public List<LineupAvatarInfo> Lineup { get; set; } = [];
}
