using March7thHoney.Data;
using March7thHoney.Data.Custom;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.GridFight;

namespace March7thHoney.GameServer.Game.GridFight;

public sealed record GridFightRouteNode(
    uint RouteId,
    uint ChapterId,
    uint SectionId,
    GridFightNodeTemplateExcel Template)
{
    public uint StageId => Template.StageID;
    public GridFightNodeTypeEnum NodeType => Template.NodeType;
    public uint BasicGoldReward => Template.BasicGoldRewardNum;
    public uint PenaltyBonusRuleId => Template.PenaltyBonusRuleID;
    public IReadOnlyList<uint> Parameters => Template.ParamList;
}

public sealed record GridFightMonsterPlan(
    GridFightMonsterExcel Monster,
    uint RoleStar,
    IReadOnlyList<GridFightRewardEntry> Drops)
{
    public GridFightMonsterPlan(GridFightMonsterExcel monster, uint roleStar) : this(monster, roleStar, [])
    {
    }
}

public sealed record GridFightMonsterWavePlan(
    uint WaveId,
    uint FormationWaveId,
    IReadOnlyList<GridFightMonsterPlan> Monsters);

public sealed record GridFightBattlePlan(
    uint CampId,
    uint EliteGroupId,
    uint PenaltyRuleId,
    uint DifficultyAdd,
    IReadOnlyList<GridFightMonsterWavePlan> Waves)
{
    public IReadOnlyList<GridFightMonsterPlan> Monsters => Waves.SelectMany(wave => wave.Monsters).ToList();
}

public sealed record GridFightEncounterOptionState(
    uint EliteBranchId,
    uint EncounterId,
    uint Quality,
    GridFightBattlePlan BattlePlan);

public sealed record GridFightRoleSwitchGroup(
    uint BaseRoleId,
    uint SwitchRoleId,
    string Condition,
    IReadOnlyList<uint> ParamList,
    IReadOnlyList<uint> RoleIdList);

public sealed record GridFightPortalRuntimeEffects(
    IReadOnlyList<uint> EntryRoleIds,
    IReadOnlyList<uint> EntryEquipmentIds,
    IReadOnlySet<uint> ShopBoostTraitIds,
    double ShopBoostMultiplier)
{
    public static GridFightPortalRuntimeEffects Empty { get; } = new([], [], new HashSet<uint>(), 1.0);
}

public sealed class GridFightResourceCatalog
{
    private const uint HighestDivisionStartingHpAffixId = 4020;
    private const uint PostBattleHealingTalentId = 1081;
    private const int PostBattleHealingEffectIndex = 2;
    private const uint FinalBattleTurnHealingTalentId = 2011;
    private const int FinalBattleTurnThresholdEffectIndex = 1;
    private const int FinalBattleTurnHealingEffectIndex = 2;
    private const uint BossRoleStar = 2;
    private const uint BossFormationMaxTeammateCount = 5;
    private readonly Random _random;

    public uint CurrentSeason { get; }
    public uint CurrentSubSeason { get; }
    public uint ActivityModuleId { get; }
    public uint ContentModuleId { get; }
    public GridFightDivisionInfoExcel HighestDivision { get; }
    public uint StandardRouteId { get; }
    public IReadOnlyList<GridFightRouteNode> StandardRoute { get; }
    public IReadOnlyList<GridFightRoleBasicInfoExcel> RolePool { get; }
    public IReadOnlyList<GridFightRoleSwitchGroup> RoleSwitchGroups { get; }
    public IReadOnlyList<GridFightCampExcel> CampPool { get; }
    public IReadOnlyList<GridFightCampExcel> RewardCampPool { get; }
    public IReadOnlyList<uint> PortalPool { get; }
    public IReadOnlyList<uint> AugmentPool { get; }
    public IReadOnlyList<uint> BasicEquipmentPool { get; }
    public IReadOnlySet<uint> InitialExcludedRoleIds { get; }
    public uint ShopSize => GetUInt("GridFight_CardNumberPerRefresh");
    public uint RefreshCost => GetUInt("GridFight_LotteryRefreshGold");
    public uint BuyExpCost => GetUInt("GridFight_LevelUpGold");
    public uint BuyExpAmount => GetUInt("GridFight_LevelUpExp");
    public uint BattleWinExp => RequireUInt("GridFight_GainExpWhenWaveEnd");
    public uint InitialHp => GetUInt("GridFight_InitGlobalPlayerHP");
    public uint InitialPlayerLevel => RequireUInt("GridFight_LotteryShopStartLevel");
    public uint MaxPlayerLevel => GameData.GridFightPlayerLevelData.Keys.Max();
    public uint InitialRoleCount => RequireUInt("GridFight_BaseSupplyRoleNum");
    public uint BenchSize => RequireUInt("GridFight_Bench_AvatarNum");
    public uint BenchOverflowSize => RequireUInt("GridFight_Bench_OverFlow_AvatarNum");
    public uint OffFieldInitialCount => RequireUInt("GridFight_Back_AvatarInitialNum");
    public uint OffFieldMaxCount => RequireUInt("GridFight_Back_AvatarMaxNum");
    public uint DepositPerInterest => RequireUInt("GridFight_DepositPerInterest");
    public uint MaxInterestGold => RequireUInt("GridFight_GainInterestMax");
    public uint PostBattleHealingSourceId => PostBattleHealingTalentId;
    public uint FinalBattleTurnHealingSourceId => FinalBattleTurnHealingTalentId;
    public uint SeasonExpLimit => RequireUInt("GridFight_ExtraSeasonExp_Limit");
    public IReadOnlyList<uint> InitialEquipmentIds => GetUIntList("GridFight_PhainonEquipPreset");
    public uint InitialGold { get; }
    public uint TutorialCompletion { get; }

    private static IReadOnlySet<string> RoleModifierSavedValueKeys => GameData.GridFightRoleSkillModifyData
        .Select(row => row.MultipleValueKey)
        .Where(key => !string.IsNullOrWhiteSpace(key))
        .ToHashSet(StringComparer.Ordinal);

