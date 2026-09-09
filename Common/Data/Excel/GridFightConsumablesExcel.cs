using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightConsumables.json")]
[MemoryPackable]
public partial class GridFightConsumablesExcel : ExcelResource
{
    public uint ID { get; set; }
    public bool IfStack { get; set; }
    public bool IfConsume { get; set; }
    public List<uint> ConsumableParamList { get; set; } = [];

    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightConsumeTypeEnum ConsumableRule { get; set; }

    public override int GetId()
    {
        return (int)ID;
    }

    public override void Loaded()
    {
        GameData.GridFightConsumablesData.TryAdd(ID, this);
    }
}
