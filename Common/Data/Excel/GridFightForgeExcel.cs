using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightForge.json")]
[MemoryPackable]
public partial class GridFightForgeExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint EquipNum { get; set; }
    public List<uint> ParamList { get; set; } = [];

    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightForgeFuncTypeEnum FuncType { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightForgeData.TryAdd(ID, this);
    }
}
