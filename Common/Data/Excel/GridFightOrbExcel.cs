using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightOrb.json")]
[MemoryPackable]
public partial class GridFightOrbExcel : ExcelResource
{
    public uint BonusID { get; set; }
    public uint OrbID { get; set; }
    public HashName OrbName { get; set; } = new();

    [JsonConverter(typeof(StringEnumConverter))]
    public GridFightOrbTypeEnum Type { get; set; }

    public override int GetId()
    {
        return (int)OrbID;
    }

    public override void Loaded()
    {
        GameData.GridFightOrbData.TryAdd(OrbID, this);
    }
}
