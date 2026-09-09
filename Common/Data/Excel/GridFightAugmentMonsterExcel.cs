using MemoryPack;
using March7thHoney.Enums.GridFight;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightAugmentMonster.json")]
[MemoryPackable]
public partial class GridFightAugmentMonsterExcel : ExcelResource
{
    public uint DivisionLevel { get; set; }
    public uint EnemyDiffLvAdd { get; set; }
    [JsonConverter(typeof(StringEnumConverter))] public GridFightAugmentQualityEnum Quality { get; set; }

    public override int GetId()
    {
        return (int)DivisionLevel;
    }

    public override void Loaded()
    {
        GameData.GridFightAugmentMonsterData.TryAdd(DivisionLevel, []);
        GameData.GridFightAugmentMonsterData[DivisionLevel][Quality] = this;
    }
}
