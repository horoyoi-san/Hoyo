using MemoryPack;
using March7thHoney.Enums.Scene;
using March7thHoney.Util;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("MazeChest.json")]
[MemoryPackable]
public partial class MazeChestExcel : ExcelResource
{
    public int WorldID { get; set; }
    public int ID { get; set; }

    [JsonConverter(typeof(SafeEnumListConverter<ChestTypeEnum>))]
    public List<ChestTypeEnum> ChestType { get; set; } = [];

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.MazeChestData.Add(ID, this);
    }
}
