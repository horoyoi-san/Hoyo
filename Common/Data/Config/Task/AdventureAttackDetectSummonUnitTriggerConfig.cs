using MemoryPack;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class AdventureAttackDetectSummonUnitTriggerConfig
{
    public uint SummonUnitID { get; set; }
    public string DetectSummonUnitTriggerName { get; set; } = "";
}