    public GridFightResourceCatalog(Random? random = null)
    {
        _random = random ?? Random.Shared;
        CurrentSeason = RequireUInt("GridFight_Season_ID");
        CurrentSubSeason = RequireUInt("GridFight_Sub_Season_ID");
        ActivityModuleId = GameData.GridFightSeasonModuleData.Values
            .Single(row => row.SeasonID == CurrentSeason && row.SubSeasonID == CurrentSubSeason)
            .ActivityModuleID;
        ContentModuleId = ResolveContentModuleId();
        HighestDivision = GameData.GridFightDivisionInfoData.Values
            .Where(row => row.SeasonID == CurrentSeason)
            .OrderBy(row => row.Progress)
            .ThenBy(row => row.ID)
            .Last();
        StandardRouteId = ResolveStandardRouteId();
        StandardRoute = BuildRoute(StandardRouteId);

        var bannedRoles = GameData.GridFightModuleBanRoleData
            .Where(row => row.ModuleId == ContentModuleId)
            .Select(row => row.RoleId)
            .ToHashSet();
        RolePool = GameData.GridFightRoleBasicInfoData.Values
            .Where(row => row.SeasonID == CurrentSeason && row.IsInPool && !bannedRoles.Contains(row.ID))
            .Where(row => row.AvatarID is >= 1000 and < 2000 && row.RoleSavedValueList.Count > 0)
            .OrderBy(row => row.ID)
            .ToList();
        RoleSwitchGroups = GameData.GridFightRoleSwitchConfigData.Values
            .GroupBy(row => row.BaseRoleID)
            .OrderBy(group => group.Key)
            .Select(group =>
            {
                var rows = group.OrderBy(row => row.RoleID).ToList();
                var roleIds = rows.Select(row => row.RoleID)
                    .Prepend(group.Key)
                    .Distinct()
                    .ToList();
                var first = rows[0];
                return new GridFightRoleSwitchGroup(
                    group.Key,
                    first.RoleID,
                    first.Condition,
                    first.ParamList.ToList(),
                    roleIds);
            })
            .ToList();
        CampPool = GameData.GridFightCampData.Values
            .Where(row => row.SeasonID == CurrentSeason && row.IfRandomEnabled != 0 && row.MonsterList.Count > 0)
            .Where(row => row.MonsterList.All(GameData.GridFightMonsterData.ContainsKey))
            .Where(row => row.MonsterList.Any(id => GameData.GridFightMonsterData[id].MonsterTier >= 5))
            .OrderBy(row => row.ID)
            .ToList();
        var rewardCampCodes = StandardRoute
            .Where(node => node.NodeType == GridFightNodeTypeEnum.Monster)
            .SelectMany(node => node.Parameters.Take(1))
            .Select(parameter => parameter / 100)
            .Where(code => code != 0)
            .ToHashSet();
        RewardCampPool = GameData.GridFightCampData.Values
            .Where(row => row.SeasonID == CurrentSeason && row.IfRandomEnabled == 0)
            .Where(row => rewardCampCodes.Contains(row.InitialRandomCode))
            .Where(row => row.MonsterList.Count > 0 && row.MonsterList.All(GameData.GridFightMonsterData.ContainsKey))
            .OrderBy(row => row.ID)
            .ToList();

        var bannedPortals = GameData.GridFightModuleBanPortalData
            .Where(row => row.ModuleId == ContentModuleId)
            .Select(row => row.BanPortalId)
            .ToHashSet();
        PortalPool = GameData.GridFightSeasonPortalData.GetValueOrDefault(CurrentSeason, [])
            .Where(id => !bannedPortals.Contains(id))
            .Distinct()
            .Order()
            .ToList();

        var bannedAugments = GameData.GridFightModuleBanAugmentData
            .Where(row => row.ModuleId == ContentModuleId)
            .Select(row => row.BanAugmentId)
            .ToHashSet();
        AugmentPool = GameData.GridFightSeasonAugmentData.GetValueOrDefault(CurrentSeason, [])
            .Where(id => !bannedAugments.Contains(id))
            .Distinct()
            .Order()
            .ToList();
        BasicEquipmentPool = GameData.GridFightEquipmentData.Values
            .Where(row => row.EquipCategory == GridFightEquipCategoryEnum.Basic)
            .Select(row => row.ID)
            .Distinct()
            .Order()
            .ToList();

        InitialExcludedRoleIds = GetUIntList("GridFight_InitialExceptRoleIdList").ToHashSet();
        InitialGold = ResolveInitialGold();
        TutorialCompletion = GameData.GridFightTutorialStageNodeData.Max(row => row.Unlock);
    }

    public IReadOnlyList<string> Validate()
    {
        var errors = new List<string>();
        if (HighestDivision.Progress == 0) errors.Add("highest division progress is zero");
        if (SeasonExpLimit == 0) errors.Add("season exp limit is zero");
        if (Enumerable.Range(0, checked((int)InitialHp + 1)).Any(hp => FindSettleRank((uint)hp) == null))
            errors.Add("settle rank table does not cover the lineup HP range");
        if (InitialEquipmentIds.Count == 0) errors.Add("initial equipment list is empty");
        if (InitialEquipmentIds.Any(id => !GameData.GridFightEquipmentData.ContainsKey(id)))
            errors.Add("initial equipment list references missing equipment");
        if (RolePool.Count == 0) errors.Add("role pool is empty");
        if (RolePool.Any(row => row.AvatarID is < 1000 or >= 2000 || row.RoleSavedValueList.Count == 0))
            errors.Add("role pool contains an unusable runtime role");
        if (GameData.GridFightFrontSkillData.Count == 0)
            errors.Add("grid fight front skill data is empty");
        if (RoleModifierSavedValueKeys.Count == 0)
            errors.Add("grid fight role modifier saved value keys are empty");
        foreach (var key in RoleModifierSavedValueKeys)
        {
            var owners = GameData.GridFightRoleBasicInfoData.Values
                .Where(role => role.RoleSavedValueList.Contains(key, StringComparer.Ordinal))
                .ToList();
            if (owners.Count != 1)
            {
                errors.Add($"grid fight role modifier key {key} has {owners.Count} owners");
                continue;
            }
            foreach (var roleStar in GameData.GridFightRoleStarData.Values.Where(row => row.ID == owners[0].ID))
                if (!TryResolveRoleSavedValueLayer(roleStar, out _))
                    errors.Add($"grid fight role {roleStar.ID} star {roleStar.Star} has no saved value layer");
        }
        if (RolePool.Count(row => !InitialExcludedRoleIds.Contains(row.ID)) < InitialRoleCount)
            errors.Add("initial role pool is too small");
        if (CampPool.Count == 0) errors.Add("monster camp pool is empty");
        if (CampPool.Any(camp => GetCampMonsters(camp.ID, monster => monster.MonsterTier == 2).Count == 0))
            errors.Add("monster camp pool contains a camp without normal monsters");
        if (RewardCampPool.Count == 0) errors.Add("reward monster camp pool is empty");
        ValidateRewardRules(errors);
        if (PortalPool.Count == 0) errors.Add("portal pool is empty");
        var runtimeConfig = GameData.GridFightRuntimeConfig;
        if (runtimeConfig.RotationPortalId != 0 && !PortalPool.Contains(runtimeConfig.RotationPortalId))
            errors.Add($"rotation portal {runtimeConfig.RotationPortalId} is not in the current portal pool");
        foreach (var (level, weights) in runtimeConfig.ShopRarityWeightOverrides)
        {
            if (!GameData.GridFightPlayerLevelData.TryGetValue(level, out var playerLevel))
            {
                errors.Add($"shop rarity override references missing player level {level}");
                continue;
            }
            if (weights.Count != playerLevel.RarityWeights.Count || weights.All(weight => weight == 0))
                errors.Add($"shop rarity override for level {level} has invalid weights");
        }
        if (AugmentPool.Count == 0) errors.Add("augment pool is empty");
        foreach (var chapterId in StandardRoute.Select(node => node.ChapterId).Distinct())
            if (!Enum.GetValues<GridFightAugmentQualityEnum>()
                    .Where(quality => quality != GridFightAugmentQualityEnum.None)
                    .Any(quality => GetInvestmentCandidates(chapterId, quality).Count >= 3))
                errors.Add($"chapter {chapterId} has no augment quality pool with three entries");
        if (BasicEquipmentPool.Count == 0) errors.Add("basic equipment pool is empty");
        if (RolePool.Count < 5) errors.Add("supply role pool has fewer than five entries");
        if (StandardRoute.Count < 2) errors.Add("standard route has fewer than two nodes");
        if (!StandardRoute.Any(node => node.ChapterId == 1 && node.SectionId == 1))
            errors.Add("standard route has no 1-1 node");
        if (!StandardRoute.Any(node => node.ChapterId == 1 && node.SectionId == 2))
            errors.Add("standard route has no 1-2 node");
        if (StandardRoute.Any(node => node.StageId == 0)) errors.Add("standard route has missing stage ids");
        if (StandardRoute.Any(node => !GameData.StageConfigData.ContainsKey((int)node.StageId)))
            errors.Add("standard route references missing stage configs");
        if (GameData.GridFightPlayerLevelData.Count == 0) errors.Add("player level table is empty");
        if (GameData.GridFightShopPriceData.Count == 0) errors.Add("shop price table is empty");
        if (DepositPerInterest == 0) errors.Add("interest deposit step is zero");
        if (GameData.GridFightVictoryBonusData.Count == 0 || !GameData.GridFightVictoryBonusData.ContainsKey(0))
            errors.Add("victory bonus table has no zero-win reward");
        if (!HasEffectParameter(GameData.GridFightAffixConfigData.GetValueOrDefault(HighestDivisionStartingHpAffixId), 0))
            errors.Add("highest-division starting HP affix is incomplete");
        if (!HasEffectParameter(GameData.GridFightTalentData.GetValueOrDefault(PostBattleHealingTalentId),
                PostBattleHealingEffectIndex))
            errors.Add("post-battle healing talent is incomplete");
        if (!HasFinalBattleTurnHealing())
            errors.Add("final-battle turn healing talent is incomplete");
        if (!GameData.GridFightDivisionStageData.ContainsKey(HighestDivision.ID))
            errors.Add("highest division has no stage difficulty row");
        if (Enumerable.Range(1801, 19).Any(id => !GameData.GridFightEliteGroupData.ContainsKey((uint)id)))
            errors.Add("GridFight progression elite groups are incomplete");
        if (GameData.GridFightDivisionStageData.TryGetValue(HighestDivision.ID, out var divisionStage))
        {
            var baseDifficulty = divisionStage.EnemyDifficultyLevel;
            if (StandardRoute.Select(node => node.ChapterId).Distinct().Any(chapter =>
                    !GameData.GridFightEnemyDifficultyLvData.TryGetValue(chapter, out var rows) ||
                    !rows.ContainsKey(baseDifficulty)))
                errors.Add("GridFight enemy difficulty table has no highest-division baseline");
        }
        if (StandardRoute.Any(node => !GameData.GridFightStageLevelValueData.ContainsKey(node.StageId)))
            errors.Add("standard route references missing GridFight stage level values");
        var requiredFormationSizes = GameData.GridFightRewardRulesConfig.CombatNodeProfiles.Values
            .SelectMany(profile => profile.Waves)
            .Select(wave => wave.MaxActiveMonsterCount)
            .Append(GameData.GridFightRewardRulesConfig.EncounterBattleProfile.MaxActiveMonsterCount)
            .Append(BossFormationMaxTeammateCount)
            .Distinct();
        if (requiredFormationSizes.Any(maxTeammateCount =>
                GameData.GridFightFormationWaveData.Values.Count(row =>
                    row.MaxTeammateCount == maxTeammateCount) != 1))
            errors.Add("GridFight formation wave table is incomplete");
        ValidateCombatRules(errors);
        foreach (var node in StandardRoute.Where(node => node.NodeType == GridFightNodeTypeEnum.EliteBranch))
        {
            var group = node.Parameters.FirstOrDefault();
            if (GameData.GridFightBinaryNodeRuleData.Values.Count(rule => rule.ID / 100 == group) != 4)
                errors.Add($"GridFight encounter group {group} is incomplete");
            if (Enumerable.Range(1, 4).Any(quality =>
                    !GameData.GridFightPenaltyRuleData.ContainsKey(91000u + node.ChapterId * 100 + 10u + (uint)quality)))
                errors.Add($"GridFight encounter penalties for chapter {node.ChapterId} are incomplete");
        }
        if (GameData.GridFightCampData.Values.All(row => row.SeasonID != CurrentSeason))
            errors.Add("current season has no monster camp");
        if (!GameData.GridFightRoleStarData.ContainsKey(
                GridFightSpecialFeatures.CyreneRoleId << 4 | 3) ||
            !GameData.GridFightRoleStarData.ContainsKey(
                GridFightSpecialFeatures.SilverWolfTopRoleId << 4 | 3))
            errors.Add("GridFight special roles have no three-star resource");
        if (!GridFightSpecialFeatures.TryResolveSilverWolfEquipmentId(out _))
            errors.Add("Silver Wolf hack equipment is missing");
        if (GridFightSpecialFeatures.HackOrbIds.Any(id =>
                !GridFightSpecialFeatures.TryResolveOrb(id, out _)))
            errors.Add("GridFight hack orb rewards are incomplete");
        if (!GridFightSpecialFeatures.TryResolveBonus(GridFightSpecialFeatures.CyreneWealthBonusId, out _) ||
            !GridFightSpecialFeatures.TryResolveBonus(GridFightSpecialFeatures.CyreneInsigniaBonusId, out _) ||
            !GridFightSpecialFeatures.TryResolveBonus(GridFightSpecialFeatures.CyreneHeroBonusId, out _))
            errors.Add("Cyrene special goods rewards are incomplete");
        return errors;
    }

