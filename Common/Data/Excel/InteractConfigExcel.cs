using MemoryPack;
using March7thHoney.Enums.Scene;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("InteractConfig.json")]
[MemoryPackable]
public partial class InteractConfigExcel : ExcelResource
{
    public int InteractID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public PropStateEnum SrcState { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public PropStateEnum TargetState { get; set; } = PropStateEnum.Closed;

    public override int GetId()
    {
        return InteractID;
    }

    public override void Loaded()
    {
        GameData.InteractConfigData.Add(InteractID, this);
    }
}
