using March7thHoney.Data;
using March7thHoney.Data.Custom;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.GridFight;

namespace March7thHoney.GameServer.Game.GridFight;

public enum GridFightRoleUnlockEffect
{
    CyrenePoemShop,
    SilverWolfHackConsole,
}

public sealed record GridFightRewardEntry(
    GridFightBonusTypeEnum Type,
    uint ItemId,
    uint Count,
    uint RoleStar = 0);

public sealed class GridFightRewardApplication
{
    public bool Success { get; init; }
    public uint SourceUniqueId { get; init; }
    public uint SourceItemId { get; init; }
    public bool GoldChanged { get; set; }
    public bool PlayerLevelChanged { get; set; }
    public bool PlayerExpChanged { get; set; }
    public bool LineupHpChanged { get; set; }
    public bool RolePropertiesChanged { get; set; }
    public List<GridFightRewardEntry> Drops { get; } = [];
    public List<GridFightRoleAcquisitionResult> RoleAcquisitions { get; } = [];
    public List<GridFightEquipmentState> AddedEquipments { get; } = [];
    public List<GridFightConsumableChange> ConsumableChanges { get; } = [];
    public List<GridFightOrbState> AddedOrbs { get; } = [];
    public List<GridFightForgeItemState> AddedForgeItems { get; } = [];
}

public sealed record GridFightConsumableChange(
    GridFightConsumableState Consumable,
    bool IsNew,
    uint StackDelta);

public sealed class GridFightForgeItemState
{
    public uint UniqueId { get; init; }
    public uint ForgeItemId { get; init; }
    public uint Position { get; set; }
    public IReadOnlyList<uint> EquipmentChoices { get; init; } = [];
}

public sealed class GridFightHackConsoleState
{
    public uint GameItemUniqueId { get; init; }
    public uint RemainingGoldActions { get; set; } = GridFightSpecialFeatures.HackGoldActionCount;
    public uint RemainingHealActions { get; set; } = GridFightSpecialFeatures.HackHealActionCount;
    public uint RemainingOrbActions { get; set; } = GridFightSpecialFeatures.HackOrbActionCount;
    public uint EnemyHpPercent { get; set; } = GridFightSpecialFeatures.InitialHackEnemyHpPercent;
}

public sealed record GridFightSpecialGoodsPurchaseResult(
    uint GoodsIndex,
    uint SpecialGoodsId,
    GridFightRewardApplication Application);

public sealed record GridFightTraitEnhanceActivationResult(
    bool Success,
    uint FinishedQueuePosition,
    GridFightEquipmentState? Equipment,
    GridFightRoleState? UpdatedRole = null,
    bool ShopNeedsRefresh = false,
    IReadOnlyList<GridFightRoleState>? UpdatedRoles = null,
    GridFightRoleAcquisitionResult? FollowUpAcquisition = null)
{
    public static GridFightTraitEnhanceActivationResult Failed { get; } = new(false, 0, null);
}

public sealed record GridFightHackOptionResult(
    bool Success,
    uint OptionId,
    GridFightRewardApplication Application)
{
    public static GridFightHackOptionResult Failed { get; } =
        new(false, 0, new GridFightRewardApplication());
}

public static class GridFightSpecialFeatures
{
    public const uint CyreneRoleId = 1415;
    public const uint CyreneHealGoodsId = 201;
    public const uint CyreneWealthGoodsId = 202;
    public const uint CyreneInsigniaGoodsId = 203;
    public const uint CyreneCombatGoodsId = 204;
    public const uint CyreneHeroGoodsId = 205;
    public const uint CyreneHealAmount = 100;
    public const uint CyreneWealthBonusId = 11059;
    public const uint CyreneInsigniaBonusId = 11060;
    public const uint CyreneHeroBonusId = 11063;
    public const uint SilverWolfTraitId = 3006;
    public const uint SilverWolfHackEquipmentId = 352507;

    /// <summary>最低 / 最高费用档角色 ID。</summary>
    public static uint SilverWolfBaseRoleId => SilverWolfRoleChain.FirstOrDefault();

    public static uint SilverWolfTopRoleId => SilverWolfRoleChain.LastOrDefault();