    public IReadOnlyDictionary<string, uint> ResolveRoleSavedValues(uint roleId, uint star)
    {
        if (!GameData.GridFightRoleBasicInfoData.TryGetValue(roleId, out var role)) return new Dictionary<string, uint>();
        var values = role.RoleSavedValueList
            .Distinct(StringComparer.Ordinal)
            .ToDictionary(key => key, _ => 0u, StringComparer.Ordinal);
        if (!GameData.GridFightRoleStarData.TryGetValue(roleId << 4 | star, out var roleStar) ||
            !TryResolveRoleSavedValueLayer(roleStar, out var layer))
            return values;

        var modifierKeys = RoleModifierSavedValueKeys;
        foreach (var key in role.RoleSavedValueList.Where(modifierKeys.Contains))
        {
            values[key] = layer;
            var companionIndex = role.RoleSavedValueList.IndexOf(key) + 1;
            if (companionIndex < role.RoleSavedValueList.Count)
                values[role.RoleSavedValueList[companionIndex]] = layer;
        }
        return values;
    }

    private static bool TryResolveRoleSavedValueLayer(GridFightRoleStarExcel roleStar, out uint layer)
    {
        layer = 0;
        var passiveIndex = roleStar.SkillOverrideSrc.IndexOf(0);
        if (passiveIndex < 0 || passiveIndex >= roleStar.SkillOverrideDest.Count ||
            !GameData.GridFightFrontSkillData.TryGetValue(roleStar.SkillOverrideDest[passiveIndex], out var skill) ||
            skill.ParamList.Count == 0)
            return false;
        var value = skill.ParamList[0].Value;
        if (!double.IsFinite(value) || value < 0 || value > uint.MaxValue || value != Math.Truncate(value))
            return false;
        layer = (uint)value;
        return true;
    }

    private void ValidateRewardRules(List<string> errors)
    {
        errors.AddRange(GridFightSpecialFeatures.ValidateConfiguredOrbRewards());
        var rules = GameData.GridFightRewardRulesConfig;
        var rewardParameters = StandardRoute
            .Where(node => node.NodeType == GridFightNodeTypeEnum.Monster)
            .Select(node => node.Parameters.FirstOrDefault())
            .Where(parameter => parameter != 0)
            .Distinct()
            .ToList();
        foreach (var parameter in rewardParameters)
        {
            if (!rules.NodeProfiles.TryGetValue(parameter, out var profile))
            {
                errors.Add($"GridFight reward node {parameter} has no reward profile");
                continue;
            }
            if (profile.MonsterTiers.Count == 0 || profile.MonsterTiers.Any(tier => tier == 0))
                errors.Add($"GridFight reward node {parameter} has invalid monster tiers");
            if (profile.MinimumOrbPerMonster == 0 ||
                (ulong)profile.MonsterTiers.Count * profile.MinimumOrbPerMonster > profile.OrbRollCount)
                errors.Add($"GridFight reward node {parameter} cannot give every monster a minimum orb");
            if (profile.OrbWeights.Count == 0 || profile.OrbWeights.Values.Any(weight => weight == 0))
                errors.Add($"GridFight reward node {parameter} has invalid orb weights");
            if (profile.OrbWeights.Keys.Any(orbId =>
                    !GameData.GridFightBasicOrbRewardsConfig.OrbRewards.ContainsKey(orbId)))
                errors.Add($"GridFight reward node {parameter} references an orb without an opening recipe");
            if (profile.FormationWaveId != 5 ||
                !GameData.GridFightFormationWaveData.ContainsKey(profile.FormationWaveId))
                errors.Add($"GridFight reward node {parameter} has invalid formation wave");
            if (profile.RoleStar != 1)
                errors.Add($"GridFight reward node {parameter} has invalid monster star");
            foreach (var camp in RewardCampPool)
                if (profile.MonsterTiers.Any(tier =>
                        GetCampMonsters(camp.ID, monster => monster.MonsterTier == tier).Count == 0))
                    errors.Add($"GridFight reward camp {camp.ID} cannot satisfy node {parameter} tiers");
        }

        var chapters = StandardRoute.Select(node => node.ChapterId).ToHashSet();
        foreach (var rule in rules.TalentRules)
        {
            if (!GameData.GridFightTalentData.ContainsKey(rule.TalentId) &&
                !GameData.GridFightSeasonTalentData.ContainsKey(rule.TalentId))
                errors.Add($"GridFight talent reward references missing talent {rule.TalentId}");
            if (rule.EffectId == 0 || rule.ChapterIds.Count == 0 ||
                rule.ChapterIds.Any(chapterId => !chapters.Contains(chapterId)))
                errors.Add($"GridFight talent reward {rule.TalentId} has invalid trigger parameters");
            if (rule.OrbIds.Count == 0 || rule.OrbIds.Any(orbId =>
                    !GameData.GridFightBasicOrbRewardsConfig.OrbRewards.ContainsKey(orbId)))
                errors.Add($"GridFight talent reward {rule.TalentId} references an orb without an opening recipe");
        }
    }

