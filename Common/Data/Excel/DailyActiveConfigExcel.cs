using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("DailyActiveConfig.json")]
[MemoryPackable]
public partial class DailyActiveConfigExcel : ExcelResource
{
    public int WorldLevel { get; set; }
    public int Level { get; set; }
    public int DailyActivePoint { get; set; }
    public int DailyActiveReward { get; set; }

    public override int GetId()
    {
        return WorldLevel * 100 + Level;
    }

    public override void Loaded()
    {
        if (!GameData.DailyActiveConfigData.TryGetValue(WorldLevel, out var list))
        {
            list = [];
            GameData.DailyActiveConfigData[WorldLevel] = list;
        }

        list.Add(this);
    }
}
