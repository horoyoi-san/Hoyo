using System.Collections.Concurrent;
using March7thHoney.Data;
using March7thHoney.Data.Config;
using March7thHoney.Data.Config.Task;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Drop;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Game.Task.AvatarTask;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Battle;

public class SceneSkillManager(PlayerInstance player) : BasePlayerManager(player)
{
    private const int SpeedDestructEventId = 10003;
    private const int SpeedDestructBuffId = 2041101;
    private const int SpeedDestructBuffDurationSec = 15;

    public async ValueTask<SkillResultData> OnCast(SceneCastSkillCsReq req)
    {
        Player.TaskManager!.AbilityLevelTask.SummonAttackDetectBuffs.Clear();
        var handledDestruct = await HandleDestructPropDrops(req);

        // get entities
        List<BaseGameEntity> targetEntities = []; // enemy
        BaseGameEntity? attackEntity; // caster
        List<int> addEntityIds = [];
        foreach (var id in req.AssistMonsterEntityIdList)
            if (Player.SceneInstance!.Entities.TryGetValue((int)id, out var v))
            {
                targetEntities.Add(v);
                addEntityIds.Add((int)id);
            }

        foreach (var info in req.AssistMonsterEntityInfo)
        foreach (var id in info.EntityIdList)
        {
            if (addEntityIds.Contains((int)id)) continue;
            if (Player.SceneInstance!.Entities.TryGetValue((int)id, out var v))
            {
                targetEntities.Add(v);
                addEntityIds.Add((int)id);
            }
        }

        var attackedEntity = Player.SceneInstance!.Entities.GetValueOrDefault((int)req.AttackedByEntityId);
        if (targetEntities.Count == 0 && attackedEntity is EntityMonster directTarget)
        {
            targetEntities.Add(directTarget);
            addEntityIds.Add(directTarget.EntityId);
            attackEntity = Player.SceneInstance.AvatarInfo.GetValueOrDefault((int)req.CastEntityId)
                           ?? Player.SceneInstance.AvatarInfo.GetValueOrDefault(Player.SceneInstance.LeaderEntityId)
                           ?? Player.SceneInstance.AvatarInfo.Values.FirstOrDefault();
        }
        else
        {
            attackEntity = attackedEntity;
        }

        if (attackEntity == null)
            return handledDestruct
                ? new SkillResultData(Retcode.RetSucc)
                : new SkillResultData(Retcode.RetSceneEntityNotExist);

        await TriggerAttackDetectSummons(targetEntities);

        // get ability file
        var abilities = GetAbilityConfig(attackEntity);

        // Fallback path for avatars whose ConfigAdventureAbility/LocalPlayer/<Name>_00_Ability.json
        // hasn't been dumped from the client yet (e.g. brand-new 4.3 characters before dim picks them up).
        // We can't run the ability's OnStart task chain without that file, but the cast itself can still
        // resolve: trigger battle when assist monsters were reported by the client, and let the
        // downstream maze-buff backfill (below) bind the avatar's SkillMaze maze buffs. No avatar / monster
        // id is hard-coded — selection is purely data-driven from req.AssistMonster* and entity types.
        AbilityLevelResult res;
        if (abilities == null || abilities.AbilityList.Count < 1)
        {
            res = await BuildAbilitylessCast(attackEntity, targetEntities, req);
        }
        else
        {
            var abilityName = !string.IsNullOrEmpty(req.MazeAbilityStr) ? req.MazeAbilityStr :
                req.SkillIndex == 0 ? "NormalAtk01" : "MazeSkill";
            var targetAbility = abilities.AbilityList.Find(x => x.Name.Contains(abilityName));
            if (targetAbility == null)
            {
                targetAbility = abilities.AbilityList.FirstOrDefault();
                if (targetAbility == null)
                    return new SkillResultData(Retcode.RetMazeNoAbility);
            }

            // execute ability
            res = await Player.TaskManager!.AbilityLevelTask.TriggerTasks(abilities, targetAbility.OnStart,
                attackEntity, targetEntities, req);
        }

        // check if avatar execute
        if (attackEntity is AvatarSceneInfo) await Player.SceneInstance!.OnUseSkill(req);

        // backfill character maze buffs for techniques whose ability JSON spawns
        // a summon unit instead of calling AddMazeBuff (e.g. Dahlia 1321 -> 132101,
        // Silver Wolf lv.999 1506 -> 150601 which uses CharacterSkillAdv binding).
        // candidates = AvatarMazeBuff entries bound to the SkillMaze slot via either
        // CharacterSkill or CharacterSkillAdv. If the ability JSON already added one
        // of them, skip entirely; otherwise apply the canonical primary entry
        // (UseType SummonUnit/AddBattleBuff/TriggerBattle) so battleInfo.buffList
        // picks it up. This keeps multi-entry avatars (Cyrene, Cerydra, Robin...)
        // from receiving stray summon/listener buffs.
        if (req.SkillIndex == 1 && attackEntity is AvatarSceneInfo casterAvatar)
        {
            // 多命途角色按当前命途 id 查秘技 buff (8005/1224), owner 仍用基础 id 解析槽位
            var pathAvatarId = casterAvatar.AvatarInfo.AvatarId;
            var candidates = GameData.MazeBuffData
                .Where(kvp => kvp.Key / 10 / 100 == pathAvatarId
                              && kvp.Value.MazeBuffType == "Character"
                              && (kvp.Value.InBattleBindingType == "CharacterSkill"
                                  || kvp.Value.InBattleBindingType == "CharacterSkillAdv")
                              && kvp.Value.InBattleBindingKey == "SkillMaze")
                .Select(kvp => (BuffId: kvp.Key / 10, Excel: kvp.Value))
                .ToList();

            // drop buffs this avatar's ability already delivers to enemies via attack-detect; they must not also be applied to the caster (e.g. Gilgamesh 150901 would freeze the caster)
            var detectBuffs = Player.TaskManager!.AbilityLevelTask.SummonAttackDetectBuffs;
            candidates = candidates.Where(c => !detectBuffs.Contains(c.BuffId)).ToList();

            // 敌方时停效果只能由领域触发器投放, 禁止回填到施法者
            candidates = candidates.Where(c =>
                !GameData.AdventureModifierData.TryGetValue(c.Excel.ModifierName, out var modifier)
                || !modifier.BehaviorFlagList.Contains("TimeLock", StringComparer.OrdinalIgnoreCase)).ToList();

            var alreadyApplied = candidates.Any(c =>
                casterAvatar.BuffList.Any(b => b.BuffId == c.BuffId));

            if (!alreadyApplied)
            {
                var primary = candidates.FirstOrDefault(c =>
                    c.Excel.UseType is "SummonUnit" or "AddBattleBuff" or "TriggerBattle");
                if (primary.BuffId != 0)
                    await casterAvatar.AddBuff(new SceneBuff(primary.BuffId, primary.Excel.Lv, casterAvatar.AvatarInfo.BaseAvatarId));
            }

            // 队友秘技充能类监听 buff(如三月七·巡猎 122401): 数据驱动识别, 队友每开一次秘技给携带者叠 1 层封顶
            await StackTeammateTechniqueBuffs(casterAvatar);
        }

        return new SkillResultData(Retcode.RetSucc, res.Instance, res.BattleInfos);
    }