    /// <summary>终局手套所在的 TraitEffect 组，即最高费用档。</summary>
    public static uint SilverWolfTraitEffectId => SilverWolfEffectGroups.LastOrDefault();

    /// <summary>终局手套对应的骇入选项，反查 EffectParamList 指向 352507 的那一条。</summary>
    public static uint SilverWolfEnhanceOptionId =>
        GameData.GridFightEnhanceData.Values
            .FirstOrDefault(row => row.FirstEffectParam == SilverWolfHackEquipmentId)?.ID ?? 0;

    /// <summary>银狼费用档 → TraitEffect 组，来自 GridFightTraitBasicInfo[3006].TraitEffectList。</summary>
    public static IReadOnlyList<uint> SilverWolfEffectGroups =>
        GameData.GridFightTraitBasicInfoData.GetValueOrDefault(SilverWolfTraitId)?.TraitEffectList ?? [];

    /// <summary>某档位的全部骇入选项，来自 GridFightEnhance.GroupID。</summary>
    public static IReadOnlyList<GridFightEnhanceExcel> GetEnhanceOptions(uint effectGroupId) =>
        GameData.GridFightEnhanceData.Values
            .Where(row => row.GroupID == effectGroupId)
            .OrderBy(row => row.ID)
            .ToList();

    /// <summary>升费选项：SelectCondition 为 Permanent，EffectParamList[0] 即下一档角色 ID。</summary>
    private static GridFightEnhanceExcel? GetCostUpgradeOption(uint effectGroupId) =>
        GetEnhanceOptions(effectGroupId)
            .FirstOrDefault(row => row.SelectCondition == GridFightEnhanceConditionEnum.Permanent &&
                                   GameData.GridFightRoleBasicInfoData.ContainsKey(row.FirstEffectParam));

    /// <summary>档位内可产出装备的选项（排除升费与终局手套）。</summary>
    public static IReadOnlyList<uint> GetHackEquipmentOptionPoolForRole(uint roleId)
    {
        var group = GetSilverWolfEffectGroup(roleId);
        if (group == 0) return [];
        return GetEnhanceOptions(group)
            .Where(row => GameData.GridFightEquipmentData.ContainsKey(row.FirstEffectParam) &&
                          row.FirstEffectParam != SilverWolfHackEquipmentId)
            .Select(row => row.ID)
            .ToList();
    }

    /// <summary>角色当前所处的 TraitEffect 组，未在银狼档位链上返回 0。</summary>
    public static uint GetSilverWolfEffectGroup(uint roleId)
    {
        var tier = GetSilverWolfCostTier(roleId);
        return tier == 0 ? 0 : SilverWolfEffectGroups[(int)tier - 1];
    }

    public const uint HackAddGoldOptionId = 1;
    public const uint HackFullHealOptionId = 2;
    public const uint HackGrantOrbOptionId = 3;
    public const uint HackGoldPerAction = 10;
    public const uint HackGoldActionCount = 99;
    public const uint HackHealActionCount = 1;
    public const uint HackOrbActionCount = 5;
    public const uint MinimumEnemyHpPercent = 1;
    public const uint MaximumEnemyHpPercent = 1000;
    public const uint InitialHackEnemyHpPercent = MinimumEnemyHpPercent;
    public const uint HackEquipmentSource = 1;
    public const string HackRankFiveEquipmentConstName = "GridFight_Hack_Rank5";

    public static IReadOnlyList<uint> CyreneSpecialGoodsIds { get; } =
        [CyreneHealGoodsId, CyreneWealthGoodsId, CyreneInsigniaGoodsId, CyreneCombatGoodsId, CyreneHeroGoodsId];

    public static IReadOnlyList<uint> HackOrbIds { get; } = [111079, 111080, 111081, 111082, 111083];

    public static uint RollRandomHackOptionId(Random random, uint roleId, IReadOnlyCollection<uint>? ownedEquipmentIds = null)
    {
        var full = GetHackEquipmentOptionPoolForRole(roleId);
        var pool = full;
        if (ownedEquipmentIds is { Count: > 0 })
        {
            pool = full
                .Where(opt => !TryGetEquipmentIdForOption(opt, out var eq) || !ownedEquipmentIds.Contains(eq))
                .ToList();
        }
        if (pool.Count == 0) pool = full;
        return pool.Count == 0 ? 0 : pool[random.Next(pool.Count)];
    }

