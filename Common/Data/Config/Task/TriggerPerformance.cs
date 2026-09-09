using MemoryPack;
using March7thHoney.Enums.Task;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class TriggerPerformance : TaskConfigInfo
{
    [JsonConverter(typeof(StringEnumConverter))]
    public ELevelPerformanceTypeEnum PerformanceType { get; set; }

    public int PerformanceID { get; set; }
}
