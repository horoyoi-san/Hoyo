using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueMazeBuff.json")]
[MemoryPackable]
public partial class RogueMazeBuffExcel : ExcelResource
{
    [JsonIgnore] public string? Name;

    public int ID { get; set; }
    public int Lv { get; set; }
    public int LvMax { get; set; }
    public HashName BuffName { get; set; } = new();

    public override int GetId()
    {
        return ID * 100 + Lv;
    }

    public override void Loaded()
    {
        GameData.RogueMazeBuffData.Add(GetId(), this);
    }
}