    /// <summary>选项产出的装备 ID，来自 GridFightEnhance.EffectParamList[0]。</summary>
    public static bool TryGetEquipmentIdForOption(uint optionId, out uint equipmentId)
    {
        equipmentId = 0;
        if (GameData.GridFightEnhanceData.GetValueOrDefault(optionId) is not { } row) return false;
        if (!GameData.GridFightEquipmentData.ContainsKey(row.FirstEffectParam)) return false;
        equipmentId = row.FirstEffectParam;
        return true;
    }

    public static uint GetCostUpgradeOptionId(uint currentRoleId)
    {
        var group = GetSilverWolfEffectGroup(currentRoleId);
        return group == 0 ? 0 : GetCostUpgradeOption(group)?.ID ?? 0;
    }

    public static bool TryResolveSilverWolfEquipmentId(out uint equipmentId)
    {
        equipmentId = 0;
        if (!GameData.GridFightConstValueData.TryGetValue(HackRankFiveEquipmentConstName, out var rankFiveEquipment) ||
            !rankFiveEquipment.AsUInt32List().Contains(SilverWolfHackEquipmentId) ||
            !GameData.GridFightEquipmentData.TryGetValue(SilverWolfHackEquipmentId, out var equipment) ||
            equipment.EquipCategory != GridFightEquipCategoryEnum.Hack ||
            !equipment.DressRuleParamList.Contains(SilverWolfTopRoleId))
            return false;

        equipmentId = equipment.ID;
        return true;
    }

    public static bool IsSilverWolfRoleId(uint roleId) => SilverWolfRoleChain.Contains(roleId);

    /// <summary>银狼费用档角色链，按费用升序；同一 AvatarID 下的全部档位。</summary>
    public static IReadOnlyList<uint> SilverWolfRoleChain
    {
        get
        {
            var groups = SilverWolfEffectGroups;
            if (groups.Count == 0) return [];
            var upgradeTarget = groups
                .Select(group => GetCostUpgradeOption(group)?.FirstEffectParam ?? 0)
                .FirstOrDefault(id => id != 0);
            if (upgradeTarget == 0) return [];
            var avatarId = GameData.GridFightRoleBasicInfoData.GetValueOrDefault(upgradeTarget)?.AvatarID ?? 0;
            if (avatarId == 0) return [];
            return GameData.GridFightRoleBasicInfoData.Values
                .Where(row => row.AvatarID == avatarId)
                .OrderBy(row => row.Rarity)
                .ThenBy(row => row.ID)
                .Select(row => row.ID)
                .Take(groups.Count)
                .ToList();
        }
    }

    public static uint GetSilverWolfNextCostRoleId(uint roleId)
    {
        var group = GetSilverWolfEffectGroup(roleId);
        return group == 0 ? 0 : GetCostUpgradeOption(group)?.FirstEffectParam ?? 0;
    }

    /// <summary>1-based 费用档序号，非银狼返回 0。</summary>
    public static uint GetSilverWolfCostTier(uint roleId)
    {
        var index = SilverWolfRoleChain.ToList().IndexOf(roleId);
        return index < 0 ? 0 : (uint)index + 1;
    }

    public static bool TryResolveOrb(uint orbItemId, out IReadOnlyList<GridFightRewardEntry> rewards)
    {
        rewards = [];
        if (!GameData.GridFightOrbData.TryGetValue(orbItemId, out var orb)) return false;
        if (GameData.GridFightBasicOrbRewardsConfig.OrbRewards.TryGetValue(orbItemId, out var configured))
            return TryResolveConfiguredOrb(configured, out rewards);
        return TryResolveBonus(orb.BonusID, out rewards);
    }

