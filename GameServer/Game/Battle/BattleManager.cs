using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Game.GridFight;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.Battle;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Battle;

public class BattleManager(PlayerInstance player) : BasePlayerManager(player)
{
    public StageConfigExcel? NextBattleStageConfig { get; set; }
    public List<int> NextBattleMonsterIds { get; set; } = [];

    public async ValueTask<BattleInstance?> StartBattle(BaseGameEntity attackEntity,
        List<BaseGameEntity> targetEntityList,
        bool isSkill)
    {
        if (Player.BattleInstance != null) return Player.BattleInstance;
        var targetList = new List<EntityMonster>();
        var avatarList = new List<AvatarSceneInfo>();
        var propList = new List<EntityProp>();
        Player.SceneInstance!.AvatarInfo.TryGetValue(attackEntity.EntityId, out var castAvatar);

        if (castAvatar != null)
        {
            foreach (var entity in targetEntityList)
                switch (entity)
                {
                    case EntityMonster monster:
                        targetList.Add(monster);
                        break;
                    case EntityProp prop:
                        propList.Add(prop);
                        break;
                }
        }
        else
        {
            var isAmbushed =
                targetEntityList.Any(entity => Player.SceneInstance!.AvatarInfo.ContainsKey(entity.EntityId));

            if (!isAmbushed) return null;

            var monsterEntity = Player.SceneInstance!.Entities[attackEntity.EntityId];
            if (monsterEntity is EntityMonster monster) targetList.Add(monster);
        }

        if (targetList.Count == 0 && propList.Count == 0) return null;

        foreach (var prop in propList)
        {
            await Player.SceneInstance!.RemoveEntity(prop);
            if (prop.Excel.IsMpRecover)
            {
                await Player.LineupManager!.GainMp(2, true, SyncLineupReason.SyncReasonMpAddPropHit);
            }
            else if (prop.Excel.IsHpRecover)
            {
                Player.LineupManager!.GetCurLineup()!.Heal(2000, false);
                await Player.SendPacket(new PacketSyncLineupNotify(Player.LineupManager!.GetCurLineup()!));
            }
            else if (prop.PropInfo.Name == "SpeedDestruct")
            {
                var avatar = Player.SceneInstance!.AvatarInfo.Values.ToList().RandomElement();
                await avatar.AddBuff(new SceneBuff(2041101, 1, -1, 15));
            }
            else
            {
                await Player.InventoryManager!.HandlePlaneEvent(prop.PropInfo.EventID);
            }

        }

        if (targetList.Count > 0)
        {
            var triggerBattle = targetList.Any(target => target.IsAlive);

            if (!triggerBattle) return null;

            BattleInstance battleInstance =
                new(Player, Player.LineupManager!.GetCurLineup()!, targetList.Where(x => x.IsAlive).ToList())
                {
                    WorldLevel = Player.Data.WorldLevel
                };

            if (NextBattleStageConfig != null)
            {
                battleInstance =
                    new BattleInstance(Player, Player.LineupManager!.GetCurLineup()!, [NextBattleStageConfig])
                    {
                        WorldLevel = Player.Data.WorldLevel
                    };
                NextBattleStageConfig = null;
            }

            avatarList.AddRange(Player.LineupManager!.GetCurLineup()!.BaseAvatars!
                .Select(item =>
                    Player.SceneInstance!.AvatarInfo.Values.FirstOrDefault(x =>
                        x.AvatarInfo.BaseAvatarId == item.BaseAvatarId))
                .OfType<AvatarSceneInfo>());

            MazeBuff? mazeBuff = null;
            if (castAvatar != null)
            {
                var index = battleInstance.Lineup.BaseAvatars!.FindIndex(x =>
                    x.BaseAvatarId == castAvatar.AvatarInfo.BaseAvatarId);
                GameData.AvatarConfigData.TryGetValue(castAvatar.AvatarInfo.AvatarId, out var avatarExcel);
                if (avatarExcel != null)
                {
                    mazeBuff = new MazeBuff((int)avatarExcel.DamageType, 1, index);
                    mazeBuff.DynamicValues.Add("SkillIndex", isSkill ? 2 : 1);
                }
            }
            else
            {
                mazeBuff = new MazeBuff(GameConstants.AMBUSH_BUFF_ID, 1, -1)
                {
                    WaveFlag = 1
                };
            }

            if (mazeBuff != null && mazeBuff.BuffID != 0) // avoid adding a buff with ID 0
                battleInstance.Buffs.Add(mazeBuff);

            battleInstance.AvatarInfo = avatarList;

            // call battle start
            Player.ChallengeManager!.ChallengeInstance?.OnBattleStart(battleInstance);
            Player.QuestManager!.OnBattleStart(battleInstance);

            Player.BattleInstance = battleInstance;


            return battleInstance;
        }

        return null;
    }

