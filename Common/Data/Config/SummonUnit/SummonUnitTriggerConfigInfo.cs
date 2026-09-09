using MemoryPack;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.SummonUnit;

[MemoryPackable]
public partial class SummonUnitTriggerConfigInfo
{
    //public UnitHintTriggerConfig HintTrigger;
    //public PropSoundConfig SoundTrigger;
    public List<UnitCustomTriggerConfigInfo> CustomTriggers { get; set; } = [];

    public static SummonUnitTriggerConfigInfo LoadFromJsonObject(JObject obj)
    {
        SummonUnitTriggerConfigInfo info = new();
        if (obj.ContainsKey(nameof(CustomTriggers)))
            info.CustomTriggers = obj[nameof(CustomTriggers)]
                ?.Select(x => UnitCustomTriggerConfigInfo.LoadFromJsonObject((x as JObject)!)).ToList() ?? [];
        return info;
    }
}