    private async ValueTask TriggerAttackDetectSummons(List<BaseGameEntity> targetEntities)
    {
        if (Player.SceneInstance == null || targetEntities.Count == 0) return;

        foreach (var summon in Player.SceneInstance.SummonUnit.Values)
        {
            var center = summon.Motion.Pos;
            if (center == null) continue;

            foreach (var trigger in summon.TriggerList)
            {
                if (!trigger.OnTriggerEnter.Any(x => x is AddMazeBuff)) continue;

                var radius = trigger.Radius.GetValue() * 1000L;
                if (radius <= 0) continue;

                var targetIds = targetEntities.OfType<EntityMonster>()
                    .Where(x => x.IsAlive && GetDistanceSquared(x.Position, center) <= radius * radius)
                    .Select(x => (uint)x.EntityId)
                    .ToList();
                if (targetIds.Count > 0)
                    await Player.SceneInstance.TriggerSummonUnit(summon.EntityId, trigger.TriggerName, targetIds);
            }
        }
    }

    private static long GetDistanceSquared(Position position, Vector center)
    {
        var x = (long)position.X - center.X;
        var z = (long)position.Z - center.Z;
        return x * x + z * z;
    }

    private async ValueTask<bool> HandleDestructPropDrops(SceneCastSkillCsReq req)
    {
        if (Player.SceneInstance == null || Player.InventoryManager == null) return false;

        var handled = false;

        HashSet<int> hitEntityIds = [(int)req.AttackedByEntityId];
        foreach (var id in req.AssistMonsterEntityIdList)
            hitEntityIds.Add((int)id);

        foreach (var info in req.AssistMonsterEntityInfo)
        foreach (var id in info.EntityIdList)
            hitEntityIds.Add((int)id);

        foreach (var entityId in hitEntityIds)
        {
            if (!Player.SceneInstance.Entities.TryGetValue(entityId, out var entity)) continue;
            if (entity is not EntityProp prop) continue;
            if (prop.Excel.PropType != PropTypeEnum.PROP_DESTRUCT) continue;
            handled = true;

            if (prop.Excel.IsMpRecover)
            {
                await Player.LineupManager!.GainMp(2, true, SyncLineupReason.SyncReasonMpAddPropHit);
            }
            else if (prop.Excel.IsHpRecover)
            {
                Player.LineupManager!.GetCurLineup()!.Heal(2000, false);
                await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager.GetCurLineup()!));
            }