    public async ValueTask StartStage(int eventId)
    {
        if (Player.BattleInstance != null)
        {
            await Player.SendPacket(new PacketSceneEnterStageScRsp(Player.BattleInstance));
            return;
        }

        GameData.StageConfigData.TryGetValue(eventId, out var stageConfig);
        if (stageConfig == null)
        {
            GameData.StageConfigData.TryGetValue(eventId * 10 + Player.Data.WorldLevel, out stageConfig);
            if (stageConfig == null)
            {
                await Player.SendPacket(new PacketSceneEnterStageScRsp());
                return;
            }
        }

        if (NextBattleStageConfig != null)
        {
            stageConfig = NextBattleStageConfig;
            NextBattleStageConfig = null;
        }

        BattleInstance battleInstance = new(Player, Player.LineupManager!.GetCurLineup()!, [stageConfig])
        {
            WorldLevel = Player.Data.WorldLevel,
            EventId = eventId
        };

        var avatarList = Player.LineupManager!.GetCurLineup()!.BaseAvatars!.Select(item =>
                Player.SceneInstance!.AvatarInfo.Values.FirstOrDefault(x => x.AvatarInfo.BaseAvatarId == item.BaseAvatarId))
            .OfType<AvatarSceneInfo>().ToList();

        battleInstance.AvatarInfo = avatarList;

        // call battle start
        Player.ChallengeManager!.ChallengeInstance?.OnBattleStart(battleInstance);
        Player.QuestManager!.OnBattleStart(battleInstance);

        Player.BattleInstance = battleInstance;


        await Player.SendPacket(new PacketSceneEnterStageScRsp(battleInstance));
        Player.SceneInstance?.OnEnterStage();
    }

    public async ValueTask<BattleInstance?> StartCocoonStage(int cocoonId, int wave, int worldLevel)
    {
        if (Player.BattleInstance != null) return null;

        if (Player.CalyxOverrideManager?.IsActive == true)
            return await Player.CalyxOverrideManager.BuildOverrideBattle(cocoonId, wave, worldLevel);

        GameData.CocoonConfigData.TryGetValue(cocoonId * 100 + worldLevel, out var config);
        if (config == null) return null;

        wave = Math.Max(wave, 1);

        var cost = config.StaminaCost * wave;
        if (Player.Data.Stamina < cost) return null;

        List<StageConfigExcel> stageConfigExcels = [];
        for (var i = 0; i < wave; i++)
        {
            var stageId = config.StageIDList.RandomElement();
            GameData.StageConfigData.TryGetValue(stageId, out var stageConfig);
            if (stageConfig == null) continue;

            stageConfigExcels.Add(stageConfig);
        }

        if (stageConfigExcels.Count == 0) return null;

        BattleInstance battleInstance = new(Player, Player.LineupManager!.GetCurLineup()!, stageConfigExcels)
        {
            StaminaCost = cost,
            WorldLevel = config.WorldLevel,
            CocoonWave = wave,
            MappingInfoId = config.MappingInfoID
        };

        if (NextBattleStageConfig != null)
        {
            battleInstance = new BattleInstance(Player, Player.LineupManager!.GetCurLineup()!, [NextBattleStageConfig])
            {
                WorldLevel = Player.Data.WorldLevel
            };
            NextBattleStageConfig = null;
        }

        var avatarList = Player.LineupManager!.GetCurLineup()!.BaseAvatars!.Select(item =>
                Player.SceneInstance!.AvatarInfo.Values.FirstOrDefault(x => x.AvatarInfo.BaseAvatarId == item.BaseAvatarId))
            .OfType<AvatarSceneInfo>().ToList();

        battleInstance.AvatarInfo = avatarList;

        Player.BattleInstance = battleInstance;
        Player.QuestManager!.OnBattleStart(battleInstance);

        await ValueTask.CompletedTask;
        return battleInstance;
    }