    public static IReadOnlyList<string> ValidateConfiguredOrbRewards()
    {
        var errors = new List<string>();
        foreach (var (orbId, configured) in GameData.GridFightBasicOrbRewardsConfig.OrbRewards)
        {
            if (configured.OrbId != orbId)
                errors.Add($"GridFight orb reward {orbId} has mismatched orb id {configured.OrbId}");
            if (!GameData.GridFightOrbData.ContainsKey(orbId))
                errors.Add($"GridFight orb reward {orbId} references missing orb");
            if (configured.Rewards.Count == 0 || configured.Rewards.Values.Any(rewards => rewards.Count == 0))
                errors.Add($"GridFight orb reward {orbId} has an empty variant");
            foreach (var reward in configured.Rewards.Values.SelectMany(rewards => rewards))
                if (!CanResolveConfiguredReward(reward))
                    errors.Add($"GridFight orb reward {orbId} contains invalid {reward.BonusType} reward");
        }
        return errors;
    }

    public static bool TryResolveBonus(uint bonusId, out IReadOnlyList<GridFightRewardEntry> rewards)
    {
        var result = new List<GridFightRewardEntry>();
        var success = ResolveBonus(bonusId, 1, [], result);
        rewards = success ? result : [];
        return success;
    }

    private static bool ResolveBonus(
        uint bonusId,
        uint multiplier,
        HashSet<uint> resolving,
        List<GridFightRewardEntry> rewards)
    {
        if (!resolving.Add(bonusId)) return false;
        try
        {
            if (GameData.GridFightCombinationBonusData.TryGetValue(bonusId, out var combination))
            {
                if (combination.CombinationBonusList.Count != combination.BonusNumberList.Count) return false;
                for (var index = 0; index < combination.CombinationBonusList.Count; index++)
                {
                    var scaled = (ulong)multiplier * combination.BonusNumberList[index] / 10000;
                    if (scaled == 0 || scaled > uint.MaxValue ||
                        !ResolveBonus(combination.CombinationBonusList[index], (uint)scaled, resolving, rewards))
                        return false;
                }
                return true;
            }

            if (!GameData.GridFightBasicBonusPoolV2Data.TryGetValue(bonusId, out var basic)) return false;
            var itemId = basic.BonusTypeParamList.FirstOrDefault();
            if (itemId == 0) itemId = basic.BonusTypeParam;
            var roleStar = basic.BonusType == GridFightBonusTypeEnum.SpecificAvatar
                ? basic.BonusTypeParamList.ElementAtOrDefault(1)
                : 0;
            rewards.Add(new GridFightRewardEntry(basic.BonusType, itemId, multiplier, roleStar));
            return true;
        }
        finally
        {
            resolving.Remove(bonusId);
        }
    }

    private static bool TryResolveConfiguredOrb(
        GridFightBasicOrbRewardsInfo configured,
        out IReadOnlyList<GridFightRewardEntry> rewards)
    {
        rewards = [];
        var variants = configured.Rewards.OrderBy(entry => entry.Key).Select(entry => entry.Value).ToList();
        if (variants.Count == 0) return false;
        var result = new List<GridFightRewardEntry>();
        foreach (var reward in variants[Random.Shared.Next(variants.Count)])
            if (!TryResolveConfiguredReward(reward, result))
                return false;
        rewards = result;
        return true;
    }