    private void ValidateCombatRules(List<string> errors)
    {
        var rules = GameData.GridFightRewardRulesConfig;
        foreach (var parameter in StandardRoute
                     .Where(node => node.NodeType == GridFightNodeTypeEnum.CampMonster)
                     .Select(node => node.Parameters.FirstOrDefault())
                     .Distinct())
        {
            if (!rules.CombatNodeProfiles.TryGetValue(parameter, out var profile))
            {
                errors.Add($"GridFight combat node {parameter} has no battle profile");
                continue;
            }
            var totalCount = profile.Waves.Aggregate(0UL, (sum, wave) => sum + wave.MonsterCount);
            if (profile.Waves.Count == 0 || profile.Waves.Any(wave =>
                    wave.MonsterCount == 0 || wave.MaxActiveMonsterCount == 0))
                errors.Add($"GridFight combat node {parameter} has an invalid wave profile");
            if (profile.EliteMonsterCount > totalCount || profile.MaxRoleStar == 0)
                errors.Add($"GridFight combat node {parameter} has an invalid monster profile");
        }

        var bossNodes = StandardRoute
            .Where(node => node.NodeType == GridFightNodeTypeEnum.Boss)
            .ToList();
        if (bossNodes.GroupBy(node => node.ChapterId).Any(group => group.Count() != 1))
            errors.Add("GridFight route must contain one boss node per chapter");
        foreach (var node in bossNodes)
        {
            var parameter = node.Parameters.FirstOrDefault();
            if (!rules.BossNodeProfiles.TryGetValue(parameter, out var profile) || profile.MonsterTier == 0)
            {
                errors.Add($"GridFight boss node {parameter} has no valid battle profile");
                continue;
            }
            foreach (var camp in CampPool)
                if (GetCampMonsters(camp.ID, monster => monster.MonsterTier == profile.MonsterTier).Count == 0)
                    errors.Add(
                        $"GridFight camp {camp.ID} cannot satisfy boss node {parameter} tier {profile.MonsterTier}");
        }

        var encounter = rules.EncounterBattleProfile;
        if (encounter.MinimumMonsterCount == 0 ||
            encounter.MaximumMonsterCount < encounter.MinimumMonsterCount ||
            encounter.MaxActiveMonsterCount == 0 || encounter.MaxRoleStar == 0)
            errors.Add("GridFight encounter battle profile is invalid");
    }

    public GridFightRouteNode GetNode(uint chapterId, uint sectionId)
    {
        return StandardRoute.Single(node => node.ChapterId == chapterId && node.SectionId == sectionId);
    }

    public GridFightRouteNode? GetNextNode(uint chapterId, uint sectionId)
    {
        var index = StandardRoute.ToList().FindIndex(node =>
            node.ChapterId == chapterId && node.SectionId == sectionId);
        return index >= 0 && index + 1 < StandardRoute.Count ? StandardRoute[index + 1] : null;
    }

    public GridFightPlayerLevelExcel GetPlayerLevel(uint level)
    {
        return GameData.GridFightPlayerLevelData[level];
    }

    public IReadOnlyList<uint> GetShopRarityWeights(uint level)
    {
        if (GameData.GridFightRuntimeConfig.ShopRarityWeightOverrides.TryGetValue(level, out var configured) &&
            configured.Count > 0)
            return configured;
        var weights = GetUIntList($"GridFight_CardWeight_Lv{level}");
        return weights.Count > 0 ? weights : GetPlayerLevel(level).RarityWeights;
    }

    public bool IsRotationPortal(uint portalId) =>
        portalId != 0 && portalId == GameData.GridFightRuntimeConfig.RotationPortalId;

    /// <summary>
    /// Resolves the two portal reward shapes used at session entry directly from the resource graph:
    /// concept packages contain two fixed roles and a basic equipment, while invitations contain an emblem.
    /// </summary>
    public GridFightPortalRuntimeEffects GetPortalRuntimeEffects(uint portalId)
    {
        if (!GameData.GridFightPortalBuffData.TryGetValue(portalId, out var portal))
            return GridFightPortalRuntimeEffects.Empty;

        var rewards = new List<GridFightRewardEntry>();
        foreach (var bonusId in portal.ShowBonusIDList)
            if (GridFightSpecialFeatures.TryResolveBonus(bonusId, out var resolved))
                rewards.AddRange(resolved);

        var roleIds = rewards
            .Where(reward => reward.Type == GridFightBonusTypeEnum.SpecificAvatar)
            .Select(reward => reward.ItemId)
            .Where(roleId => GameData.GridFightRoleBasicInfoData.ContainsKey(roleId) &&
                             GameData.GridFightRoleStarData.ContainsKey(roleId << 4 | 1))
            .Distinct()
            .ToList();
        var equipments = rewards
            .Where(reward => reward.Type == GridFightBonusTypeEnum.Item)
            .Select(reward => GameData.GridFightEquipmentData.GetValueOrDefault(reward.ItemId))
            .Where(equipment => equipment != null)
            .Cast<GridFightEquipmentExcel>()
            .DistinctBy(equipment => equipment.ID)
            .ToList();

        var basicEquipmentIds = equipments
            .Where(equipment => equipment.EquipCategory == GridFightEquipCategoryEnum.Basic)
            .Select(equipment => equipment.ID)
            .ToList();
        if (roleIds.Count >= 2 && basicEquipmentIds.Count > 0)
        {
            var boostPercent = portal.EffectParamList.ElementAtOrDefault(2)?.Value ?? 0;
            var traits = portal.PortalGameRefTrait.Where(traitId => traitId != 0).ToHashSet();
            var multiplier = boostPercent == 0 ? 1.0 : 1.0 + boostPercent / 100.0;
            return new GridFightPortalRuntimeEffects(roleIds, basicEquipmentIds, traits, multiplier);
        }

        var emblemIds = equipments
            .Where(equipment => equipment.EquipCategory == GridFightEquipCategoryEnum.Emblem)
            .Select(equipment => equipment.ID)
            .ToList();
        return emblemIds.Count > 0
            ? new GridFightPortalRuntimeEffects([], emblemIds, new HashSet<uint>(), 1.0)
            : GridFightPortalRuntimeEffects.Empty;
    }

    public uint GetEnemyDifficultyLevel(uint divisionId)
    {
        return GameData.GridFightDivisionStageData[divisionId].EnemyDifficultyLevel;
    }

    public uint GetInitialLineupHp(uint divisionId)
    {
        if (divisionId != HighestDivision.ID) return InitialHp;
        var reduction = GetEffectParameter(
            GameData.GridFightAffixConfigData[HighestDivisionStartingHpAffixId].EffectParamList,
            0);
        return reduction >= InitialHp ? 0 : InitialHp - reduction;
    }

    public uint GetPostBattleHealing()
    {
        return GetEffectParameter(
            GameData.GridFightTalentData[PostBattleHealingTalentId].EffectParamList,
            PostBattleHealingEffectIndex);
    }

    public uint GetFinalBattleTurnHealing(uint roundCount)
    {
        var talent = GameData.GridFightSeasonTalentData[FinalBattleTurnHealingTalentId];
        var threshold = GetEffectParameter(talent.EffectParamList, FinalBattleTurnThresholdEffectIndex);
        return roundCount < threshold
            ? GetEffectParameter(talent.EffectParamList, FinalBattleTurnHealingEffectIndex)
            : 0;
    }

