using MemoryPack;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
[MemoryPackUnion(0, typeof(UnknownPredicateConfigInfo))]
[MemoryPackUnion(1, typeof(AdventureByPlayerCurrentSkillType))]
[MemoryPackUnion(2, typeof(ByAnd))]
[MemoryPackUnion(3, typeof(ByCharacterDamageType))]
[MemoryPackUnion(4, typeof(ByCompareCarryMazebuff))]
[MemoryPackUnion(5, typeof(ByCompareFloorSavedValue))]
[MemoryPackUnion(6, typeof(ByCompareSubMissionState))]
[MemoryPackUnion(7, typeof(ByIsContainAdventureModifier))]
[MemoryPackUnion(8, typeof(AdvByCompareDynamicValue))]
[MemoryPackUnion(9, typeof(AdvByContainBehaviorFlag))]
public abstract partial class PredicateConfigInfo : TaskConfigInfo
{
    public bool Inverse { get; set; } = false;

    public new static PredicateConfigInfo LoadFromJsonObject(JObject obj)
    {
        var type = obj[nameof(Type)]!.ToObject<string>()!;
        var typeStr = type.Replace("RPG.GameCore.", "");
        var className = "March7thHoney.Data.Config.Task." + typeStr;

        switch (typeStr)
        {
            case "AdvByContainBehaviorFlag":
                return AdvByContainBehaviorFlag.LoadFromJsonObject(obj);
            case "ByIsContainAdventureModifier":
                return ByIsContainAdventureModifier.LoadFromJsonObject(obj);
            case "ByAnd":
                return ByAnd.LoadFromJsonObject(obj);
        }

        var typeClass = System.Type.GetType(className);
        PredicateConfigInfo info = typeClass != null
            ? (PredicateConfigInfo)obj.ToObject(typeClass)!
            : JsonConvert.DeserializeObject<UnknownPredicateConfigInfo>(obj.ToString())!;
        info.Type = type;
        return info;
    }
}

/// <summary>Concrete fallback for unknown/base predicate entries (replaces the former concrete PredicateConfigInfo).</summary>
[MemoryPackable]
public partial class UnknownPredicateConfigInfo : PredicateConfigInfo;
