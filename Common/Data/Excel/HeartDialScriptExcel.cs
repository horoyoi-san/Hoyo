using MemoryPack;
using March7thHoney.Enums.Mission;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace March7thHoney.Data.Excel;

[ResourceEntity("HeartDialScript.json")]
[MemoryPackable]
public partial class HeartDialScriptExcel : ExcelResource
{
    public int ScriptID { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public HeartDialEmoTypeEnum DefaultEmoType { get; set; } = HeartDialEmoTypeEnum.Peace;

    [JsonProperty(ItemConverterType = typeof(StringEnumConverter))]
    public List<HeartDialStepTypeEnum> StepList { get; set; } = [];

    [JsonProperty(ItemConverterType = typeof(StringEnumConverter))]
    public List<HeartDialEmoTypeEnum> MissingEmoList { get; set; } = [];

    public override int GetId()
    {
        return ScriptID;
    }

    public override void Loaded()
    {
        GameData.HeartDialScriptData[ScriptID] = this;
    }
}