    public GridFightPenaltyRuleExcel GetPenaltyRule(uint penaltyRuleId)
    {
        if (!GameData.GridFightPenaltyRuleData.TryGetValue(penaltyRuleId, out var rule))
            throw new InvalidDataException($"Missing GridFight penalty rule: {penaltyRuleId}");
        return rule;
    }

    public uint CalculateInterest(uint balance)
    {
        return Math.Min(balance / DepositPerInterest, MaxInterestGold);
    }

    public uint GetVictoryGoldBonus(uint keepWinCount)
    {
        return GameData.GridFightVictoryBonusData.Values
            .Where(row => row.VictoryCount <= keepWinCount)
            .OrderBy(row => row.VictoryCount)
            .Last()
            .GoldBonus;
    }

    public uint GetBuyPrice(uint roleId, uint star = 1)
    {
        var role = GameData.GridFightRoleBasicInfoData[roleId];
        var prices = GameData.GridFightShopPriceData[role.Rarity].BuyGoldList;
        return prices[(int)Math.Clamp(star, 1u, (uint)prices.Count) - 1];
    }

    public uint GetSellPrice(uint roleId, uint star)
    {
        var role = GameData.GridFightRoleBasicInfoData[roleId];
        var prices = GameData.GridFightShopPriceData[role.Rarity].SellGoldList;
        return prices[(int)Math.Clamp(star, 1u, (uint)prices.Count) - 1];
    }

    /// <summary>按玩家等级稀有度权重抽取商店角色；excludedRoleIds 为已满三星（含同切换组）不再出现的角色。</summary>
    public IReadOnlyList<GridFightRoleBasicInfoExcel> RollShop(
        uint level,
        IReadOnlyCollection<uint>? excludedRoleIds = null,
        IReadOnlyList<GridFightRoleBasicInfoExcel>? extraCandidates = null,
        IReadOnlySet<uint>? boostedTraitIds = null,
        double boostedTraitMultiplier = 1.0,
        IReadOnlyList<double>? rarityWeights = null)
    {
        var count = checked((int)ShopSize);
        var weights = rarityWeights ?? GetShopRarityWeights(level).Select(weight => (double)weight).ToArray();
        var excluded = excludedRoleIds is { Count: > 0 }
            ? excludedRoleIds as HashSet<uint> ?? excludedRoleIds.ToHashSet()
            : null;
        var pool = extraCandidates is { Count: > 0 }
            ? RolePool.Concat(extraCandidates).DistinctBy(role => role.ID).ToList()
            : RolePool;

        var result = new List<GridFightRoleBasicInfoExcel>(count);
        for (var index = 0; index < count; index++)
        {
            var rarity = RollIndex(weights) + 1u;
            var candidates = pool
                .Where(role => role.Rarity == rarity && (excluded == null || !excluded.Contains(role.ID)))
                .ToList();
            // 该稀有度在排除后为空：退回「全池但排除满星」
            if (candidates.Count == 0)
                candidates = pool
                    .Where(role => excluded == null || !excluded.Contains(role.ID))
                    .ToList();
            // 仍为空（几乎全满星）：兜底不排除，避免商店抽空崩溃
            if (candidates.Count == 0)
                candidates = pool.Where(role => role.Rarity == rarity).ToList();
            if (candidates.Count == 0)
                candidates = pool.ToList();

            result.Add(PickShopCandidate(candidates, boostedTraitIds, boostedTraitMultiplier));
        }
        return result;
    }

    private GridFightRoleBasicInfoExcel PickShopCandidate(
        IReadOnlyList<GridFightRoleBasicInfoExcel> candidates,
        IReadOnlySet<uint>? boostedTraitIds,
        double boostedTraitMultiplier)
    {
        if (candidates.Count == 0)
            throw new InvalidOperationException("GridFight shop candidate list is empty");
        if (boostedTraitIds is not { Count: > 0 } ||
            !double.IsFinite(boostedTraitMultiplier) ||
            boostedTraitMultiplier <= 1.0)
            return candidates[_random.Next(candidates.Count)];

        var total = candidates.Sum(role =>
            role.TraitList.Any(boostedTraitIds.Contains) ? boostedTraitMultiplier : 1.0);
        var roll = _random.NextDouble() * total;
        foreach (var role in candidates)
        {
            var weight = role.TraitList.Any(boostedTraitIds.Contains) ? boostedTraitMultiplier : 1.0;
            if (roll < weight) return role;
            roll -= weight;
        }
        return candidates[^1];
    }

    public IReadOnlyList<GridFightRoleBasicInfoExcel> RollInitialRoles(int count)
    {
        var candidates = RolePool.Where(role => !InitialExcludedRoleIds.Contains(role.ID)).ToList();
        return TakeRandomDistinct(candidates, count);
    }

    public IReadOnlyList<uint> RollPortalOffer(int count)
    {
        return TakeRandomDistinct(PortalPool.ToList(), count);
    }

    public GridFightAugmentQualityEnum RollInvestmentQuality(
        uint chapterId,
        int count,
        IEnumerable<uint>? exclude = null)
    {
        var excluded = exclude?.ToHashSet() ?? [];
        var qualities = Enum.GetValues<GridFightAugmentQualityEnum>()
            .Where(quality => quality != GridFightAugmentQualityEnum.None)
            .Where(quality => GetInvestmentCandidates(chapterId, quality).Count(id => !excluded.Contains(id)) >= count)
            .ToList();
        return qualities[_random.Next(qualities.Count)];
    }

    public IReadOnlyList<uint> RollInvestmentOffer(
        uint chapterId,
        GridFightAugmentQualityEnum quality,
        int count,
        IEnumerable<uint>? exclude = null)
    {
        var excluded = exclude?.ToHashSet() ?? [];
        var candidates = GetInvestmentCandidates(chapterId, quality)
            .Where(id => !excluded.Contains(id))
            .ToList();
        return TakeRandomDistinct(candidates, count);
    }

    private List<uint> GetInvestmentCandidates(uint chapterId, GridFightAugmentQualityEnum quality)
    {
        return AugmentPool
            .Where(id => GameData.GridFightAugmentData.TryGetValue(id, out var augment) &&
                         augment.Quality == quality &&
                         (augment.ChapterLimitList.Count == 0 || augment.ChapterLimitList.Contains(chapterId)))
            .ToList();
    }

    public IReadOnlyList<(uint RoleId, uint EquipmentId)> RollSupplyOffer(int count)
    {
        var roles = TakeRandomDistinct(RolePool.ToList(), count);
        return roles.Select(role =>
            (role.ID, BasicEquipmentPool[_random.Next(BasicEquipmentPool.Count)])).ToList();
    }

    public IReadOnlyList<uint> RollForgeEquipment(uint forgeItemId)
    {
        if (!GameData.GridFightForgeData.TryGetValue(forgeItemId, out var forge) ||
            forge.FuncType != GridFightForgeFuncTypeEnum.Equip)
            return [];
        var category = (GridFightEquipCategoryEnum)forge.ParamList.FirstOrDefault();
        var candidates = GameData.GridFightEquipmentData.Values
            .Where(row => row.EquipCategory == category)
            .Select(row => row.ID)
            .Distinct()
            .ToList();
        if (candidates.Count < forge.EquipNum) return [];
        return TakeRandomDistinct(candidates, checked((int)forge.EquipNum));
    }

    public uint RollEquipment(GridFightEquipCategoryEnum category, uint excludedEquipmentId)
    {
        var candidates = GameData.GridFightEquipmentData.Values
            .Where(equipment => equipment.EquipCategory == category && equipment.ID != excludedEquipmentId)
            .Select(equipment => equipment.ID)
            .Order()
            .ToList();
        return candidates.Count == 0 ? 0 : candidates[_random.Next(candidates.Count)];
    }

