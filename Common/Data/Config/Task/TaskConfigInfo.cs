using MemoryPack;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
[MemoryPackUnion(0, typeof(UnknownTaskConfigInfo))]
[MemoryPackUnion(1, typeof(AddAdventureModifier))]
[MemoryPackUnion(2, typeof(AddMazeBuff))]
[MemoryPackUnion(3, typeof(AdvModifyMaxMazeMP))]
[MemoryPackUnion(4, typeof(AdventureFireProjectile))]
[MemoryPackUnion(5, typeof(AdventureTriggerAttack))]
[MemoryPackUnion(6, typeof(CreateProp))]
[MemoryPackUnion(7, typeof(CreateSummonUnit))]
[MemoryPackUnion(8, typeof(DestroyProp))]
[MemoryPackUnion(9, typeof(DestroySummonUnit))]
[MemoryPackUnion(10, typeof(EnterMap))]
[MemoryPackUnion(11, typeof(EnterMapByCondition))]
[MemoryPackUnion(12, typeof(PlayMessage))]
[MemoryPackUnion(13, typeof(PredicateTaskList))]
[MemoryPackUnion(14, typeof(PropSetupUITrigger))]
[MemoryPackUnion(15, typeof(PropStateExecute))]
[MemoryPackUnion(16, typeof(RefreshMazeBuffTime))]
[MemoryPackUnion(17, typeof(RemoveAdventureModifier))]
[MemoryPackUnion(18, typeof(RemoveMazeBuff))]
[MemoryPackUnion(19, typeof(TriggerBattle))]
[MemoryPackUnion(20, typeof(TriggerCustomString))]
[MemoryPackUnion(21, typeof(TriggerEntityEvent))]
[MemoryPackUnion(22, typeof(TriggerPerformance))]
[MemoryPackUnion(23, typeof(AdventureByPlayerCurrentSkillType))]
[MemoryPackUnion(24, typeof(ByAnd))]
[MemoryPackUnion(25, typeof(ByCharacterDamageType))]
[MemoryPackUnion(26, typeof(ByCompareCarryMazebuff))]
[MemoryPackUnion(27, typeof(ByCompareFloorSavedValue))]
[MemoryPackUnion(28, typeof(ByCompareSubMissionState))]
[MemoryPackUnion(29, typeof(ByIsContainAdventureModifier))]
[MemoryPackUnion(30, typeof(UnknownPredicateConfigInfo))]
[MemoryPackUnion(31, typeof(AdventureModifyTeamPlayerSP))]
[MemoryPackUnion(32, typeof(AdventureTriggerTargetAbility))]
[MemoryPackUnion(33, typeof(AdvByContainBehaviorFlag))]
public abstract partial class TaskConfigInfo
{
    public string Type { get; set; } = "";
    public bool TaskEnabled { get; set; } = false;

    public static TaskConfigInfo LoadFromJsonObject(JObject json)
    {
        var type = json[nameof(Type)]?.Value<string>() ?? "";
        if (string.IsNullOrEmpty(type)) return new UnknownTaskConfigInfo();

        var typeStr = type.Replace("RPG.GameCore.", "");
        var className = "March7thHoney.Data.Config.Task." + typeStr;
        var typeClass = System.Type.GetType(className);
        if (typeStr == "PredicateTaskList")
        {
            var res = PredicateTaskList.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "PropSetupUITrigger")
        {
            var res = PropSetupUITrigger.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "PropStateExecute")
        {
            var res = PropStateExecute.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "AddMazeBuff")
        {
            var res = AddMazeBuff.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "RemoveMazeBuff")
        {
            var res = RemoveMazeBuff.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "RefreshMazeBuffTime")
        {
            var res = RefreshMazeBuffTime.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "AdventureFireProjectile")
        {
            var res = AdventureFireProjectile.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "NewAdventureFireProjectile")
        {
            var res = AdventureFireProjectile.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "AdventureTriggerAttack")
        {
            var res = AdventureTriggerAttack.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "AddAdventureModifier")
        {
            var res = AddAdventureModifier.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "AdventureModifyTeamPlayerSP")
        {
            var res = AdventureModifyTeamPlayerSP.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeStr == "RemoveAdventureModifier")
        {
            var res = RemoveAdventureModifier.LoadFromJsonObject(json);
            res.Type = type;
            return res;
        }

        if (typeClass != null)
        {
            var res = (TaskConfigInfo)json.ToObject(typeClass)!;
            res.Type = type;
            return res;
        }

        return JsonConvert.DeserializeObject<UnknownTaskConfigInfo>(json.ToString())!;
    }
}

/// <summary>Concrete fallback for unknown/base task entries (replaces the former concrete TaskConfigInfo).</summary>
[MemoryPackable]
public partial class UnknownTaskConfigInfo : TaskConfigInfo;
