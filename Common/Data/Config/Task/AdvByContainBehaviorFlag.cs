using MemoryPack;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class AdvByContainBehaviorFlag : PredicateConfigInfo
{
    public TargetEvaluator TargetType { get; set; } = new UnknownTargetEvaluator();
    public string Flag { get; set; } = string.Empty;

    public new static PredicateConfigInfo LoadFromJsonObject(JObject obj)
    {
        var info = new AdvByContainBehaviorFlag
        {
            Type = obj[nameof(Type)]?.ToObject<string>() ?? string.Empty,
            Inverse = obj[nameof(Inverse)]?.ToObject<bool>() ?? false,
            Flag = obj[nameof(Flag)]?.ToObject<string>() ?? string.Empty
        };

        if (!obj.TryGetValue(nameof(TargetType), out var value) || value is not JObject targetType) return info;

        var classType = System.Type.GetType(
            $"March7thHoney.Data.Config.Task.{targetType["Type"]?.ToString().Replace("RPG.GameCore.", "")}");
        classType ??= typeof(UnknownTargetEvaluator);
        info.TargetType = (targetType.ToObject(classType) as TargetEvaluator)!;
        return info;
    }
}
