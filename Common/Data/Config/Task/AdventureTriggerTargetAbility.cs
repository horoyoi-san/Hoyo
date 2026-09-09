using MemoryPack;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class AdventureTriggerTargetAbility : TaskConfigInfo
{
    public string SkillType { get; set; } = "";
    public string AbilityName { get; set; } = "";
}
