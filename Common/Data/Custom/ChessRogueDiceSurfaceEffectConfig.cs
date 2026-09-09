using MemoryPack;
using March7thHoney.Enums.Rogue;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class ChessRogueDiceSurfaceEffectConfig
{
    public int SurfaceId { get; set; }
    public List<ChessRogueDiceSurfaceContentEffect> ContentEffects { get; set; } = [];
}

[MemoryPackable]
public partial class ChessRogueDiceSurfaceContentEffect
{
    [JsonConverter(typeof(StringEnumConverter))]
    public ModifierEffectTypeEnum EffectType { get; set; }

    public Dictionary<string, string> Params { get; set; } = [];
}