    public IReadOnlyList<uint> RollRecommendedEquipment(uint roleId, string frontBackType, int count)
    {
        if (count <= 0 || !GameData.GridFightRoleRecommendEquipData.TryGetValue(roleId, out var rows)) return [];
        var row = rows.FirstOrDefault(candidate =>
                      string.Equals(candidate.FrontBackType, frontBackType, StringComparison.OrdinalIgnoreCase)) ??
                  rows.FirstOrDefault();
        if (row == null) return [];

        var firstCount = (count + 1) / 2;
        var selected = TakeRandomDistinct(row.FirstRecommendEquipList.Distinct().ToList(), firstCount).ToList();
        selected.AddRange(TakeRandomDistinct(
            row.SecondRecommendEquipList.Where(id => !selected.Contains(id)).Distinct().ToList(),
            count - selected.Count));
        if (selected.Count < count)
            selected.AddRange(TakeRandomDistinct(
                row.FirstRecommendEquipList.Concat(row.SecondRecommendEquipList)
                    .Where(id => !selected.Contains(id)).Distinct().ToList(),
                count - selected.Count));
        return TakeRandomDistinct(selected, selected.Count);
    }

    public uint GetInvestmentDifficultyAdd(uint divisionId, uint augmentId)
    {
        if (!GameData.GridFightDivisionInfoData.TryGetValue(divisionId, out var division) ||
            !GameData.GridFightAugmentData.TryGetValue(augmentId, out var augment) ||
            !GameData.GridFightAugmentMonsterData.TryGetValue(division.DivisionLevel, out var byQuality) ||
            !byQuality.TryGetValue(augment.Quality, out var difficulty))
            return 0;
        return difficulty.EnemyDiffLvAdd;
    }

    public IReadOnlyList<uint> RollCampIds(int count)
    {
        return TakeRandomDistinct(CampPool.ToList(), count).Select(camp => camp.ID).ToList();
    }

    public uint RollRewardCampId()
    {
        return RewardCampPool[_random.Next(RewardCampPool.Count)].ID;
    }

    public GridFightMonsterExcel RollBossMonster(uint campId, GridFightRouteNode bossNode)
    {
        var parameter = bossNode.Parameters.FirstOrDefault();
        if (!GameData.GridFightRewardRulesConfig.BossNodeProfiles.TryGetValue(parameter, out var profile))
            throw new InvalidOperationException($"GridFight boss node {parameter} has no battle profile");
        var candidates = GameData.GridFightCampData[campId].MonsterList
            .Select(id => GameData.GridFightMonsterData[id])
            .Where(monster => monster.MonsterTier == profile.MonsterTier)
            .ToList();
        if (candidates.Count == 0)
            throw new InvalidOperationException(
                $"GridFight camp {campId} has no tier {profile.MonsterTier} boss monster");
        return candidates[_random.Next(candidates.Count)];
    }

    public IReadOnlyList<uint> RollAffixIds(uint divisionId)
    {
        var counts = GameData.GridFightDivisionStageData[divisionId].AffixChooseNumList;
        var result = new List<uint>();
        for (var index = 0; index < counts.Count; index++)
        {
            var group = (uint)index + 1;
            var candidates = GameData.GridFightAffixConfigData.Values
                .Where(affix => affix.ID / 1000 == group)
                .OrderBy(affix => affix.ID)
                .ToList();
            result.AddRange(TakeRandomDistinct(candidates, checked((int)counts[index])).Select(affix => affix.ID));
        }
        return result;
    }

    public GridFightBattlePlan? RollBattlePlan(
        GridFightRouteNode node,
        IReadOnlyList<uint> activeCampIds,
        uint rewardCampId,
        IReadOnlyList<GridFightMonsterExcel> bosses)
    {
        if (node.NodeType is GridFightNodeTypeEnum.GridFightNodeNone or GridFightNodeTypeEnum.Supply)
            return null;

        var parameter = node.Parameters.FirstOrDefault();
        if (node.NodeType == GridFightNodeTypeEnum.Boss)
        {
            var bossIndex = checked((int)node.ChapterId - 1);
            if (bossIndex < 0 || bossIndex >= bosses.Count) return null;
            return BuildPlan(
                activeCampIds.ElementAtOrDefault(bossIndex),
                node,
                [BuildBossMonsterPlans(activeCampIds.ElementAtOrDefault(bossIndex), bosses[bossIndex])],
                [ResolveFormationWaveId(BossFormationMaxTeammateCount)]);
        }

        if (node.NodeType == GridFightNodeTypeEnum.Monster)
        {
            if (!GameData.GridFightRewardRulesConfig.NodeProfiles.TryGetValue(parameter, out var rewardProfile))
                return null;
            return BuildPlan(
                rewardCampId,
                node,
                [RollRewardMonsters(rewardCampId, rewardProfile)],
                [rewardProfile.FormationWaveId]);
        }

        var campId = activeCampIds[_random.Next(activeCampIds.Count)];
        var tier2 = GetCampMonsters(campId, monster => monster.MonsterTier == 2);
        var tier3 = GetCampMonsters(campId, monster => monster.MonsterTier == 3);
        if (tier2.Count == 0)
            tier2 = GetCampMonsters(campId, monster => monster.MonsterTier < 3);
        if (tier2.Count == 0) return null;

        if (node.NodeType == GridFightNodeTypeEnum.EliteBranch)
            return BuildEncounterBattlePlan(node, campId, tier2, tier3, 1);

        if (!GameData.GridFightRewardRulesConfig.CombatNodeProfiles.TryGetValue(parameter, out var combatProfile))
            return null;
        var totalCount = checked((int)combatProfile.Waves.Sum(wave => wave.MonsterCount));
        var monsters = combatProfile.EliteMonsterCount == 0
            ? RollEarlyMonsters(tier2, totalCount, combatProfile.MaxRoleStar)
            : RollMixedMonsters(
                tier2,
                tier3,
                totalCount,
                checked((int)combatProfile.EliteMonsterCount),
                combatProfile.MaxRoleStar);
        return BuildPlan(
            campId,
            node,
            SplitWaves(monsters, combatProfile.Waves),
            combatProfile.Waves.Select(wave => ResolveFormationWaveId(wave.MaxActiveMonsterCount)).ToList());
    }

    public IReadOnlyList<GridFightEncounterOptionState> RollEncounterOptions(
        GridFightRouteNode node,
        IReadOnlyList<uint> activeCampIds,
        uint divisionId)
    {
        var group = node.Parameters.FirstOrDefault();
        var ruleIds = GameData.GridFightBinaryNodeRuleData.Values
            .Where(rule => rule.ID / 100 == group)
            .OrderBy(rule => rule.Quality)
            .ToList();
        if (ruleIds.Count == 0)
            ruleIds = GameData.GridFightBinaryNodeRuleData.Values
                .Where(rule => rule.ID is >= 1 and <= 4)
                .OrderBy(rule => rule.Quality)
                .ToList();
        ruleIds = ruleIds.Where(rule => rule.Quality is 1 or 2 or 4).ToList();
        var rules = TakeRandomDistinct(ruleIds, 2).OrderBy(rule => rule.Quality).ToList();
        var result = new List<GridFightEncounterOptionState>(rules.Count);
        var campId = activeCampIds[_random.Next(activeCampIds.Count)];
        var tier2 = GetCampMonsters(campId, monster => monster.MonsterTier == 2);
        var tier3 = GetCampMonsters(campId, monster => monster.MonsterTier == 3);
        if (tier2.Count == 0) tier2 = GetCampMonsters(campId, monster => monster.MonsterTier < 3);
        for (var index = 0; index < rules.Count; index++)
        {
            var rule = rules[index];
            var plan = BuildEncounterBattlePlan(node, campId, tier2, tier3, rule.Quality);
            var penaltyRuleId = 91000u + node.ChapterId * 100 + 10 + rule.Quality;
            plan = plan with
            {
                PenaltyRuleId = penaltyRuleId,
                DifficultyAdd = GetEncounterDifficultyAdd(divisionId, rule.Quality),
            };
            result.Add(new GridFightEncounterOptionState(
                (uint)index + 1,
                group * 100 + rule.Quality,
                rule.Quality,
                plan));
        }
        return result;
    }

