using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Avatar;
using March7thHoney.Enums.GridFight;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Lineup;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.GridFight.Battle;

public static class GridFightBattleProtoBuilder
{
    private const uint GridFightBattleMode = 2;

    public static List<AvatarLineupData> Populate(
        BattleInstance battle,
        GridFightSession session,
        GridFightResourceCatalog catalog,
        SceneBattleInfo proto)
    {
        var collection = new PlayerDataCollection(
            battle.Player.Data,
            battle.Player.InventoryManager!.Data,
            battle.Lineup);
        var avatars = BuildBattleAvatars(battle, session);
        var foregroundRoles = session.Roles
            .Where(role => role.Position is >= 1 and <= 4)
            .OrderBy(role => role.Position)
            .ToList();
        var battleRoles = new List<GridFightRoleState>(foregroundRoles.Count);
        foreach (var role in foregroundRoles)
        {
            var avatar = ResolveBattleAvatar(battle, role, battle.Player.Data.CurrentGender, isForeground: true);
            if (avatar == null) continue;
            avatar.AvatarInfo.SetCurHp(10000, true);
            proto.BattleAvatarList.Add(BuildBattleAvatarProto(avatar, collection));
            battleRoles.Add(role);
        }
        AddEntryBuffs(battle, battleRoles);

        proto.MonsterWaveList.Clear();
        foreach (var wavePlan in session.BattlePlan?.Waves ?? [])
        {
            var wave = new SceneMonsterWave
            {
                BattleStageId = session.CurrentNode.StageId,
                BattleWaveId = wavePlan.WaveId,
                MonsterParam = new SceneMonsterWaveParam
                {
                    MonsterWorldLevel = wavePlan.FormationWaveId,
                    EliteGroup = session.BattlePlan!.EliteGroupId,
                    SupplementalEliteGroup = wavePlan.FormationWaveId == 3 ? 846u : 0,
                },
            };
            wave.MonsterList.Add(wavePlan.Monsters.Select(monster =>
            {
                var battleInfo = new GridFightMonsterBattleInfo { RoleStar = monster.RoleStar };
                battleInfo.DropList.Add(monster.Drops
                    .Where(drop => drop.Type == GridFightBonusTypeEnum.Orb)
                    .Select(drop => new GridFightDropEntry
                    {
                        DropType = GridFightDropType.Orb,
                        ItemId = drop.ItemId,
                        Num = drop.Count,
                    }));
                return new SceneMonster
                {
                    MonsterId = monster.Monster.MonsterID,
                    ExtraInfo = new GridFightSceneMonsterExtraInfo { GridFightInfo = battleInfo },
                };
            }));
            proto.MonsterWaveList.Add(wave);
        }

        var activeRoles = session.Roles
            .Where(role => role.Position is >= 1 and <= 13)
            .OrderBy(role => role.Position)
            .ToList();
        session.RefreshRoleSavedValues();
        var gridFightInfo = new GridFightInfo
        {
            BattleWaveId = 1,
            GridFightLineupHp = session.LineupHp,
            MaxActiveRoleCount = session.MaxActiveRoles,
            PenaltyBonusRuleId = session.CurrentPenaltyRuleId,
            EnemyDifficultyLevel = session.EffectiveEnemyDifficultyLevel,
            Season = session.Season,
            DivisionId = session.DivisionId,
            ActiveRoleCount = (uint)activeRoles.Count,
            IsOverlock = session.IsOverlock,
            NodeInfo = new GridFightNodeInfo
            {
                RouteId = catalog.StandardRouteId,
                ChapterId = session.ChapterId,
                SectionId = session.SectionId,
                NodeType = (uint)session.CurrentNode.NodeType,
            },
        };
        if (session.HackConsole != null)
            gridFightInfo.EnemyHpPercent = session.HackConsole.EnemyHpPercent;
        if (session.SelectedPortalId != 0)
            gridFightInfo.GridFightPortalBuffList.Add(new GridFightPortalInfo
            {
                PortalBuffId = session.SelectedPortalId,
            });
        gridFightInfo.SyncAugmentInfo.Add(session.ActiveInvestmentIds.Select(augmentId =>
            new GridFightAugmentInfo { AugmentId = augmentId }));
        foreach (var role in activeRoles.Where(role => role.Position is >= 5 and <= 13))
        {
            var avatar = ResolveBattleAvatar(battle, role, battle.Player.Data.CurrentGender, isForeground: false);
            if (avatar == null) continue;
            avatar.AvatarInfo.SetCurHp(10000, true);
            gridFightInfo.BackgroundAvatarList.Add(BuildBattleAvatarProto(avatar, collection));
        }
        foreach (var role in activeRoles)
            gridFightInfo.GridGameRoleList.Add(BuildRoleInfo(session, role, battle.Player.Data.CurrentGender));
        foreach (var (key, value) in session.RoleSavedValues)
            gridFightInfo.RoleSavedValues[key] = value;
        foreach (var group in activeRoles
                     .SelectMany(role => session.ResolveRoleTraitIds(role)
                         .Select(traitId => (TraitId: traitId, Role: role)))
                     .GroupBy(entry => entry.TraitId))
        {
            var members = group.Select(entry => entry.Role).Distinct().ToList();
            var count = (uint)members.Count + session.ResolveTraitExtraMemberCount(group.Key, activeRoles);
            var activeLayer = ResolveTraitLayer(group.Key, count);
            var traitInfo = new GridFightTraitInfo
            {
                TraitId = group.Key,
                Layer = activeLayer,
            };
            traitInfo.MemberList.Add(members.Select(role => new GridFightTraitMemberInfo
            {
                MemberRoleUniqueId = role.UniqueId,
                MemberType = GridFightTraitMemberType.Role,
                MemberRoleId = role.RoleId,
                UpdateSource = GameData.GridFightRoleBasicInfoData[role.RoleId].TraitList.Contains(group.Key)
                    ? GridFightUpdateSource.Role
                    : GridFightUpdateSource.Equipment,
            }));
            if (activeLayer > 0)
                PopulateTraitEffects(traitInfo);
            gridFightInfo.GridFightTraitInfo.Add(traitInfo);
        }
        foreach (var role in activeRoles)
            if (GameData.GridFightRoleStarData.TryGetValue(role.RoleId << 4 | role.Star, out var roleStar) &&
                roleStar.BEID != 0)
                battle.BattleEvents.TryAdd((int)roleStar.BEID, new BattleEventInstance((int)roleStar.BEID, 0, 100000));
        foreach (var battleEventId in gridFightInfo.GridFightTraitInfo
                     .Select(info => GameData.GridFightTraitBasicInfoData.GetValueOrDefault(info.TraitId))
                     .Where(info => info != null)
                     .SelectMany(info => info!.BEIDList))
            battle.BattleEvents.TryAdd((int)battleEventId, new BattleEventInstance((int)battleEventId, 0, 100000));
        proto.BattleGridFightData = gridFightInfo;
        return avatars;
    }

