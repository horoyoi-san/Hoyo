using March7thHoney.Data;
using March7thHoney.Data.Config.Scene;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Avatar;
using March7thHoney.Enums.Avatar;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Activity.Loaders;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene.Component;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Scene;

public partial class SceneInstance
{
    #region SummonUnit

    public async ValueTask<Retcode> TriggerSummonUnit(int entityId, string triggerName, List<uint> targetIds)
    {
        var summonUnit = SummonUnit.Values.FirstOrDefault(x => x.EntityId == entityId);
        if (summonUnit == null) return Retcode.RetSceneEntityNotExist;

        // check trigger
        var trigger = summonUnit.TriggerList.Find(x => x.TriggerName == triggerName);
        if (trigger == null) return Retcode.RetSceneUseSkillFail;

        await Player.SendPacket(
            new PacketRefreshTriggerByClientScNotify(triggerName, (uint)summonUnit.EntityId, targetIds));
        // check target

        List<BaseGameEntity> targetEnter = [];
        List<BaseGameEntity> targetExit = [];
        HashSet<int> currentTargetIds = [];
        foreach (var targetId in targetIds)
        {
            if (!Entities.TryGetValue((int)targetId, out var entity)) continue;
            EntityMonster? monster = null;
            EntityProp? prop = null;

            switch (entity)
            {
                case EntityMonster m:
                    monster = m;
                    break;
                case EntityProp p:
                    prop = p;
                    break;
            }

            if (monster != null)
            {
                if (!monster.IsAlive) continue;
                currentTargetIds.Add(monster.EntityId);
                if (summonUnit.CaughtEntityIds.Contains(monster.EntityId)) continue;

                summonUnit.CaughtEntityIds.Add(monster.EntityId);
                targetEnter.Add(monster);
            }

            if (prop != null)
            {
                currentTargetIds.Add(prop.EntityId);
                if (summonUnit.CaughtEntityIds.Contains(prop.EntityId)) continue;

                summonUnit.CaughtEntityIds.Add(prop.EntityId);
                targetEnter.Add(prop);
            }
        }

        foreach (var gameEntity in Entities.Values)
        {
            if (gameEntity is not EntityMonster monster) continue;

            if (summonUnit.CaughtEntityIds.Contains(monster.EntityId) && !currentTargetIds.Contains(monster.EntityId))
            {
                summonUnit.CaughtEntityIds.Remove(monster.EntityId);
                targetExit.Add(monster);
            }
        }

        if (targetEnter.Count > 0)
        {
            // enter
            var config = trigger.OnTriggerEnter;

            await Player.TaskManager!.SummonUnitLevelTask.TriggerTasks(config, targetEnter, summonUnit);
        }

        if (targetExit.Count <= 0) return Retcode.RetSucc;
        {
            // enter
            var config = trigger.OnTriggerExit;

            await Player.TaskManager!.SummonUnitLevelTask.TriggerTasks(config, targetExit, summonUnit);
        }

        return Retcode.RetSucc;
    }

    public async ValueTask RemoveSummonUnitById(int summonUnitId)
    {
        var summonUnit = SummonUnit.FirstOrDefault(x => x.Value.SummonUnitId == summonUnitId);
        if (summonUnit.Value == null) return;

        await Player.SendPacket(new PacketSceneGroupRefreshScNotify(Player, null, summonUnit.Value));

        SummonUnit.Remove(summonUnit.Key);
        Entities.Remove(summonUnit.Value.EntityId);

        foreach (var entity in Entities.Values.Where(x => x is EntityMonster))
        {
            var monster = entity as EntityMonster;
            List<SceneBuff> buffList = [.. monster!.BuffList];
            foreach (var sceneBuff in buffList)
                if (sceneBuff.SummonUnitEntityId == summonUnit.Value.EntityId)
                    // clear old buff
                    await monster.RemoveBuff(sceneBuff.BuffId);
        }
    }

    public async ValueTask OnEnterStage()
    {
        List<BaseGameEntity> removeEntities = [];
        foreach (var unit in SummonUnit.ToArray())
        {
            if (!GameData.SummonUnitDataData.TryGetValue(unit.Value.SummonUnitId, out var excel)) continue;
            if (!excel.DestroyOnEnterBattle) continue;

            foreach (var entity in Entities.Values.Where(x => x is EntityMonster))
            {
                var monster = entity as EntityMonster;
                List<SceneBuff> buffList = [.. monster!.BuffList];
                foreach (var sceneBuff in buffList)
                    if (sceneBuff.SummonUnitEntityId == unit.Value.EntityId)
                        // clear old buff
                        await monster.RemoveBuff(sceneBuff.BuffId);
            }

            removeEntities.Add(unit.Value);
            SummonUnit.Remove(unit.Key);
            Entities.Remove(unit.Value.EntityId);
        }

        await Player.SendPacket(new PacketSceneGroupRefreshScNotify(Player, [], removeEntities));
    }

    public async ValueTask OnHeartBeat()
    {
        foreach (var gameEntity in Entities.Values.Clone().Where(x => x is EntityMonster).OfType<EntityMonster>())
        foreach (var sceneBuff in gameEntity.BuffList.Clone().Where(sceneBuff => sceneBuff.IsExpired()))
            await gameEntity.RemoveBuff(sceneBuff.BuffId);

        foreach (var gameEntity in AvatarInfo.Values.Clone())
        foreach (var sceneBuff in gameEntity.BuffList.Clone().Where(sceneBuff => sceneBuff.IsExpired()))
            await gameEntity.RemoveBuff(sceneBuff.BuffId);

        foreach (var unitValue in SummonUnit.Values)
        {
            if (unitValue.LifeTimeMs == -1) continue;
            var endTime = unitValue.CreateTimeMs + unitValue.LifeTimeMs;

            if (endTime < Extensions.GetUnixMs()) await RemoveSummonUnitById(unitValue.SummonUnitId);
        }
    }

    #endregion
}
