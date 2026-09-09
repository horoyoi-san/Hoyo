using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using March7thHoney.Data.Config.Task;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Task.AvatarTask;

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicMethods)]
public class SummonUnitLevelTask
{
    #region Task Condition

    public async ValueTask<object?> ByIsContainAdventureModifier(TaskConfigInfo act,
        List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        await ValueTask.CompletedTask;

        return true;
    }

    #endregion

    #region Manage

    public async ValueTask TriggerTasks(List<TaskConfigInfo> tasks, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        foreach (var task in tasks) await TriggerTask(task, targetEntities, summonUnit);
    }

    public async ValueTask TriggerTask(TaskConfigInfo act, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        try
        {
            var methodName = act.Type.Replace("RPG.GameCore.", "");

            // try to get from cache
            var method = GetOrCreateExecuteTask(methodName);
            if (method == null) return;

            await method(act, targetEntities, summonUnit);
        }
        catch (Exception e)
        {
            Logger.GetByClassName().Error("An error occured, ", e);
        }
    }

    private ExecuteTask? GetOrCreateExecuteTask(string methodName)
    {
        // try to get from cache
        if (_cachedTasks.TryGetValue(methodName, out var method)) return method;
        var methodProp = GetType().GetMethod(methodName);
        if (methodProp == null) return null;

        method = (ExecuteTask)Delegate.CreateDelegate(typeof(ExecuteTask), this, methodProp);
        _cachedTasks[methodName] = method; // cached

        return method;
    }

    private delegate ValueTask<object?> ExecuteTask(TaskConfigInfo act, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit);

    private readonly ConcurrentDictionary<string, ExecuteTask> _cachedTasks = [];

    #endregion

    #region Task

    public async ValueTask<object?> PredicateTaskList(TaskConfigInfo act, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        if (act is PredicateTaskList predicateTaskList)
        {
            // handle predicateCondition
            var methodName = predicateTaskList.Predicate.Type.Replace("RPG.GameCore.", "");

            var method = GetOrCreateExecuteTask(methodName);
            if (method == null) return null;

            var resp = await method(predicateTaskList.Predicate, targetEntities, summonUnit);
            if (resp is true)
                foreach (var task in predicateTaskList.SuccessTaskList)
                    await TriggerTask(task, targetEntities, summonUnit);
            else
                foreach (var task in predicateTaskList.FailedTaskList)
                    await TriggerTask(task, targetEntities, summonUnit);
        }

        return null;
    }

    public async ValueTask<object?> AddMazeBuff(TaskConfigInfo act, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        if (act is not AddMazeBuff addMazeBuff) return null;

        var buff = new SceneBuff(addMazeBuff.ID, 1, summonUnit?.CreateAvatarId ?? 0)
        {
            SummonUnitEntityId = summonUnit?.AttachEntityId ?? 0,
            CastEntityId = summonUnit?.AttachEntityId ?? 0,
            ChangeReason = SceneEntityBuffChangeType.AddMazebuff
        };

        foreach (var item in addMazeBuff.DynamicValues)
            buff.DynamicValues.Add(item.Key, item.Value.GetValue());

        foreach (var targetEntity in targetEntities)
        {
            if (targetEntity is not EntityMonster monster) continue;

            await monster.AddBuff(buff);
        }

        return null;
    }

    public async ValueTask<object?> RemoveMazeBuff(TaskConfigInfo act, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        if (act is not RemoveMazeBuff removeMazeBuff) return null;

        foreach (var targetEntity in targetEntities)
        {
            if (targetEntity is not EntityMonster monster) continue;

            await monster.RemoveBuff(removeMazeBuff.ID);
        }

        return null;
    }

    public async ValueTask<object?> RefreshMazeBuffTime(TaskConfigInfo act, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        if (act is not RefreshMazeBuffTime refreshMazeBuffTime) return null;

        var buff = new SceneBuff(refreshMazeBuffTime.ID, 1, summonUnit?.CreateAvatarId ?? 0)
        {
            SummonUnitEntityId = summonUnit?.AttachEntityId ?? 0,
            CastEntityId = summonUnit?.AttachEntityId ?? 0,
            ChangeReason = SceneEntityBuffChangeType.AddMazebuff,
            Duration = refreshMazeBuffTime.LifeTime.GetValue() == 0 ? -1 : refreshMazeBuffTime.LifeTime.GetValue()
        };

        foreach (var targetEntity in targetEntities)
        {
            if (targetEntity is not EntityMonster monster) continue;

            await monster.AddBuff(buff);
        }

        return null;
    }

    public async ValueTask<object?> TriggerHitProp(TaskConfigInfo act, List<BaseGameEntity> targetEntities,
        EntitySummonUnit? summonUnit)
    {
        foreach (var targetEntity in targetEntities)
        {
            if (targetEntity is not EntityProp prop) continue;

            await prop.Scene.RemoveEntity(prop);
            if (prop.Excel.IsMpRecover)
            {
                await prop.Scene.Player.LineupManager!.GainMp(2, true, SyncLineupReason.SyncReasonMpAddPropHit);
            }
            else if (prop.Excel.IsHpRecover)
            {
                prop.Scene.Player.LineupManager!.GetCurLineup()!.Heal(2000, false);
                await prop.Scene.Player.SendPacket(
                    new PacketSyncLineupNotify(prop.Scene.Player.LineupManager!.GetCurLineup()!));
            }
            else
            {
                await prop.Scene.Player.InventoryManager!.HandlePlaneEvent(prop.PropInfo.EventID);
            }

            // Rogue module removed in current baseline.
        }

        return null;
    }

    #endregion
}
