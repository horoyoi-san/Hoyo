using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueDLCBossBp.json")]
[MemoryPackable]
public partial class RogueDLCBossBpExcel : ExcelResource
{
    public int BossBpID { get; set; }
    public List<BossAndFloorInfo> MonsterAndFloorList { get; set; } = [];
    public List<int> BossDecayList { get; set; } = [];

    public override int GetId()
    {
        return BossBpID;
    }

    public override void Loaded()
    {
        GameData.RogueDLCBossBpData.Add(BossBpID, this);
    }
}

[MemoryPackable]
public partial class BossAndFloorInfo
{
    [JsonProperty("LKPOGAKCEMO")] public int MonsterId { get; set; }
}
