using MemoryPack;
using March7thHoney.Enums.Task;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class ByCompareFloorSavedValue : PredicateConfigInfo
{
    public string Name { get; set; } = "";

    [JsonConverter(typeof(StringEnumConverter))]
    public CompareTypeEnum CompareType { get; set; } = CompareTypeEnum.Equal;

    public short CompareValue { get; set; } = 0;
}
