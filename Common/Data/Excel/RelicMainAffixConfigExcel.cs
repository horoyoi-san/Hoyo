using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RelicMainAffixConfig.json")]
[MemoryPackable]
public partial class RelicMainAffixConfigExcel : ExcelResource
{
    public int GroupID { get; set; }
    public int AffixID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public AvatarPropertyTypeEnum Property { get; set; }

    public override int GetId()
    {
        return GroupID * 100 + AffixID;
    }

    public override void Loaded()
    {
        GameData.RelicMainAffixData.TryGetValue(GroupID, out var affixes);
        if (affixes != null)
            affixes[AffixID] = this;
        else
            GameData.RelicMainAffixData[GroupID] = new Dictionary<int, RelicMainAffixConfigExcel> { { AffixID, this } };
    }
}
