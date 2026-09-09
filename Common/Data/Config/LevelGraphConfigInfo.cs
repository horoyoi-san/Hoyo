using MemoryPack;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config;

[MemoryPackable]
public partial class LevelGraphConfigInfo
{
    public List<LevelInitSequeceConfigInfo> OnInitSequece { get; set; } = [];
    public List<LevelStartSequeceConfigInfo> OnStartSequece { get; set; } = [];

    public static LevelGraphConfigInfo LoadFromJsonObject(JObject obj)
    {
        LevelGraphConfigInfo info = new();
        if (obj.ContainsKey(nameof(OnInitSequece)))
            info.OnInitSequece = obj[nameof(OnInitSequece)]
                ?.Select(x => LevelInitSequeceConfigInfo.LoadFromJsonObject((x as JObject)!)).ToList() ?? [];
        if (obj.ContainsKey(nameof(OnStartSequece)))
            info.OnStartSequece = obj[nameof(OnStartSequece)]
                ?.Select(x => LevelStartSequeceConfigInfo.LoadFromJsonObject((x as JObject)!)).ToList() ?? [];
        return info;
    }
}
