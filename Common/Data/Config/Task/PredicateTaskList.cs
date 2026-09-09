using MemoryPack;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class PredicateTaskList : TaskConfigInfo
{
    public PredicateConfigInfo Predicate { get; set; } = new UnknownPredicateConfigInfo();
    public List<TaskConfigInfo> SuccessTaskList { get; set; } = [];
    public List<TaskConfigInfo> FailedTaskList { get; set; } = [];

    public new static TaskConfigInfo LoadFromJsonObject(JObject obj)
    {
        PredicateTaskList info = new();
        info.Type = obj[nameof(Type)]!.ToObject<string>()!;
        if (obj.ContainsKey(nameof(Predicate)))
            info.Predicate = PredicateConfigInfo.LoadFromJsonObject((obj[nameof(Predicate)] as JObject)!)!;

        if (obj.ContainsKey(nameof(SuccessTaskList)))
            info.SuccessTaskList = obj[nameof(SuccessTaskList)]
                ?.Select(x => TaskConfigInfo.LoadFromJsonObject((x as JObject)!)).ToList() ?? [];

        if (obj.ContainsKey(nameof(FailedTaskList)))
            info.FailedTaskList = obj[nameof(FailedTaskList)]
                ?.Select(x => TaskConfigInfo.LoadFromJsonObject((x as JObject)!)).ToList() ?? [];
        return info;
    }
}
