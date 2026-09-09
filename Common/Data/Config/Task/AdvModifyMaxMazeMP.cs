using MemoryPack;
using March7thHoney.Enums.Avatar;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class AdvModifyMaxMazeMP : TaskConfigInfo
{
    [JsonConverter(typeof(StringEnumConverter))]
    public PropertyModifyFunctionEnum ModifyFunction { get; set; }

    public DynamicFloat ModifyValue { get; set; } = new();
}