    public async ValueTask<BattleInstance?> StartFarmElementStage(FarmElementConfigExcel config)
    {
        if (Player.BattleInstance != null) return null;
        if (Player.Data.Stamina < config.StaminaCost) return null;

        GameData.StageConfigData.TryGetValue(config.StageID, out var stageConfig);
        if (stageConfig == null) return null;

        BattleInstance battleInstance = new(Player, Player.LineupManager!.GetCurLineup()!, [stageConfig])
        {
            StaminaCost = config.StaminaCost,
            WorldLevel = config.WorldLevel,
            CocoonWave = 1,
            MappingInfoId = config.MappingInfoID
        };

        var avatarList = Player.LineupManager!.GetCurLineup()!.BaseAvatars!.Select(item =>
                Player.SceneInstance!.AvatarInfo.Values.FirstOrDefault(x => x.AvatarInfo.BaseAvatarId == item.BaseAvatarId))
            .OfType<AvatarSceneInfo>().ToList();

        battleInstance.AvatarInfo = avatarList;

        Player.BattleInstance = battleInstance;
        Player.QuestManager!.OnBattleStart(battleInstance);

        await ValueTask.CompletedTask;
        return battleInstance;
    }

    public (Retcode, BattleInstance?) StartBattleCollege(int collegeId)
    {
        if (Player.BattleInstance != null) return (Retcode.RetInBattleNow, null);

        GameData.BattleCollegeConfigData.TryGetValue(collegeId, out var config);
        if (config == null) return (Retcode.RetFail, null);

        var stageId = config.StageID;

        GameData.StageConfigData.TryGetValue(stageId, out var stageConfig);
        if (stageConfig == null) return (Retcode.RetStageConfigNotExist, null);

        BattleInstance battleInstance = new(Player, Player.LineupManager!.GetCurLineup()!, [stageConfig])
        {
            WorldLevel = Player.Data.WorldLevel,
            CollegeConfigExcel = config,
            AvatarInfo = []
        };

        // call battle start
        Player.ChallengeManager!.ChallengeInstance?.OnBattleStart(battleInstance);
        Player.QuestManager!.OnBattleStart(battleInstance);

        Player.BattleInstance = battleInstance;

        return (Retcode.RetSucc, battleInstance);
    }

