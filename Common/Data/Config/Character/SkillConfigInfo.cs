using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Config.Character;

[MemoryPackable]
public partial class SkillConfigInfo
{
    public string EntryAbility { get; set; } = "";

    [JsonConverter(typeof(StringEnumConverter))]
    public SkillUseTypeEnum UseType { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public AdventureSkillTypeEnum AdventureSkillType { get; set; }
}
