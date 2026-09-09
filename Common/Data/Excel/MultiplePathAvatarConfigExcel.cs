using MemoryPack;
using March7thHoney.Enums.Avatar;
using March7thHoney.Enums.Quest;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("MultiplePathAvatarConfig.json")]
[MemoryPackable]
public partial class MultiplePathAvatarConfigExcel : ExcelResource
{
    public List<Condition> UnlockConditions { get; set; } = [];
    public string ChangeConfigPath { get; set; } = "";

    [JsonConverter(typeof(StringEnumConverter))]
    public GenderTypeEnum Gender { get; set; }

    public int AvatarID { get; set; }
    public int BaseAvatarID { get; set; }

    public override int GetId()
    {
        return AvatarID;
    }

    public override void Loaded()
    {
        GameData.MultiplePathAvatarConfigData.Add(AvatarID, this);
    }
}

[MemoryPackable]
public partial class Condition
{
    public string Param { get; set; } = "";
    public ConditionTypeEnum Type { get; set; }
}
