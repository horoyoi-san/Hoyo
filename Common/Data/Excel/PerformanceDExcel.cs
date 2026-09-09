using MemoryPack;
using March7thHoney.Data.Config;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("PerformanceD.json")]
[MemoryPackable]
public partial class PerformanceDExcel : ExcelResource
{
    public int PerformanceID { get; set; }
    public string PerformancePath { get; set; } = "";

    [JsonIgnore] public LevelGraphConfigInfo? ActInfo { get; set; }

    public override int GetId()
    {
        return PerformanceID;
    }

    public override void Loaded()
    {
        GameData.PerformanceDData.Add(PerformanceID, this);
    }
}
