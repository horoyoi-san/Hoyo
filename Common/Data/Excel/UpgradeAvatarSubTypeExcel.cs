using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("UpgradeAvatarSubType.json")]
[MemoryPackable]
public partial class UpgradeAvatarSubTypeExcel : ExcelResource
{
    [JsonProperty("DJPCAIKIONP")]
    public uint AvatarId { get; set; }

    [JsonProperty("COACLFEBBDA")]
    [JsonConverter(typeof(StringEnumConverter))]
    public UpgradeAvatarSubRelicTypeEnum SubType { get; set; }

    public override int GetId()
    {
        if (AvatarId == 0)
        {
            throw new KeyNotFoundException("Upgrade Avatar Should Be Updated!");
        }

        return (int)AvatarId;
    }

    public override void Loaded()
    {
        GameData.UpgradeAvatarSubTypeData.TryAdd(AvatarId, this);
    }
}
