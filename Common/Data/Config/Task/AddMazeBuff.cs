using MemoryPack;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class AddMazeBuff : TaskConfigInfo
{
    public TargetEvaluator TargetType { get; set; } = new UnknownTargetEvaluator();
    public int ID { get; set; }
    public PredicateConfigInfo Condition { get; set; } = new UnknownPredicateConfigInfo();
    public TargetEvaluator BindingAffectedTarget { get; set; } = new UnknownTargetEvaluator();
    public DynamicFloat LifeTime { get; set; } = new();
    public DynamicFloat Count { get; set; } = new();
    public DynamicFloat Level { get; set; } = new();
    public Dictionary<string, DynamicFloat> DynamicValues { get; set; } = [];

    public new static TaskConfigInfo LoadFromJsonObject(JObject obj)
    {
        var info = new AddMazeBuff
        {
            Type = obj[nameof(Type)]!.ToObject<string>()!
        };
        if (obj.TryGetValue(nameof(TargetType), out var value))
        {
            var targetType = value as JObject;
            var classType =
                System.Type.GetType(
                    $"March7thHoney.Data.Config.Task.{targetType?["Type"]?.ToString().Replace("RPG.GameCore.", "")}");
            classType ??= System.Type.GetType("March7thHoney.Data.Config.Task.UnknownTargetEvaluator");
            info.TargetType = (targetType!.ToObject(classType!) as TargetEvaluator)!;
        }

        if (obj.TryGetValue(nameof(ID), out value)) info.ID = value.ToObject<int>()!;
        if (obj.TryGetValue(nameof(Condition), out value))
        {
            if (value is JObject condition)
                info.Condition = PredicateConfigInfo.LoadFromJsonObject(condition);
        }

        if (obj.TryGetValue(nameof(BindingAffectedTarget), out value))
        {
            var bindingAffectedTarget = value as JObject;
            var classType =
                System.Type.GetType(
                    $"March7thHoney.Data.Config.Task.{bindingAffectedTarget?["Type"]?.ToString().Replace("RPG.GameCore.", "")}");
            classType ??= System.Type.GetType("March7thHoney.Data.Config.Task.UnknownTargetEvaluator");
            info.BindingAffectedTarget = (bindingAffectedTarget!.ToObject(classType!) as TargetEvaluator)!;
        }

        if (obj.TryGetValue(nameof(LifeTime), out value)) info.LifeTime = value.ToObject<DynamicFloat>()!;

        if (obj.TryGetValue(nameof(Count), out value)) info.Count = value.ToObject<DynamicFloat>()!;
        if (obj.TryGetValue(nameof(Level), out value)) info.Level = value.ToObject<DynamicFloat>()!;

        if (!obj.TryGetValue(nameof(DynamicValues), out value)) return info;
        var dynamicValues = value as JObject;
        var dictionary = new Dictionary<string, DynamicFloat>();
        foreach (var (key, val) in dynamicValues!)
            dictionary[key] = val?.ToObject<DynamicFloat>()!;
        info.DynamicValues = dictionary;

        return info;
    }
}
