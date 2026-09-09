using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueManager.json")]
[MemoryPackable]
public partial class RogueManagerExcel : ExcelResource
{
    public int RogueSeason { get; set; }
    public string BeginTime { get; set; } = "";
    public string EndTime { get; set; } = "";
    public List<int> RogueAreaIDList { get; set; } = [];

    [JsonIgnore] public DateTime BeginTimeDate { get; set; }

    [JsonIgnore] public DateTime EndTimeDate { get; set; }

    public override int GetId()
    {
        return RogueSeason;
    }

    public override void Loaded()
    {
        GameData.RogueManagerData.Add(GetId(), this);
        BeginTimeDate = DateTime.Parse(BeginTime);
        EndTimeDate = DateTime.Parse(EndTime);
    }
}