    public uint GetEncounterDifficultyAdd(uint divisionId, uint quality)
    {
        if (!GameData.GridFightDivisionStageData.TryGetValue(divisionId, out var stage) ||
            !GameData.GridFightBinaryDiffAddRuleData.TryGetValue(stage.BinaryNodeDiffAddRule, out var rules) ||
            !rules.TryGetValue(quality, out var rule))
            return 0;
        return rule.EnemyDifficultyAddValue;
    }

    private GridFightBattlePlan BuildEncounterBattlePlan(
        GridFightRouteNode node,
        uint campId,
        IReadOnlyList<GridFightMonsterExcel> tier2,
        IReadOnlyList<GridFightMonsterExcel> tier3,
        uint quality)
    {
        var profile = GameData.GridFightRewardRulesConfig.EncounterBattleProfile;
        var totalCount = _random.Next(
            checked((int)profile.MinimumMonsterCount),
            checked((int)profile.MaximumMonsterCount + 1));
        var eliteCount = tier3.Count == 0 ? 0 : Math.Clamp(2 + checked((int)quality - 1) / 2, 2, 3);
        return BuildPlan(campId, node,
            [RollMixedMonsters(tier2, tier3, totalCount, eliteCount, profile.MaxRoleStar)],
            [ResolveFormationWaveId(profile.MaxActiveMonsterCount)]);
    }

    private GridFightBattlePlan BuildPlan(
        uint campId,
        GridFightRouteNode node,
        IReadOnlyList<IReadOnlyList<GridFightMonsterPlan>> waves,
        IReadOnlyList<uint> formationWaveIds)
    {
        var result = waves.Select((monsters, index) => new GridFightMonsterWavePlan(
            (uint)index + 1,
            formationWaveIds[Math.Min(index, formationWaveIds.Count - 1)],
            monsters)).ToList();
        return new GridFightBattlePlan(
            campId,
            ResolveEliteGroupId(node),
            node.PenaltyBonusRuleId,
            0,
            result);
    }

    private uint ResolveEliteGroupId(GridFightRouteNode node)
    {
        if (node.NodeType == GridFightNodeTypeEnum.Monster)
        {
            var parameter = node.Parameters.FirstOrDefault();
            return parameter <= 901 ? 1816u : 1815u + parameter - 900;
        }
        var combatNodes = StandardRoute.Where(candidate => candidate.NodeType is
            GridFightNodeTypeEnum.CampMonster or GridFightNodeTypeEnum.EliteBranch or GridFightNodeTypeEnum.Boss).ToList();
        var index = combatNodes.FindIndex(candidate =>
            candidate.ChapterId == node.ChapterId && candidate.SectionId == node.SectionId);
        return index < 0 ? 0 : 1801u + (uint)index;
    }

    private static uint ResolveFormationWaveId(uint maxTeammateCount)
    {
        return GameData.GridFightFormationWaveData.Values
            .Single(row => row.MaxTeammateCount == maxTeammateCount).ID;
    }

    private static IReadOnlyList<GridFightMonsterPlan> BuildBossMonsterPlans(
        uint campId,
        GridFightMonsterExcel boss)
    {
        var result = new List<GridFightMonsterPlan> { new(boss, BossRoleStar) };
        if (!GameData.MonsterConfigData.TryGetValue((int)boss.MonsterID, out var bossConfig)) return result;

        var componentByTemplate = GetCampMonsters(campId, monster => monster.MonsterTier == 0)
            .Select(monster => new
            {
                Monster = monster,
                Config = GameData.MonsterConfigData.GetValueOrDefault((int)monster.MonsterID),
            })
            .Where(entry => entry.Config != null)
            .GroupBy(entry => entry.Config!.MonsterTemplateID)
            .Where(group => group.Count() == 1)
            .ToDictionary(group => group.Key, group => group.Single().Monster);
        if (componentByTemplate.Count == 0) return result;

        var components = GameData.StageConfigData.Values
            .SelectMany(stage => stage.MonsterList)
            .Select(GetStageMonsterIds)
            .Where(ids => ids.Count(id => ResolveMonsterTemplateId(id) == bossConfig.MonsterTemplateID) == 1)
            .Select(ids => ids
                .Where(id => ResolveMonsterTemplateId(id) != bossConfig.MonsterTemplateID)
                .Select(id => componentByTemplate.GetValueOrDefault(ResolveMonsterTemplateId(id)))
                .ToList())
            .Where(monsters => monsters.Count > 0 && monsters.All(monster => monster != null))
            .Select(monsters => monsters.OfType<GridFightMonsterExcel>().ToList())
            .OrderByDescending(monsters => monsters.Count)
            .FirstOrDefault();
        if (components == null) return result;

        result.AddRange(components.Select(monster => new GridFightMonsterPlan(monster, BossRoleStar)));
        return result;
    }

    private static IReadOnlyList<int> GetStageMonsterIds(StageMonsterList monsters)
    {
        return new[] { monsters.Monster0, monsters.Monster1, monsters.Monster2, monsters.Monster3, monsters.Monster4 }
            .Where(id => id != 0)
            .ToList();
    }

    private static int ResolveMonsterTemplateId(int monsterId)
    {
        return GameData.MonsterConfigData.TryGetValue(monsterId, out var config)
            ? config.MonsterTemplateID
            : monsterId;
    }

    private static IReadOnlyList<IReadOnlyList<GridFightMonsterPlan>> SplitWaves(
        IReadOnlyList<GridFightMonsterPlan> monsters,
        IReadOnlyList<GridFightCombatWaveProfile> waveProfiles)
    {
        var result = new List<IReadOnlyList<GridFightMonsterPlan>>(waveProfiles.Count);
        var offset = 0;
        foreach (var profile in waveProfiles)
        {
            var count = checked((int)profile.MonsterCount);
            result.Add(monsters.Skip(offset).Take(count).ToList());
            offset += count;
        }
        return result;
    }

    private IReadOnlyList<GridFightMonsterPlan> RollEarlyMonsters(
        IReadOnlyList<GridFightMonsterExcel> pool,
        int count,
        uint maxStar)
    {
        var result = RollMonsters(pool, count, 1).ToList();
        var enhanced = maxStar >= 2 ? Math.Min(2, count) : 0;
        for (var index = 0; index < enhanced; index++)
            result[index] = result[index] with { RoleStar = index == 0 && maxStar >= 3 ? 3u : 2u };
        Shuffle(result);
        return result;
    }

    private IReadOnlyList<GridFightMonsterPlan> RollRewardMonsters(
        uint campId,
        GridFightRewardNodeProfile profile)
    {
        var monsters = new List<GridFightMonsterExcel>(profile.MonsterTiers.Count);
        foreach (var tier in profile.MonsterTiers)
        {
            var pool = GetCampMonsters(campId, monster => monster.MonsterTier == tier);
            if (pool.Count == 0) return [];
            monsters.Add(pool[_random.Next(pool.Count)]);
        }
        Shuffle(monsters);

        var drops = Enumerable.Range(0, monsters.Count)
            .Select(_ => new List<GridFightRewardEntry>())
            .ToList();
        var remaining = profile.OrbRollCount;
        for (var minimumIndex = 0u; minimumIndex < profile.MinimumOrbPerMonster; minimumIndex++)
        for (var monsterIndex = 0; monsterIndex < monsters.Count; monsterIndex++)
        {
            drops[monsterIndex].Add(new GridFightRewardEntry(
                GridFightBonusTypeEnum.Orb,
                RollWeightedOrb(profile.OrbWeights),
                1));
            remaining--;
        }
        while (remaining > 0)
        {
            var monsterIndex = _random.Next(monsters.Count);
            drops[monsterIndex].Add(new GridFightRewardEntry(
                GridFightBonusTypeEnum.Orb,
                RollWeightedOrb(profile.OrbWeights),
                1));
            remaining--;
        }
        return monsters.Select((monster, index) =>
            new GridFightMonsterPlan(monster, profile.RoleStar, drops[index])).ToList();
    }