    private static bool TryResolveConfiguredReward(
        GridFightBasicBonusPoolV2Excel reward,
        List<GridFightRewardEntry> result)
    {
        var count = reward.Value;
        if (count == 0) return false;
        var firstParam = reward.BonusTypeParamList.FirstOrDefault();
        if (firstParam == 0) firstParam = reward.BonusTypeParam;
        switch (reward.BonusType)
        {
            case GridFightBonusTypeEnum.Gold:
            case GridFightBonusTypeEnum.Exp:
                result.Add(new GridFightRewardEntry(reward.BonusType, 0, count));
                return true;
            case GridFightBonusTypeEnum.SpecificAvatar:
                var star = reward.BonusTypeParamList.ElementAtOrDefault(1);
                if (!IsValidRoleReward(firstParam, star)) return false;
                result.Add(new GridFightRewardEntry(reward.BonusType, firstParam, count, star));
                return true;
            case GridFightBonusTypeEnum.RandomAvatar:
                var rarity = firstParam;
                var randomStar = reward.BonusTypeParamList.ElementAtOrDefault(1);
                var roles = GameData.GridFightRoleBasicInfoData.Values
                    .Where(role => role.IsInPool && role.Rarity == rarity &&
                                   GameData.GridFightRoleStarData.ContainsKey(role.ID << 4 | randomStar))
                    .OrderBy(role => role.ID)
                    .ToList();
                if (roles.Count == 0) return false;
                var role = roles[Random.Shared.Next(roles.Count)];
                result.Add(new GridFightRewardEntry(
                    GridFightBonusTypeEnum.SpecificAvatar,
                    role.ID,
                    count,
                    randomStar));
                return true;
            case GridFightBonusTypeEnum.Item:
                if (!IsValidItemReward(firstParam)) return false;
                result.Add(new GridFightRewardEntry(reward.BonusType, firstParam, count));
                return true;
            case GridFightBonusTypeEnum.Orb:
                if (!GameData.GridFightOrbData.ContainsKey(firstParam)) return false;
                result.Add(new GridFightRewardEntry(reward.BonusType, firstParam, count));
                return true;
            case GridFightBonusTypeEnum.RandomEquipByCategory:
                var category = (GridFightEquipCategoryEnum)firstParam;
                if (category != GridFightEquipCategoryEnum.Basic) return false;
                var equipmentByCategory = GameData.GridFightEquipmentData.Values
                    .Where(equipment => equipment.EquipCategory == category)
                    .OrderBy(equipment => equipment.ID)
                    .ToList();
                return AddRandomEquipment(equipmentByCategory, count, result);
            default:
                return false;
        }
    }

    private static bool CanResolveConfiguredReward(GridFightBasicBonusPoolV2Excel reward)
    {
        if (reward.Value == 0) return false;
        var firstParam = reward.BonusTypeParamList.FirstOrDefault();
        if (firstParam == 0) firstParam = reward.BonusTypeParam;
        return reward.BonusType switch
        {
            GridFightBonusTypeEnum.Gold or GridFightBonusTypeEnum.Exp => true,
            GridFightBonusTypeEnum.SpecificAvatar =>
                IsValidRoleReward(firstParam, reward.BonusTypeParamList.ElementAtOrDefault(1)),
            GridFightBonusTypeEnum.RandomAvatar =>
                GameData.GridFightRoleBasicInfoData.Values.Any(role => role.IsInPool && role.Rarity == firstParam &&
                    GameData.GridFightRoleStarData.ContainsKey(
                        role.ID << 4 | reward.BonusTypeParamList.ElementAtOrDefault(1))),
            GridFightBonusTypeEnum.Item => IsValidItemReward(firstParam),
            GridFightBonusTypeEnum.Orb => GameData.GridFightOrbData.ContainsKey(firstParam),
            GridFightBonusTypeEnum.RandomEquipByCategory =>
                (GridFightEquipCategoryEnum)firstParam == GridFightEquipCategoryEnum.Basic &&
                GameData.GridFightEquipmentData.Values.Any(equipment =>
                    equipment.EquipCategory == GridFightEquipCategoryEnum.Basic),
            _ => false,
        };
    }

    private static bool IsValidRoleReward(uint roleId, uint star)
    {
        return roleId != 0 && star != 0 && GameData.GridFightRoleBasicInfoData.ContainsKey(roleId) &&
               GameData.GridFightRoleStarData.ContainsKey(roleId << 4 | star);
    }

    private static bool IsValidItemReward(uint itemId)
    {
        return itemId != 0 && (GameData.GridFightEquipmentData.ContainsKey(itemId) ||
                              GameData.GridFightConsumablesData.ContainsKey(itemId) ||
                              GameData.GridFightForgeData.ContainsKey(itemId));
    }

    private static bool AddRandomEquipment(
        IReadOnlyList<GridFightEquipmentExcel> equipment,
        uint count,
        List<GridFightRewardEntry> result)
    {
        if (equipment.Count == 0) return false;
        for (var index = 0u; index < count; index++)
        {
            var selected = equipment[Random.Shared.Next(equipment.Count)];
            result.Add(new GridFightRewardEntry(GridFightBonusTypeEnum.Item, selected.ID, 1));
        }
        return true;
    }
}
