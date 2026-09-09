using MemoryPack;
using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Proto;

namespace March7thHoney.Database.Inventory;

[DbTable("offering_data")]
public class OfferingData : BaseDatabaseDataHelper
{
    public Dictionary<int, OfferingTypeData> Offerings { get; set; } = [];
}

[MemoryPackable]
public partial class OfferingTypeData
{
    public OfferingState State { get; set; } = OfferingState.Open;
    public int CurExp { get; set; }
    public int OfferingId { get; set; }
    public int Level { get; set; }
    public List<int> TakenReward { get; set; } = [];

    public OfferingInfo ToProto()
    {
        var totalExp = CurExp + Enumerable.Range(1, Level)
            .Select(level => GameData.OfferingLevelConfigData.GetValueOrDefault(OfferingId)?.GetValueOrDefault(level))
            .OfType<OfferingLevelConfigExcel>().Sum(config => config.ItemCost);

        return new OfferingInfo
        {
            OfferingState = State,
            HasTakenRewardIdList = { TakenReward.Select(x => (uint)x) },
            LevelExp = (uint)CurExp,
            OfferingId = (uint)OfferingId,
            OfferingLevel = (uint)Level,
            TotalExp = (uint)totalExp
        };
    }
}
