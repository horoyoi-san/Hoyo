using MemoryPack;
using March7thHoney.Data.Config.Task;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config;

[MemoryPackable]
public partial class LevelInitSequeceConfigInfo
{
    public List<TaskConfigInfo> TaskList { get; set; } = [];

    public static LevelInitSequeceConfigInfo LoadFromJsonObject(JObject obj)
    {
        LevelInitSequeceConfigInfo info = new();
        if (obj.ContainsKey(nameof(TaskList)))
            info.TaskList = obj[nameof(TaskList)]?.Select(x => TaskConfigInfo.LoadFromJsonObject((x as JObject)!))
                .ToList() ?? [];
        return info;
    }
}
