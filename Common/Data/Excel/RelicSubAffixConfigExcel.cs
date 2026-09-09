using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RelicSubAffixConfig.json")]
[MemoryPackable]
public partial class RelicSubAffixConfigExcel : ExcelResource
{
    public int GroupID { get; set; }
    public int AffixID { get; set; }

    public int StepNum { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public AvatarPropertyTypeEnum Property { get; set; }


    public override int GetId()
    {
        return GroupID * 100 + AffixID;
    }

    public override void Loaded()
    {
        GameData.RelicSubAffixData.TryGetValue(GroupID, out var affixes);
        if (affixes != null)
            affixes[AffixID] = this;
        else
            GameData.RelicSubAffixData[GroupID] = new Dictionary<int, RelicSubAffixConfigExcel> { { AffixID, this } };
    }
}