    private uint RollWeightedOrb(IReadOnlyDictionary<uint, uint> weights)
    {
        var total = weights.Values.Aggregate(0L, (sum, weight) => sum + weight);
        var roll = _random.NextInt64(total);
        foreach (var (orbId, weight) in weights.OrderBy(entry => entry.Key))
        {
            if (roll < weight) return orbId;
            roll -= weight;
        }
        throw new InvalidOperationException("GridFight orb weight selection failed");
    }

    private IReadOnlyList<GridFightMonsterPlan> RollMixedMonsters(
        IReadOnlyList<GridFightMonsterExcel> tier2,
        IReadOnlyList<GridFightMonsterExcel> tier3,
        int totalCount,
        int eliteCount,
        uint maxStar)
    {
        eliteCount = Math.Min(eliteCount, totalCount);
        var result = RollMonsters(tier3.Count > 0 ? tier3 : tier2, eliteCount, Math.Min(2u, maxStar)).ToList();
        result.AddRange(RollMonsters(tier2, totalCount - eliteCount, 1));
        var enhancedCount = Math.Min(3, result.Count);
        for (var index = 0; index < enhancedCount; index++)
            result[index] = result[index] with { RoleStar = Math.Min(maxStar, (uint)(2 + index / 2)) };
        Shuffle(result);
        return result;
    }

    private IReadOnlyList<GridFightMonsterPlan> RollMonsters(
        IReadOnlyList<GridFightMonsterExcel> pool,
        int count,
        uint star)
    {
        return Enumerable.Range(0, count)
            .Select(_ => new GridFightMonsterPlan(pool[_random.Next(pool.Count)], star))
            .ToList();
    }

    private static List<GridFightMonsterExcel> GetCampMonsters(
        uint campId,
        Func<GridFightMonsterExcel, bool> predicate)
    {
        if (!GameData.GridFightCampData.TryGetValue(campId, out var camp)) return [];
        return camp.MonsterList
            .Select(id => GameData.GridFightMonsterData.GetValueOrDefault(id))
            .OfType<GridFightMonsterExcel>()
            .Where(predicate)
            .ToList();
    }

    private void Shuffle<T>(IList<T> values)
    {
        for (var index = values.Count - 1; index > 0; index--)
        {
            var other = _random.Next(index + 1);
            (values[index], values[other]) = (values[other], values[index]);
        }
    }

    private uint ResolveContentModuleId()
    {
        var moduleIds = GameData.GridFightModuleBanRoleData.Select(row => row.ModuleId)
            .Concat(GameData.GridFightModuleBanPortalData.Select(row => row.ModuleId))
            .Concat(GameData.GridFightModuleBanAugmentData.Select(row => row.ModuleId))
            .Distinct()
            .Order()
            .ToList();
        return moduleIds.Count > 0 ? moduleIds[^1] : ActivityModuleId;
    }

    private uint ResolveStandardRouteId()
    {
        var excluded = GetUIntList("GridFight_TutorialStageList")
            .Select(divisionId => divisionId * 100)
            .ToHashSet();
        excluded.UnionWith(GameData.GridFightTutorialStageData.Keys.Select(id => id * 100));
        excluded.Add(GetUInt("GridFight_FirstPlay_StageRouteID"));

        return GameData.GridFightStageRouteData
            .Where(pair => !excluded.Contains(pair.Key))
            .Where(pair => pair.Value.Values.All(row =>
                GameData.GridFightNodeTemplateData.ContainsKey(row.NodeTemplateID)))
            .OrderBy(pair => pair.Value.Count)
            .ThenBy(pair => pair.Key)
            .Last().Key;
    }

    private static IReadOnlyList<GridFightRouteNode> BuildRoute(uint routeId)
    {
        return GameData.GridFightStageRouteData[routeId].Values
            .OrderBy(row => row.ChapterID)
            .ThenBy(row => row.SectionID)
            .Select(row => new GridFightRouteNode(
                row.ID,
                row.ChapterID,
                row.SectionID,
                GameData.GridFightNodeTemplateData[row.NodeTemplateID]))
            .ToList();
    }

    private uint ResolveInitialGold()
    {
        var poolId = RequireUInt("GridFight_InitRandomBonusPool");
        if (!GameData.GridFightBonusPoolV2Data.TryGetValue(poolId, out var pool)) return 0;
        return pool.BonusList.Any(id => GameData.GridFightBasicBonusPoolV2Data.TryGetValue(id, out var bonus) &&
                                       bonus.BonusType == GridFightBonusTypeEnum.Gold)
            ? pool.TotalValue
            : 0;
    }

    private uint RollIndex(IReadOnlyList<double> weights)
    {
        var total = weights.Where(double.IsFinite).Where(weight => weight > 0).Sum();
        if (total <= 0) return 0;
        var roll = _random.NextDouble() * total;
        for (var index = 0; index < weights.Count; index++)
        {
            var weight = weights[index];
            if (!double.IsFinite(weight) || weight <= 0) continue;
            if (roll < weight) return (uint)index;
            roll -= weight;
        }
        return (uint)(weights.Count - 1);
    }

    private IReadOnlyList<T> TakeRandomDistinct<T>(List<T> candidates, int count)
    {
        var result = new List<T>(Math.Min(count, candidates.Count));
        while (result.Count < count && candidates.Count > 0)
        {
            var index = _random.Next(candidates.Count);
            result.Add(candidates[index]);
            candidates.RemoveAt(index);
        }
        return result;
    }

    private static uint RequireUInt(string key)
    {
        if (!GameData.GridFightConstValueData.TryGetValue(key, out var value))
            throw new InvalidDataException($"Missing GridFight constant: {key}");
        return value.AsUInt32();
    }

    private static uint GetUInt(string key)
    {
        return GameData.GridFightConstValueData.GetValueOrDefault(key)?.AsUInt32() ?? 0;
    }

    private static IReadOnlyList<uint> GetUIntList(string key)
    {
        return GameData.GridFightConstValueData.GetValueOrDefault(key)?.AsUInt32List() ?? [];
    }

    private static bool HasEffectParameter(GridFightAffixConfigExcel? row, int index)
    {
        return row?.EffectParamList.Count > index && row.EffectParamList[index].Value >= 0;
    }

    private static bool HasEffectParameter(GridFightTalentExcel? row, int index)
    {
        return row?.EffectParamList.Count > index && row.EffectParamList[index].Value >= 0;
    }

    private bool HasFinalBattleTurnHealing()
    {
        return GameData.GridFightSeasonTalentData.TryGetValue(FinalBattleTurnHealingTalentId, out var row) &&
               row.SeasonID == CurrentSeason &&
               row.EffectParamList.Count > FinalBattleTurnHealingEffectIndex &&
               row.EffectParamList[FinalBattleTurnThresholdEffectIndex].Value > 0 &&
               row.EffectParamList[FinalBattleTurnHealingEffectIndex].Value >= 0;
    }

    private static uint GetEffectParameter(IReadOnlyList<GridFightRatioValue> parameters, int index)
    {
        return checked((uint)Math.Floor(parameters[index].Value));
    }

    public uint GetSettleRank(uint lineupHp)
    {
        var row = FindSettleRank(lineupHp) ??
                  throw new InvalidDataException($"Missing GridFight settle rank for lineup HP {lineupHp}");
        return ToProtocolSettleRank(row);
    }

    public uint GetMinimumSettleRank()
    {
        var row = GameData.GridFightSettleRankData.Values.OrderBy(candidate => candidate.ID).FirstOrDefault() ??
                  throw new InvalidDataException("Missing GridFight settle rank table");
        return ToProtocolSettleRank(row);
    }

    private static GridFightSettleRankExcel? FindSettleRank(uint lineupHp)
    {
        return GameData.GridFightSettleRankData.Values
            .Where(row => lineupHp >= row.Rank_LeftInterval && lineupHp <= row.Rank_RightInterval)
            .OrderBy(row => row.ID)
            .FirstOrDefault();
    }

    private static uint ToProtocolSettleRank(GridFightSettleRankExcel row)
    {
        return row.ID == 0 ? 0 : row.ID - 1;
    }
}
