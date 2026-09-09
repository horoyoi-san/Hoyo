using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("UpgradeAvatarEquipment.json")]
[MemoryPackable]
public partial class UpgradeAvatarEquipmentExcel : ExcelResource
{
    [JsonProperty("ELADHEIOONA")] public uint EquipmentId { get; set; }

    [JsonProperty("FJIFJPGEJID")]
    [JsonConverter(typeof(StringEnumConverter))]
    public AvatarBaseTypeEnum BaseType { get; set; }

    public override int GetId()
    {
        return (int)BaseType;
    }

    public override void Loaded()
    {
        GameData.UpgradeAvatarEquipmentData.TryAdd(BaseType, this);
    }
}