    public async ValueTask EndBattle(PVEBattleResultCsReq req)
    {

        if (Player.BattleInstance == null)
        {
            await Player.SendPacket(new PacketPVEBattleResultScRsp());
            return;
        }

        Player.BattleInstance.BattleEndStatus = req.EndStatus;
        var battle = Player.BattleInstance;
        var updateStatus = true;
        var teleportToAnchor = false;
        var isActiveFarmBattle = false;
        var minimumHp = 0;
        var dropItems = new List<ItemData>();
        if (battle.GridFightContext != null)
            updateStatus = false;
        else switch (req.EndStatus)
        {
            case BattleEndStatus.BattleEndWin:
                if (battle.EntityMonsters.Count == 0)
                    battle.EntityMonsters = ResolveSceneMonstersByStageId(battle.StageId);

                // Drops
                var farmEntityId = (int)Player.ActiveFarmElementEntityId;
                isActiveFarmBattle = farmEntityId != 0 &&
                                     battle.EntityMonsters.Any(monster => monster.EntityId == farmEntityId);
                foreach (var monster in battle.EntityMonsters)
                {
                    var keepInScene = farmEntityId != 0 && monster.EntityId == farmEntityId;
                    dropItems.AddRange(await monster.Kill(false, removeFromScene: !keepInScene));
                }
                // Spend stamina
                if (battle.StaminaCost > 0) await Player.SpendStamina(battle.StaminaCost);
                break;
            case BattleEndStatus.BattleEndLose:
                // Set avatar hp to 20% if the player's party is downed
                minimumHp = 2000;
                teleportToAnchor = true;
                break;
            default:
                teleportToAnchor = true;
                if (battle.CocoonWave > 0) teleportToAnchor = false;
                updateStatus = false;
                break;
        }

        if (battle.CalyxOverride?.HasLineupOverride == true)
            updateStatus = false;

        if (updateStatus)
        {
            var lineup = Player.LineupManager!.GetCurLineup()!;
            // Update battle status
            foreach (var avatar in req.Stt.BattleAvatarList)
            {
                BaseAvatarInfo? avatarInstance = Player.AvatarManager!.GetFormalAvatar((int)avatar.Id);
                var prop = avatar.AvatarStatus;
                var curHp = (int)Math.Max(Math.Round(prop.LeftHp / prop.MaxHp * 10000), minimumHp);
                var curSp = (int)prop.LeftSp * 100;
                if (avatarInstance == null)
                {
                    avatarInstance = Player.AvatarManager!.GetTrialAvatar((int)avatar.Id);
                    avatarInstance?.SetCurHp(curHp, lineup.LineupType != 0);
                    avatarInstance?.SetCurSp(curSp, lineup.LineupType != 0);
                }
                else
                {
                    avatarInstance.SetCurHp(curHp, lineup.LineupType != 0);
                    avatarInstance.SetCurSp(curSp, lineup.LineupType != 0);
                }
            }

            await Player.SendPacket(new PacketSyncLineupNotify(lineup));
        }

        if (teleportToAnchor)
        {
            var anchorProp = Player.SceneInstance?.GetNearestSpring(long.MaxValue);
            if (anchorProp != null)
            {
                var anchor = Player.SceneInstance?.FloorInfo?.GetAnchorInfo(
                    anchorProp.PropInfo.AnchorGroupID,
                    anchorProp.PropInfo.AnchorID
                );
                if (anchor != null) await Player.MoveTo(anchor.ToPositionProto());
            }
        }
        else if (isActiveFarmBattle && Player.FarmElementReturnPos != null)
        {
            await Player.MoveTo(Player.FarmElementReturnPos, Player.FarmElementReturnRot ?? Player.Data.Rot!);
        }

        // call battle end
        battle.MonsterDropItems = dropItems;
        battle.BattleResult = req;

        Player.BattleInstance = null;

        if (battle.GridFightContext != null && Player.GridFightManager != null)
            await Player.GridFightManager.EndBattle(battle, req);

        battle.OnBattleEnd += Player.MissionManager!.OnBattleFinish;
        await battle.TriggerOnBattleEnd();

        var trialActivity = Player.ActivityManager!.TrialActivityInstance;
        var trialStageId = trialActivity?.Data.CurTrialStageId ?? 0;
        if (req.EndStatus == BattleEndStatus.BattleEndWin &&
            trialActivity != null && trialStageId != 0 &&
            battle.StageId == trialStageId)
            await trialActivity.EndActivity(TrialActivityStatus.Finish);

        var dropItemList = await battle.GetDropItemListAsync();
        await Player.SendPacket(new PacketPVEBattleResultScRsp(req, Player, battle, dropItemList));
    }

    private List<EntityMonster> ResolveSceneMonstersByStageId(int stageId)
    {
        if (stageId == 0 || Player.SceneInstance == null) return [];

        var monsters = new List<EntityMonster>();
        foreach (var monster in Player.SceneInstance.Entities.Values.OfType<EntityMonster>())
        {
            if (!monster.IsAlive) continue;
            if (!TryResolveStageFromEvent(monster.GetStageId(), Player.Data.WorldLevel, out var stage) || stage == null)
                continue;
            if (stage.StageID == stageId) monsters.Add(monster);
        }

        if (monsters.Count > 0) return monsters;

        foreach (var monster in Player.SceneInstance.Entities.Values.OfType<EntityMonster>())
        {
            if (!monster.IsAlive) continue;
            if (!TryResolveStageFromEvent(monster.Info.EventID, Player.Data.WorldLevel, out var stage) || stage == null)
                continue;
            if (stage.StageID == stageId) monsters.Add(monster);
        }

        return monsters;
    }

    private static bool TryResolveStageFromEvent(int eventId, int worldLevel, out StageConfigExcel? stage)
    {
        stage = null;
        if (eventId <= 0) return false;

        if (GameData.PlaneEventData.TryGetValue(eventId * 10 + worldLevel, out var exactPlaneEvent) &&
            GameData.StageConfigData.TryGetValue(exactPlaneEvent.StageID, out stage))
            return true;

        if (GameData.PlaneEventData.TryGetValue(eventId, out var directPlaneEvent) &&
            GameData.StageConfigData.TryGetValue(directPlaneEvent.StageID, out stage))
            return true;

        if (GameData.StageConfigData.TryGetValue(eventId * 10 + worldLevel, out stage))
            return true;

        if (GameData.StageConfigData.TryGetValue(eventId, out stage))
            return true;

        stage = null;
        return false;
    }
}
