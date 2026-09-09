using MemoryPack;

namespace March7thHoney.Database.TrainCakeCatch;

[DbTable("TrainCakeCatch")]
public class TrainCakeCatchData : BaseDatabaseDataHelper
{
    public List<CakeTreeSlotInfo> CatTreeSlots { get; set; } = [];

    public List<DiyDiceSlotInfo> DiceSlots { get; set; } = [];

    public List<DiyStagePlacement> StagePlacements { get; set; } = [];

    public int DiyTheme { get; set; }

    public List<int> PerformanceIds { get; set; } = [];
    public List<CakeCreatureInventoryInfo> CollectedCreatures { get; set; } = [];
    public List<int> SearchCreatureIds { get; set; } = [];
    public List<int> DiyLikeIds { get; set; } = [];
    public int AvailableSearchCount { get; set; }
    public long RefreshTime { get; set; }
    public long DailyRefreshTime { get; set; }
}

[MemoryPackable]
public partial class CakeCreatureInventoryInfo
{
    public int CreatureId { get; set; }
    public int Count { get; set; }
}

[MemoryPackable]
public partial class CakeTreeSlotInfo
{
    public int CreatureId { get; set; }
    public int Slot { get; set; }
}

[MemoryPackable]
public partial class DiyDiceSlotInfo
{
    public int DiceSlotId { get; set; }
    public int Index { get; set; }
    public List<int> Values { get; set; } = [];
}

[MemoryPackable]
public partial class DiyStagePlacement
{
    public int CreatureId { get; set; }
    public int Slot { get; set; }
}