            if (prop.PropInfo.EventID > 0)
            {
                await ApplyPropEventEffect(prop, req);

                var eventItems = BuildPlaneEventRewards(prop.PropInfo.EventID);
                if (eventItems.Count > 0)
                {
                    await Player.InventoryManager.AddItems(eventItems);
                }
                else
                {
                    // Client still expects a plane-event notify for special destructibles with no item reward.
                    await Player.SendPacket(new PacketScenePlaneEventScNotify(new ItemList()));
                }
            }

            if (prop.PropInfo.ChestID > 0)
            {
                var items = DropService.CalculateDropsFromProp(prop.PropInfo.ChestID);
                if (items.Count > 0) await Player.InventoryManager.AddItems(items);
            }

            // Destruct props should disappear from scene instead of being refreshed as opened state.
            await Player.SceneInstance.RemoveEntity(prop, false);
            await Player.SendPacket(new PacketSceneGroupRefreshScNotify(
                Player,
                null,
                prop,
                SceneGroupRefreshType.Afibfmafncc));

            // Persist as opened for non-reset groups so relog won't respawn it.
            if (prop.Group.SaveType != SaveTypeEnum.Reset)
                Player.SetScenePropData(Player.SceneInstance.FloorId, prop.GroupId, prop.PropInfo.ID, PropStateEnum.Open);
        }

        return handled;
    }

    private async ValueTask ApplyPropEventEffect(EntityProp prop, SceneCastSkillCsReq req)
    {
        if (prop.PropInfo.EventID != SpeedDestructEventId) return;
        if (Player.SceneInstance == null) return;

        var casterEntity = Player.SceneInstance.Entities.GetValueOrDefault((int)req.AttackedByEntityId);
        if (casterEntity is not AvatarSceneInfo casterAvatar) return;

        await casterAvatar.AddBuff(new SceneBuff(
            SpeedDestructBuffId,
            1,
            casterAvatar.AvatarInfo.BaseAvatarId,
            SpeedDestructBuffDurationSec));
    }

    private List<ItemData> BuildPlaneEventRewards(int eventId)
    {
        List<ItemData> items = [];
        GameData.PlaneEventData.TryGetValue(eventId * 10 + Player.Data.WorldLevel, out var planeEvent);
        if (planeEvent == null) return items;

        AddRewardItems(planeEvent.Reward, items);
        foreach (var dropRewardId in planeEvent.DropList) AddRewardItems(dropRewardId, items);

        return items;
    }

    private static void AddRewardItems(int rewardId, List<ItemData> items)
    {
        GameData.RewardDataData.TryGetValue(rewardId, out var reward);
        if (reward == null) return;

        if (reward.Hcoin > 0)
            items.Add(new ItemData
            {
                ItemId = 1,
                Count = reward.Hcoin
            });

        foreach (var (itemId, count) in reward.GetItems())
            items.Add(new ItemData
            {
                ItemId = itemId,
                Count = count
            });
    }

    // Fallback for avatars missing an AdventureAbility JSON: mirror the minimal contract that
    // AbilityLevelTask.AdventureTriggerAttack would have produced — open-world battle is triggered
    // when the client reported assist monsters (普攻命中怪), and HitMonsterInstance entries are
    // emitted for every reported entity so the client knows which ones to roll into the battle.
    // No avatar / monster / entity id is hard-coded: selection is purely from req + entity types.
    private async ValueTask<AbilityLevelResult> BuildAbilitylessCast(
        BaseGameEntity attackEntity,
        List<BaseGameEntity> targetEntities,
        SceneCastSkillCsReq req)
    {
        if (targetEntities.Count == 0)
            return new AbilityLevelResult();

        // A projectile/field technique that runs out its lifetime (chains / persistent
        // field, e.g. Gilgamesh) reports SCENE_CAST_SKILL_PROJECTILE_LIFETIME_FINISH and must
        // NOT start an open-world battle: the client predicts a summon, not combat, and
        // rejects an unexpected battle with "技能使用失败". An attack that actually connected
        // (normal atk, or an attack technique like Himeko) reports only ..._HIT and still
        // engages. Splitting on this client tag keeps attack vs summon techniques correct
        // without an ability JSON and without hard-coding any avatar id.
        if (req.SkillExtraTags.Contains(SkillExtraTag.SceneCastSkillProjectileLifetimeFinish))
            return new AbilityLevelResult();

        var battleInfos = new List<HitMonsterInstance>();
        foreach (var entity in targetEntities)
        {
            var type = entity is EntityMonster { IsAlive: false }
                ? MonsterBattleType.DirectDieSkipBattle
                : MonsterBattleType.TriggerBattle;
            battleInfos.Add(new HitMonsterInstance(entity.EntityId, type));
        }

        var hasLiveMonster = targetEntities.OfType<EntityMonster>().Any(x => x.IsAlive);
        BattleInstance? instance = null;
        if (hasLiveMonster)
            instance = await Player.BattleManager!.StartBattle(attackEntity, targetEntities, req.SkillIndex == 1);

        return new AbilityLevelResult(instance, battleInfos);
    }

    private AdventureAbilityConfigListInfo? GetAbilityConfig(BaseGameEntity entity)
    {
        if (entity is EntityMonster monster)
            return GameData.AdventureAbilityConfigListData.GetValueOrDefault(monster.MonsterData.ID);

        if (entity is AvatarSceneInfo avatar)
            if (GameData.AvatarConfigData.TryGetValue(avatar.AvatarInfo.AvatarId, out var excel))
                return GameData.AdventureAbilityConfigListData.GetValueOrDefault(excel.AdventurePlayerID);

        return null;
    }

    // 某角色"队友秘技自叠充能"buff 的缓存: avatarId -> [(buffId, 最大层级)], 数据驱动, 仅命中带监听器的角色(当前唯三月七 122401)
    private static readonly ConcurrentDictionary<int, List<(int BuffId, int MaxLv)>> TechniqueListenerCache = new();

    // 队友(非施法者本人)开秘技后, 给场上携带"队友秘技自叠"监听 buff 的角色叠层(封顶), 复用 SceneBuff->ApplyBuff->战斗 通路
    private async ValueTask StackTeammateTechniqueBuffs(AvatarSceneInfo caster)
    {
        foreach (var owner in Player.SceneInstance!.AvatarInfo.Values)
        {
            if (owner.AvatarInfo.BaseAvatarId == caster.AvatarInfo.BaseAvatarId) continue;
            foreach (var (buffId, maxLv) in GetTeammateTechniqueListenerBuffs(owner.AvatarInfo.AvatarId))
            {
                var prev = owner.BuffList.Find(x => x.BuffId == buffId)?.BuffLevel ?? 0;
                var lv = Math.Min(prev + 1, maxLv);
                if (lv <= prev) continue;
                owner.BuffList.RemoveAll(x => x.BuffId == buffId);
                var buff = new SceneBuff(buffId, lv, owner.AvatarInfo.BaseAvatarId);
                buff.DynamicValues["#ADF_1"] = lv;
                buff.DynamicValues["#ADF_2"] = maxLv;
                owner.BuffList.Add(buff);
                await Player.SendPacket(new PacketSyncEntityBuffChangeListScNotify(owner, buff));
            }
        }
    }

    // 数据驱动: 角色的 CharacterAbility maze buff, 其 modifier 的 OnAfterLocalPlayerUseSkill 会自加同一 buff = "队友秘技自叠充能"
    private static List<(int BuffId, int MaxLv)> GetTeammateTechniqueListenerBuffs(int avatarId)
    {
        return TechniqueListenerCache.GetOrAdd(avatarId, id =>
        {
            var result = new List<(int, int)>();
            var seen = new HashSet<int>();
            foreach (var (key, excel) in GameData.MazeBuffData)
            {
                if (key / 10 / 100 != id) continue;
                if (excel.MazeBuffType != "Character" || excel.InBattleBindingType != "CharacterAbility") continue;
                var buffId = key / 10;
                if (!seen.Add(buffId) || string.IsNullOrEmpty(excel.ModifierName)) continue;
                if (!GameData.AdventureModifierData.TryGetValue(excel.ModifierName, out var modifier)) continue;
                if (!TaskListAddsMazeBuff(modifier.OnAfterLocalPlayerUseSkill, buffId)) continue;
                result.Add((buffId, GameData.MazeBuffData.Values.Where(x => x.ID == buffId).Max(x => x.Lv)));
            }

            return result;
        });
    }

    // 递归判断任务列表(含 PredicateTaskList 成功/失败分支)里是否有对该 buffId 的 AddMazeBuff
    private static bool TaskListAddsMazeBuff(List<TaskConfigInfo> tasks, int buffId)
    {
        foreach (var task in tasks)
        {
            if (task is AddMazeBuff add && add.ID == buffId) return true;
            if (task is PredicateTaskList pred &&
                (TaskListAddsMazeBuff(pred.SuccessTaskList, buffId) || TaskListAddsMazeBuff(pred.FailedTaskList, buffId)))
                return true;
        }

        return false;
    }
}

public record SkillResultData(
    Retcode RetCode,
    BattleInstance? Instance = null,
    List<HitMonsterInstance>? TriggerBattleInfos = null);