    public static GridFightRoleInfo BuildRoleInfo(GridFightSession session, GridFightRoleState role, Gender gender)
    {
        var basic = GameData.GridFightRoleBasicInfoData[role.RoleId];
        var result = new GridFightRoleInfo
        {
            RoleId = role.RoleId,
            AvatarId = ResolveAvatarId(basic, role.Star, gender),
            RoleStar = role.Star,
            Pos = role.Position,
            UniqueId = role.UniqueId,
            BattleExtInfo = new GridFightRoleBattleExtInfo
            {
                ModeInfo = new GridFightRoleBattleModeInfo { Mode = GridFightBattleMode },
                StateInfo = new GridFightRoleBattleStateInfo(),
            },
        };
        GridFightManager.PopulateRolePropertyScales(
            result.ConvertPropertyToFixpoint,
            session.HasCyreneCombatEnhancement);
        result.RoleEquipmentList.Add(session.GetEquippedEquipment(role).Select(equipment =>
            new BattleGridFightEquipInfo
            {
                GridFightEquipmentId = equipment.EquipmentId,
                UniqueId = equipment.UniqueId,
            }));
        return result;
    }

    public static uint ResolveTraitLayer(uint traitId, uint memberCount)
    {
        return GameData.GridFightTraitLayerData.GetValueOrDefault(traitId)?.Keys
            .Where(layer => layer <= memberCount)
            .DefaultIfEmpty()
            .Max() ?? 0;
    }

