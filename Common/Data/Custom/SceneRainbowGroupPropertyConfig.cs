using MemoryPack;
using March7thHoney.Enums.Scene;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class SceneRainbowGroupPropertyConfig
{
    public Dictionary<int, Dictionary<int, Dictionary<string, Dictionary<int, RainbowGroupPropertyInfo>>>> FloorProperty
    {
        get;
        set;
    } = [];
}

[MemoryPackable]
public partial class RainbowGroupPropertyInfo
{
    public List<RainbowActionInfo> PrivateActions { get; set; } = [];
    public List<RainbowActionInfo> Actions { get; set; } = [];
}

[MemoryPackable]
public partial class RainbowActionInfo
{
    [JsonConverter(typeof(StringEnumConverter))]
    public SceneActionTypeEnum ActionType { get; set; } = SceneActionTypeEnum.Unknown;

    public Dictionary<string, object> Params { get; set; } = [];
}
