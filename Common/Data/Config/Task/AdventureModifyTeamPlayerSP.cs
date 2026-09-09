using MemoryPack;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class AdventureModifyTeamPlayerSP : TaskConfigInfo
{
    public TargetEvaluator SpecifyTargetType { get; set; } = new UnknownTargetEvaluator();
    public DynamicFloat ModifyValue { get; set; } = new();
    public bool ClientUseGMCommand { get; set; }

    public new static TaskConfigInfo LoadFromJsonObject(JObject obj)
    {
        var info = new AdventureModifyTeamPlayerSP
        {
            Type = obj[nameof(Type)]!.ToObject<string>()!
        };

        // SpecifyTargetType is polymorphic (TargetEvaluator), so it needs the same manual
        // concrete-type resolution AddMazeBuff uses; default ToObject can't bind the abstract base.
        if (obj.TryGetValue(nameof(SpecifyTargetType), out var value))
        {
            var targetType = value as JObject;
            var classType =
                System.Type.GetType(
                    $"March7thHoney.Data.Config.Task.{targetType?["Type"]?.ToString().Replace("RPG.GameCore.", "")}");
            classType ??= System.Type.GetType("March7thHoney.Data.Config.Task.UnknownTargetEvaluator");
            info.SpecifyTargetType = (targetType!.ToObject(classType!) as TargetEvaluator)!;
        }

        if (obj.TryGetValue(nameof(ModifyValue), out value)) info.ModifyValue = value.ToObject<DynamicFloat>()!;
        if (obj.TryGetValue(nameof(ClientUseGMCommand), out value)) info.ClientUseGMCommand = value.ToObject<bool>();

        return info;
    }
}