    private static void AddEntryBuffs(BattleInstance battle, IReadOnlyList<GridFightRoleState> roles)
    {
        for (var ownerIndex = 0; ownerIndex < roles.Count; ownerIndex++)
        {
            var role = roles[ownerIndex];
            if (!TryResolveEntryMazeSkill(role, out var mazeSkillId)) continue;
            if (battle.Buffs.Any(buff => buff.BuffID == mazeSkillId && buff.OwnerIndex == ownerIndex)) continue;
            battle.Buffs.Add(new MazeBuff(mazeSkillId, 1, ownerIndex)
            {
                WaveFlag = -1,
                IncludeOwnerInTargetList = false,
            });
        }

        var leader = roles.FirstOrDefault();
        if (leader == null ||
            !GameData.GridFightRoleBasicInfoData.TryGetValue(leader.RoleId, out var basic) ||
            !GameData.AvatarConfigData.TryGetValue((int)basic.AvatarID, out var avatar) ||
            avatar.DamageType == 0)
            return;

        var buffId = (int)avatar.DamageType;
        if (battle.Buffs.Any(buff => buff.BuffID == buffId && buff.OwnerIndex == 0)) return;
        var skillIndex = GameData.GridFightRoleStarData.TryGetValue(leader.RoleId << 4 | leader.Star, out var roleStar) &&
                         !roleStar.SkillOverrideSrc.Contains(0)
            ? 2
            : 1;
        var buff = new MazeBuff(buffId, 1, 0)
        {
            WaveFlag = -1,
            IncludeOwnerInTargetList = false,
        };
        buff.DynamicValues["SkillIndex"] = skillIndex;
        battle.Buffs.Add(buff);
    }

    private static bool TryResolveEntryMazeSkill(GridFightRoleState role, out int mazeSkillId)
    {
        mazeSkillId = 0;
        if (!GameData.GridFightRoleBasicInfoData.TryGetValue(role.RoleId, out var basic)) return false;
        var adventurePlayerId = (int)basic.AvatarID;
        if (GameData.AvatarConfigData.TryGetValue(adventurePlayerId, out var avatar) && avatar.AdventurePlayerID != 0)
            adventurePlayerId = avatar.AdventurePlayerID;
        if (!GameData.AdventurePlayerData.TryGetValue(adventurePlayerId, out var adventure) ||
            adventure.MazeSkillIdList.Count == 0)
            return false;

        if (GameData.GridFightRoleStarData.TryGetValue(role.RoleId << 4 | role.Star, out var roleStar) &&
            roleStar.SkillOverrideSrc.Contains(0))
            mazeSkillId = adventure.MazeSkillIdList.FirstOrDefault(id => roleStar.SkillOverrideSrc.Contains((uint)id));
        if (mazeSkillId == 0) mazeSkillId = adventure.MazeSkillIdList[0];
        return mazeSkillId != 0;
    }

    public static List<AvatarLineupData> BuildBattleAvatars(BattleInstance battle, GridFightSession session)
    {
        var avatars = new List<AvatarLineupData>();
        foreach (var role in session.Roles
                     .Where(role => role.Position is >= 1 and <= 13)
                     .OrderBy(role => role.Position))
        {
            var avatar = ResolveBattleAvatar(battle, role, battle.Player.Data.CurrentGender,
                isForeground: role.Position <= 4);
            if (avatar == null) continue;
            avatar.AvatarInfo.SetCurHp(10000, true);
            avatars.Add(avatar);
        }
        return avatars;
    }

    internal static BattleAvatar BuildBattleAvatarProto(
        AvatarLineupData avatar,
        PlayerDataCollection collection)
    {
        var proto = avatar.AvatarInfo is FormalAvatarInfo formal && avatar.BattleAvatarId is int battleAvatarId
            ? formal.ToBattleProto(collection, battleAvatarId, avatar.AvatarType)
            : avatar.AvatarInfo.ToBattleProto(collection, avatar.AvatarType);
        ApplyDefaultEnhancement(proto, (int)proto.Id);
        return proto;
    }

    private static void ApplyDefaultEnhancement(BattleAvatar proto, int avatarId)
    {
        if (!GameData.AvatarConfigData.TryGetValue(avatarId, out var avatarConfig)) return;
        var enhancedId = avatarConfig.SkillTree.Keys
            .Where(id => id > 0)
            .DefaultIfEmpty()
            .Min();
        if (enhancedId == 0 || proto.EnhancedId == enhancedId) return;
        if (!avatarConfig.SkillTree.TryGetValue(enhancedId, out var enhancedSkills)) return;

        var levelBySlot = new Dictionary<int, uint>();
        foreach (var skill in proto.SkilltreeList)
        {
            var skillKey = checked((int)skill.PointId * 100 + 1);
            if (!GameData.AvatarSkillTreeConfigData.TryGetValue(skillKey, out var skillConfig)) continue;
            var slot = skillConfig.GetMultiPointId();
            if (slot > 0) levelBySlot[slot] = skill.Level;
        }

        var transformed = new List<AvatarSkillTree>();
        foreach (var skillConfig in enhancedSkills)
        {
            var slot = skillConfig.GetMultiPointId();
            if (slot <= 0 || !levelBySlot.TryGetValue(slot, out var level)) continue;
            transformed.Add(new AvatarSkillTree
            {
                PointId = (uint)skillConfig.PointID,
                Level = Math.Min(level, (uint)skillConfig.MaxLevel),
            });
        }
        if (transformed.Count == 0) return;

        proto.SkilltreeList.Clear();
        proto.SkilltreeList.Add(transformed);
        proto.EnhancedId = (uint)enhancedId;
    }

