using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class ByCharacterDamageType : PredicateConfigInfo
{
    [JsonConverter(typeof(StringEnumConverter))]
    public DamageTypeEnum DamageType { get; set; } = DamageTypeEnum.Fire;
}