    private static void PopulateTraitEffects(GridFightTraitInfo traitInfo)
    {
        if (!GameData.GridFightTraitBasicInfoData.TryGetValue(traitInfo.TraitId, out var trait)) return;
        foreach (var effectId in trait.TraitEffectList)
        {
            var effectInfo = new BattleGridFightTraitEffectInfo { EffectId = effectId };
            PopulateTraitBonusLevelInfo(effectInfo);
            traitInfo.TraitEffectList.Add(effectInfo);
        }
    }

    private static void PopulateTraitBonusLevelInfo(BattleGridFightTraitEffectInfo effectInfo)
    {
        if (!GameData.GridFightTraitEffectData.TryGetValue(effectInfo.EffectId, out var effect) ||
            effect.TraitEffectType != GridFightTraitEffectTypeEnum.TraitBonus) return;

        var levelInfo = new GridFightTraitEffectLevelInfo();
        if (GameData.GridFightTraitBonusData.TryGetValue(effectInfo.EffectId, out var bonuses))
        {
            foreach (var (threshold, bonus) in bonuses.OrderBy(entry => entry.Key))
            {
                var dropInfo = new GridFightDropInfo();
                foreach (var combinationId in bonus.BonusParamList)
                {
                    if (!GameData.GridFightCombinationBonusData.TryGetValue(combinationId, out var combination))
                        continue;
                    foreach (var poolId in combination.CombinationBonusList)
                    {
                        if (!GameData.GridFightBasicBonusPoolV2Data.TryGetValue(poolId, out var pool)) continue;
                        if (pool.BonusType != GridFightBonusTypeEnum.Orb) continue;
                        var orbId = pool.BonusTypeParamList.FirstOrDefault();
                        if (orbId == 0) orbId = pool.BonusTypeParam;
                        if (orbId == 0) continue;
                        dropInfo.DropList.Add(new GridFightDropEntry
                        {
                            DropType = GridFightDropType.Orb,
                            ItemId = orbId,
                            Num = 1,
                        });
                    }
                }
                if (dropInfo.DropList.Count > 0)
                    levelInfo.TraitEffectLevelReward[threshold] = dropInfo;
            }
        }
        effectInfo.TraitEffectLevelInfo = levelInfo;
    }

    private static uint ResolveAvatarId(GridFightRoleBasicInfoExcel basic, uint star, Gender gender)
    {
        if (gender != Gender.Woman) return basic.AvatarID;
        var key = (basic.ID << 4) | star;
        return GameData.GridFightGenderOverrideData.TryGetValue(key, out var genderOverride)
            ? genderOverride.AvatarID
            : basic.AvatarID;
    }

    private static AvatarLineupData? ResolveBattleAvatar(BattleInstance battle, GridFightRoleState role, Gender gender,
        bool isForeground)
    {
        if (!GameData.GridFightRoleBasicInfoData.TryGetValue(role.RoleId, out var basic)) return null;
        var avatarId = ResolveAvatarId(basic, role.Star, gender);
        var formal = battle.Player.AvatarManager!.GetFormalAvatar((int)avatarId);
        if (formal != null)
        {
            var avatarType = isForeground && string.Equals(basic.FrontBackType, "Back", StringComparison.Ordinal)
                ? AvatarType.AvatarFormalType
                : AvatarType.AvatarGridFightType;
            return new AvatarLineupData(formal, avatarType, (int)avatarId);
        }
        var trial = battle.Player.AvatarManager.GetTrialAvatarByWorldLevel(
            (int)basic.SpecialAvatarID,
            battle.Player.Data.WorldLevel);
        return trial == null ? null : new AvatarLineupData(trial, AvatarType.AvatarTrialType);
    }

    public static bool IsTrialRole(BattleInstance battle, uint roleId, bool isForeground)
    {
        var role = new GridFightRoleState { RoleId = roleId };
        return ResolveBattleAvatar(battle, role, battle.Player.Data.CurrentGender, isForeground)?.AvatarType ==
               AvatarType.AvatarTrialType;
    }
}
