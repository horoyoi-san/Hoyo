using March7thHoney.Data;
using March7thHoney.Data.Custom;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.GridFight;

namespace March7thHoney.GameServer.Game.GridFight;

public enum GridFightSessionPhase
{
    SelectingPortal,
    AwaitingInitialRound,
    AwaitingInitialOrb,
    AwaitingInitialReturn,
    Preparing,
    InBattle,
    AwaitingBattleRound,
    SelectingInvestment,
    SelectingSupply,
    SelectingEncounter,
    AwaitingSupplyRound,
    AwaitingBattleReturn,
    AwaitingBackToPrepare,
}

public enum GridFightPendingRequestKind
{
    PortalReroll,
    PortalSelect,
    RoundBegin,
    ReturnPreparation,
}

public sealed record GridFightSupplyOfferState(uint RoleId, uint EquipmentId);

public sealed record GridFightSupplySelectionResult(
    bool Success,
    GridFightRoleAcquisitionResult Acquisition,
    GridFightEquipmentState? Equipment)
{
    public static GridFightSupplySelectionResult Failed { get; } =
        new(false, GridFightRoleAcquisitionResult.Failed, null);
}

public sealed class GridFightRoleState
{
    public uint UniqueId { get; init; }
    public uint RoleId { get; set; }
    public uint Star { get; set; } = 1;
    public uint Position { get; set; }
    public List<uint> EquippedEquipmentUniqueIds { get; } = [];
}

public sealed class GridFightEquipmentState
{
    public uint UniqueId { get; init; }
    public uint EquipmentId { get; init; }
    public uint Source { get; init; }
}

public sealed class GridFightOrbState
{
    public uint UniqueId { get; init; }
    public uint OrbItemId { get; init; }
}

public sealed class GridFightConsumableState
{
    public uint GroupId { get; init; }
    public uint ItemId { get; init; }
    public uint Count { get; set; }
}

public sealed class GridFightShopSlot
{
    public uint Index { get; init; }
    public uint RoleId { get; init; }
    public uint SpecialGoodsId { get; init; }
    public uint Star { get; init; } = 1;
    public uint Price { get; init; }
    public bool SoldOut { get; set; }
}

public sealed record GridFightSessionChange(
    bool Success,
    IReadOnlyList<GridFightRoleState> AddedRoles,
    IReadOnlyList<uint> RemovedRoleIds,
    IReadOnlyList<GridFightRoleState> UpdatedRoles,
    IReadOnlyList<GridFightForgeItemState> UpdatedForgeItems)
{
    public static GridFightSessionChange Failed { get; } = new(false, [], [], [], []);
    public static GridFightSessionChange Succeeded { get; } = new(true, [], [], [], []);
}

public sealed record GridFightForgeUseResult(
    bool Success,
    uint RemovedForgeUniqueId,
    GridFightEquipmentState? Equipment,
    IReadOnlyList<GridFightRoleState> UpdatedRoles,
    IReadOnlyList<GridFightForgeItemState> UpdatedForgeItems)
{
    public static GridFightForgeUseResult Failed { get; } = new(false, 0, null, [], []);
}

public sealed record GridFightRoleMergeStep(
    IReadOnlyList<uint> RemovedRoleIds,
    GridFightRoleState AddedRole);

public sealed record GridFightRoleAcquisitionResult(
    bool Success,
    IReadOnlyList<GridFightRoleState> AcquiredRoles,
    IReadOnlyList<GridFightRoleMergeStep> MergeSteps,
    IReadOnlyList<GridFightRoleState> FinalMergedRoles)
{
    public static GridFightRoleAcquisitionResult Failed { get; } = new(false, [], [], []);
    public IReadOnlyList<GridFightRoleUnlockEffect> UnlockEffects { get; init; } = [];
}

public sealed record GridFightRoleBattleDamage(uint RoleId, double Damage, double SecondaryDamage);

public sealed record GridFightTraitBattleDamage(uint TraitId, double Damage, double SecondaryDamage);

public sealed record GridFightAugmentBattleDamage(uint AugmentId, double Damage, double SecondaryDamage);

public sealed record GridFightKilledMonsterInstance(uint WaveIndex, uint MonsterIndex, uint MonsterId);

public sealed record GridFightBattleStatistics(
    uint ProgressPercent,
    IReadOnlyList<GridFightRoleBattleDamage> RoleDamage,
    IReadOnlyList<GridFightTraitBattleDamage> TraitDamage,
    IReadOnlyList<GridFightAugmentBattleDamage> AugmentDamage,
    IReadOnlyList<GridFightKilledMonsterInstance> KilledMonsters,
    uint RoundCount,
    bool IsPresent = true)
{
    public static GridFightBattleStatistics Empty { get; } = new(0, [], [], [], [], 0, false);
}

public sealed record GridFightTalentOrbReward(
    uint TalentId,
    uint EffectId,
    IReadOnlyList<GridFightOrbState> AddedOrbs);

public enum GridFightHpChangeKind
{
    BasicPenalty,
    ProgressPenalty,
    ThresholdPenalty,
    TalentHealing,
    FinalBattleTurnHealing,
}

public sealed record GridFightHpChange(
    GridFightHpChangeKind Kind,
    uint PreviousHp,
    uint CurrentHp,
    uint Amount,
    uint SourceId = 0);

public sealed record GridFightBattleSettlementResult(
    bool Success,
    bool RouteAdvanced,
    uint ProgressPercent,
    uint DeadLinePercent,
    bool IsPerfectFinish,
    uint PreviousKeepWinCount,
    uint KeepWinCount,
    uint BasicGold,
    uint InterestGold,
    uint KeepWinGold,
    uint GoldAfterBasic,
    uint GoldAfterInterest,
    uint GoldAfterKeepWin,
    uint AddedExp,
    uint LineupHpBefore,
    uint LineupHpAfter,
    IReadOnlyList<GridFightHpChange> HpChanges,
    GridFightBattleStatistics Statistics,
    IReadOnlyList<GridFightOrbState> AddedBattleOrbs,
    IReadOnlyList<GridFightTalentOrbReward> TalentRewards)
{
    public static GridFightBattleSettlementResult Failed { get; } = new(
        false, false, 0, 0, false, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [],
        GridFightBattleStatistics.Empty, [], []);
}

public sealed partial class GridFightSession
{
    private const int InvestmentOfferCount = 3;
    private const int SupplyOfferCount = 5;
    private const uint SupplySelectionQueueAdvance = 4;
    private const uint SupplyEquipmentSource = 9;

    private readonly GridFightResourceCatalog _catalog;
    /// <summary>进入备战阶段次数，用于财富宝钻产金。</summary>
    private uint _preparationPhaseCount;
    private readonly Dictionary<string, uint> _roleSavedValues = new(StringComparer.Ordinal);
    private uint _nextEntityUniqueId = 1;
    private uint _nextConsumableGroupId = 1;
    private bool _orbClaimed;
    private bool _cyrenePoemShopUnlocked;
    private bool _silverWolfHackUnlocked;
    private uint? _traitEffectSelectEnhanceQueuePosition;
    /// <summary>商店中银狼 LV999 当前费用档对应 RoleId（15061/62/63）</summary>
    private uint _silverWolfShopRoleId;
    /// <summary>是否已放弃过「提升费用」选项</summary>
    private bool _silverWolfCostUpgradeAbandoned;
    /// <summary>当前骇入弹窗对应的角色 UniqueId</summary>
    private uint? _silverWolfPendingRoleUniqueId;
    /// <summary>当前弹窗是否为最高费用档三星终局（管理员手套）</summary>
    private bool _silverWolfPendingIsFinal;
    private uint _silverWolfPendingEffectGroupId;
    private readonly List<uint> _silverWolfPendingOptionIds = [];
    private uint? _silverWolfDeferredRoleUniqueId;
    private uint _silverWolfDeferredStar;
    private bool _silverWolfDeferredIsFinal;
    private uint _silverWolfDeferredEffectGroupId;
    private readonly List<uint> _silverWolfDeferredOptionIds = [];
    private bool _silverWolfPendingJustActivated;
    private uint? _pendingAutoMergeRoleId;
    /// <summary>骰子 UniqueId → 绑定的 2 个装备配置 ID（卸下不丢，战斗结束才重随）</summary>
    private readonly Dictionary<uint, uint[]> _diceBoundEquipmentConfigIds = new();
    private readonly HashSet<uint> _rerolledInvestmentIds = [];
    private readonly HashSet<(uint TalentId, uint EffectId, GridFightTalentRewardTrigger Trigger, uint ChapterId)>
        _triggeredTalentRewards = [];
    private uint _encounterRerollCount;
    /// <summary>Zero-based rarity selected by the rotation portal for the current preparation phase.</summary>
    private int? _rotationTargetRarityIndex;
    private Dictionary<uint, uint> _roleSwitchIds = [];
    private GridFightRoleSwitchUpdate? _roleSwitchUpdate;

    public uint Season { get; }
    public uint DivisionId { get; }
    public bool IsOverlock { get; }
    public uint UniqueId { get; }
    public GridFightSessionPhase Phase { get; private set; } = GridFightSessionPhase.SelectingPortal;
    public uint PendingQueuePosition { get; private set; } = 1;
    public uint ChapterId { get; private set; } = 1;
    public uint SectionId { get; private set; } = 1;
    public uint Gold { get; private set; }
    public uint PlayerLevel { get; private set; }
    public uint PlayerExp { get; private set; }
    public uint LineupHp { get; private set; }
    public uint MaxLineupHp { get; }
    public uint KeepWinCount { get; private set; }
    public uint BattlesFinished { get; private set; }
    public uint SelectedPortalId { get; private set; }
    public IReadOnlyList<double> ShopRarityRollWeights =>
        BuildRotationShopWeights()?.RollWeights ??
        _catalog.GetShopRarityWeights(PlayerLevel).Select(weight => (double)weight).ToArray();
    public IReadOnlyList<uint> ShopRarityDisplayWeights =>
        BuildRotationShopWeights()?.DisplayWeights ?? _catalog.GetShopRarityWeights(PlayerLevel);
    public IReadOnlyList<uint> CampIds { get; }
    public uint RewardCampId { get; }
    public IReadOnlyList<GridFightMonsterExcel> Bosses { get; }
    public IReadOnlyList<uint> AffixIds { get; }
    public IReadOnlyList<uint> PortalOffer { get; private set; }
    public IReadOnlyList<uint> InvestmentOffer { get; private set; } = [];
    public IReadOnlyList<GridFightSupplyOfferState> SupplyOffer { get; private set; } = [];
    public List<uint> ActiveInvestmentIds { get; } = [];
    public uint SupplyRerollCount { get; private set; }
    public GridFightBattlePlan? BattlePlan { get; private set; }
    public IReadOnlyList<GridFightEncounterOptionState> EncounterOptions { get; private set; } = [];
    public IReadOnlyList<GridFightMonsterPlan> Enemies => BattlePlan?.Monsters ?? [];
    public List<GridFightRoleState> Roles { get; } = [];
    public List<GridFightEquipmentState> Equipments { get; } = [];
    public List<GridFightOrbState> Orbs { get; } = [];
    public List<GridFightConsumableState> Consumables { get; } = [];
    public List<GridFightForgeItemState> ForgeItems { get; } = [];
    public List<GridFightShopSlot> Shop { get; } = [];
    public IReadOnlyDictionary<string, uint> RoleSavedValues => _roleSavedValues;
    public bool HasCyreneCombatEnhancement { get; private set; }
    public GridFightHackConsoleState? HackConsole { get; private set; }
    public uint? TraitEffectSelectEnhanceQueuePosition => _traitEffectSelectEnhanceQueuePosition;
    /// <summary>商店中银狼当前费用档；未升过费时取资源链首档。</summary>
    public uint SilverWolfShopRoleId =>
        _silverWolfShopRoleId != 0 ? _silverWolfShopRoleId : GridFightSpecialFeatures.SilverWolfBaseRoleId;
    public IReadOnlyList<uint> SilverWolfPendingOptionIds => _silverWolfPendingOptionIds;
    public uint SilverWolfPendingEffectGroupId => _silverWolfPendingEffectGroupId;
    public bool ConsumeSilverWolfPendingJustActivated()
    {
        if (!_silverWolfPendingJustActivated) return false;
        _silverWolfPendingJustActivated = false;
        return true;
    }
    public GridFightBattleStatistics LastBattleStatistics { get; private set; } = GridFightBattleStatistics.Empty;
    public IReadOnlyList<GridFightRoleSwitchEntryState> RoleSwitchEntries =>
        _catalog.RoleSwitchGroups
            .Select(group => new GridFightRoleSwitchEntryState(
                group.RoleIdList,
                _roleSwitchIds.GetValueOrDefault(group.BaseRoleId, group.BaseRoleId)))
            .ToList();

    public IReadOnlyDictionary<string, uint> RefreshRoleSavedValues()
    {
        var next = new Dictionary<string, uint>(StringComparer.Ordinal);
        foreach (var role in Roles.Where(role => IsActivePosition(role.Position)))
            foreach (var (key, value) in _catalog.ResolveRoleSavedValues(role.RoleId, role.Star))
                next[key] = Math.Max(next.GetValueOrDefault(key), value);

        var changes = _roleSavedValues.Keys
            .Concat(next.Keys)
            .Distinct(StringComparer.Ordinal)
            .Where(key => _roleSavedValues.GetValueOrDefault(key) != next.GetValueOrDefault(key))
            .Order(StringComparer.Ordinal)
            .ToDictionary(key => key, key => next.GetValueOrDefault(key), StringComparer.Ordinal);
        _roleSavedValues.Clear();
        foreach (var (key, value) in next) _roleSavedValues[key] = value;
        return changes;
    }

    public IReadOnlyDictionary<string, uint> ResolveRoleSavedValues(GridFightRoleState role, uint roleId)
    {
        return _catalog.ResolveRoleSavedValues(roleId, role.Star);
    }

    public GridFightRoleSwitchUpdate? ConsumeRoleSwitchUpdate()
    {
        var update = _roleSwitchUpdate;
        _roleSwitchUpdate = null;
        return update;
    }

    private void RecalculateRoleSwitches(bool emit = true)
    {
        var previousRoleIds = Roles.ToDictionary(role => role.UniqueId, role => role.RoleId);
        var previousSwitchIds = _roleSwitchIds.ToDictionary(pair => pair.Key, pair => pair.Value);
        var currentSwitchIds = ResolveRoleSwitchIds();
        foreach (var role in Roles)
        {
            var group = _catalog.RoleSwitchGroups.FirstOrDefault(candidate =>
                candidate.RoleIdList.Contains(role.RoleId));
            if (group != null)
                role.RoleId = currentSwitchIds[group.BaseRoleId];
        }

        _roleSwitchIds = currentSwitchIds;
        if (!emit)
        {
            _roleSwitchUpdate = null;
            return;
        }

        var baselineRoleIds = _roleSwitchUpdate?.PreviousRoleIds ?? previousRoleIds;
        var baselineSwitchIds = _roleSwitchUpdate?.PreviousRoleSwitchIds ?? previousSwitchIds;
        var currentRoleIds = Roles.ToDictionary(role => role.UniqueId, role => role.RoleId);
        var changedRoleIds = baselineRoleIds.Keys
            .Intersect(currentRoleIds.Keys)
            .Where(uniqueId => baselineRoleIds.GetValueOrDefault(uniqueId) !=
                               currentRoleIds.GetValueOrDefault(uniqueId))
            .ToHashSet();
        var changedSwitchIds = baselineSwitchIds.Keys
            .Concat(currentSwitchIds.Keys)
            .Distinct()
            .Where(baseRoleId => baselineSwitchIds.GetValueOrDefault(baseRoleId, baseRoleId) !=
                                 currentSwitchIds.GetValueOrDefault(baseRoleId, baseRoleId))
            .ToHashSet();
        if (changedRoleIds.Count == 0 && changedSwitchIds.Count == 0)
        {
            _roleSwitchUpdate = null;
            return;
        }

        _roleSwitchUpdate = new GridFightRoleSwitchUpdate(
            new Dictionary<uint, uint>(baselineRoleIds),
            new Dictionary<uint, uint>(baselineSwitchIds),
            changedRoleIds,
            changedSwitchIds);
    }

    private Dictionary<uint, uint> ResolveRoleSwitchIds()
    {
        var result = new Dictionary<uint, uint>();
        foreach (var group in _catalog.RoleSwitchGroups)
        {
            var members = Roles
                .Where(role => group.RoleIdList.Contains(role.RoleId))
                .ToList();
            var useSwitchRole = group.Condition switch
            {
                "ByPlacedInBackRegion" => members.Any(role => IsBackPosition(role.Position)),
                "ByMaxTrait" => ResolveByMaxTrait(group),
                _ => false,
            };
            result[group.BaseRoleId] = useSwitchRole ? group.SwitchRoleId : group.BaseRoleId;
        }
        return result;
    }

    private bool ResolveByMaxTrait(GridFightRoleSwitchGroup group)
    {
        var groupRoleIds = group.RoleIdList.ToHashSet();
        var activeRoles = Roles
            .Where(role => IsActivePosition(role.Position) && !groupRoleIds.Contains(role.RoleId))
            .ToList();
        var firstTrait = group.ParamList.ElementAtOrDefault(0);
        var secondTrait = group.ParamList.ElementAtOrDefault(1);
        if (firstTrait == 0 || secondTrait == 0) return false;
        var firstCount = activeRoles.Count(role => ResolveRoleTraitIds(role).Contains(firstTrait));
        var secondCount = activeRoles.Count(role => ResolveRoleTraitIds(role).Contains(secondTrait));
        return firstCount > secondCount;
    }

    public GridFightSession(
        GridFightResourceCatalog catalog,
        uint season,
        uint divisionId,
        bool isOverlock,
        uint uniqueId)
    {
        _catalog = catalog;
        _roleSwitchIds = catalog.RoleSwitchGroups
            .ToDictionary(group => group.BaseRoleId, group => group.BaseRoleId);
        Season = season;
        DivisionId = divisionId;
        IsOverlock = isOverlock;
        UniqueId = uniqueId;
        PlayerLevel = catalog.InitialPlayerLevel;
        LineupHp = catalog.GetInitialLineupHp(divisionId);
        MaxLineupHp = catalog.InitialHp;
        PortalOffer = catalog.RollPortalOffer(3);
        var chapterCount = checked((int)catalog.StandardRoute.Max(node => node.ChapterId));
        CampIds = catalog.RollCampIds(chapterCount);
        RewardCampId = catalog.RollRewardCampId();
        var bossNodes = catalog.StandardRoute
            .Where(node => node.NodeType == GridFightNodeTypeEnum.Boss)
            .OrderBy(node => node.ChapterId)
            .ToList();
        Bosses = CampIds.Zip(bossNodes, catalog.RollBossMonster).ToList();
        AffixIds = catalog.RollAffixIds(divisionId);
        PrepareCurrentNode();
    }

    /// <summary>后台席位可被装备解锁的格数，超出部分官服不再生效。</summary>
    private uint MaxRoleCountBonus =>
        _catalog.OffFieldMaxCount > _catalog.OffFieldInitialCount
            ? _catalog.OffFieldMaxCount - _catalog.OffFieldInitialCount
            : 0;

    /// <summary>财富宝钻等 AvatarMaxNumberAdd 装备提供的人口加成，无论是否被角色穿戴。</summary>
    public uint WealthDiamondBonus
    {
        get
        {
            var bonus = Equipments
                .Select(state => GameData.GridFightEquipmentData.GetValueOrDefault(state.EquipmentId))
                .Where(config => config?.EquipFunc == GridFightEquipFuncTypeEnum.AvatarMaxNumberAdd)
                .Aggregate(0UL, (total, config) => total + Math.Max(1u, config!.EquipFuncParamList.FirstOrDefault()));
            return (uint)Math.Min(bonus, MaxRoleCountBonus);
        }
    }

    /// <summary>后台格 UI 预解锁上限，进局时写入 OffFieldMaxCount 以规避中途无法推送。</summary>
    public uint MaxOffFieldRolesCap => _catalog.OffFieldMaxCount;

    /// <summary>总出战人数上限 = 等级基础人口 + 装备加成，UpdatePositions / EnterBattle 校验读此值。</summary>
    public uint MaxActiveRoles
    {
        get
        {
            var baseCount = _catalog.GetPlayerLevel(PlayerLevel).AvatarMaxNumber;
            return (uint)Math.Min(uint.MaxValue, (ulong)baseCount + WealthDiamondBonus);
        }
    }

    public bool HandlePending(uint queuePosition, GridFightPendingRequestKind kind, uint portalId = 0)
    {
        if (queuePosition != PendingQueuePosition) return false;
        switch (kind)
        {
            case GridFightPendingRequestKind.PortalReroll
                when Phase == GridFightSessionPhase.SelectingPortal:
                PortalOffer = _catalog.RollPortalOffer(3);
                return true;
            case GridFightPendingRequestKind.PortalSelect
                when Phase == GridFightSessionPhase.SelectingPortal && PortalOffer.Contains(portalId):
                SelectedPortalId = portalId;
                var portalEffects = _catalog.GetPortalRuntimeEffects(portalId);
                ApplyPortalEntryEquipments(portalEffects);
                MaterializeInitialRoles(portalEffects.EntryRoleIds);
                Gold += _catalog.InitialGold;
                Phase = GridFightSessionPhase.AwaitingInitialRound;
                PendingQueuePosition++;
                return true;
            case GridFightPendingRequestKind.RoundBegin
                when Phase == GridFightSessionPhase.AwaitingInitialRound:
                RefreshShop(false);
                Phase = GridFightSessionPhase.AwaitingInitialOrb;
                PendingQueuePosition = 10;
                return true;
            case GridFightPendingRequestKind.ReturnPreparation
                when Phase is GridFightSessionPhase.AwaitingInitialOrb or GridFightSessionPhase.AwaitingInitialReturn:
                EnterPreparingPhase();
                PendingQueuePosition++;
                return true;
            case GridFightPendingRequestKind.RoundBegin
                when Phase == GridFightSessionPhase.AwaitingBattleRound:
                PendingQueuePosition++;
                if (CurrentNode.NodeType == GridFightNodeTypeEnum.Supply)
                {
                    PrepareSupplyOffer();
                    Phase = GridFightSessionPhase.SelectingSupply;
                }
                else if (CurrentNode.NodeType == GridFightNodeTypeEnum.EliteBranch)
                {
                    Phase = GridFightSessionPhase.SelectingEncounter;
                }
                else if (CurrentNode.Template.IsAugment != 0)
                {
                    PrepareInvestmentOffer();
                    Phase = GridFightSessionPhase.SelectingInvestment;
                }
                else
                {
                    Phase = GridFightSessionPhase.AwaitingBattleReturn;
                }
                return true;
            case GridFightPendingRequestKind.RoundBegin
                when Phase == GridFightSessionPhase.AwaitingSupplyRound:
                Phase = GridFightSessionPhase.AwaitingBattleReturn;
                PendingQueuePosition++;
                return true;
            case GridFightPendingRequestKind.ReturnPreparation
                when Phase == GridFightSessionPhase.AwaitingBattleReturn:
                Phase = GridFightSessionPhase.AwaitingBackToPrepare;
                PendingQueuePosition++;
                return true;
            default:
                return false;
        }
    }

    public bool IsInvestmentRerolled(uint augmentId) => _rerolledInvestmentIds.Contains(augmentId);

    public bool RerollInvestment(uint queuePosition, uint augmentId)
    {
        if (Phase != GridFightSessionPhase.SelectingInvestment ||
            queuePosition != PendingQueuePosition ||
            _rerolledInvestmentIds.Contains(augmentId))
            return false;
        var index = InvestmentOffer.ToList().IndexOf(augmentId);
        if (index < 0) return false;
        var quality = GameData.GridFightAugmentData[augmentId].Quality;
        var excluded = InvestmentOffer.Concat(ActiveInvestmentIds).ToHashSet();
        var replacement = _catalog.RollInvestmentOffer(ChapterId, quality, 1, excluded).SingleOrDefault();
        if (replacement == 0) return false;
        var offer = InvestmentOffer.ToList();
        offer[index] = replacement;
        InvestmentOffer = offer;
        _rerolledInvestmentIds.Add(replacement);
        return true;
    }

    public bool SelectInvestment(uint queuePosition, uint augmentId)
    {
        if (Phase != GridFightSessionPhase.SelectingInvestment ||
            queuePosition != PendingQueuePosition ||
            !InvestmentOffer.Contains(augmentId))
            return false;
        if (!ActiveInvestmentIds.Contains(augmentId)) ActiveInvestmentIds.Add(augmentId);
        InvestmentOffer = [];
        _rerolledInvestmentIds.Clear();
        Phase = GridFightSessionPhase.AwaitingBattleReturn;
        PendingQueuePosition++;
        return true;
    }

    public bool RerollSupply(uint queuePosition)
    {
        if (Phase != GridFightSessionPhase.SelectingSupply ||
            queuePosition != PendingQueuePosition ||
            SupplyRerollCount != 0)
            return false;
        SupplyOffer = _catalog.RollSupplyOffer(SupplyOfferCount)
            .Select(offer => new GridFightSupplyOfferState(offer.RoleId, offer.EquipmentId))
            .ToList();
        SupplyRerollCount = 1;
        return true;
    }

    public bool RerollEncounter(uint queuePosition)
    {
        if (Phase != GridFightSessionPhase.SelectingEncounter ||
            queuePosition != PendingQueuePosition ||
            _encounterRerollCount != 0)
            return false;
        EncounterOptions = _catalog.RollEncounterOptions(CurrentNode, CampIds, DivisionId);
        _encounterRerollCount = 1;
        return EncounterOptions.Count == 2;
    }

    public bool SelectEncounter(uint queuePosition, uint eliteBranchId)
    {
        if (Phase != GridFightSessionPhase.SelectingEncounter ||
            queuePosition != PendingQueuePosition)
            return false;
        var selected = EncounterOptions.FirstOrDefault(option => option.EliteBranchId == eliteBranchId);
        if (selected == null) return false;
        BattlePlan = selected.BattlePlan;
        Phase = GridFightSessionPhase.AwaitingBattleReturn;
        PendingQueuePosition++;
        return true;
    }

    public bool UpdateEncounterSelection(uint eliteBranchId)
    {
        if (CurrentNode.NodeType != GridFightNodeTypeEnum.EliteBranch ||
            BattlePlan == null ||
            Phase is not (GridFightSessionPhase.AwaitingBattleReturn or
                GridFightSessionPhase.AwaitingBackToPrepare or
                GridFightSessionPhase.Preparing))
            return false;
        var selected = EncounterOptions.FirstOrDefault(option => option.EliteBranchId == eliteBranchId);
        if (selected == null) return false;
        BattlePlan = selected.BattlePlan;
        return true;
    }

    public GridFightSupplySelectionResult SelectSupply(uint queuePosition, IReadOnlyList<uint> indices)
    {
        if (Phase != GridFightSessionPhase.SelectingSupply ||
            queuePosition != PendingQueuePosition ||
            indices.Count != 1 ||
            indices[0] == 0 ||
            indices[0] > SupplyOffer.Count ||
            _catalog.GetNextNode(ChapterId, SectionId) == null)
            return GridFightSupplySelectionResult.Failed;

        var selected = SupplyOffer[checked((int)indices[0] - 1)];
        if (!TryAddEquipment(selected.EquipmentId, out var equipment, SupplyEquipmentSource))
            return GridFightSupplySelectionResult.Failed;

        var role = new GridFightRoleState
        {
            UniqueId = _nextEntityUniqueId++,
            RoleId = selected.RoleId,
            Position = GetFreeBenchPosition(),
        };
        Roles.Add(role);
        RecalculateRoleSwitches();
        var mergeSteps = MergeRoles(role.RoleId, role);
        RecalculateRoleSwitches();
        var acquisition = new GridFightRoleAcquisitionResult(
            true,
            [role],
            mergeSteps,
            GetFinalMergedRoles(mergeSteps));

        SupplyOffer = [];
        SupplyRerollCount = 0;
        if (!AdvanceToNextNode()) return GridFightSupplySelectionResult.Failed;
        Phase = GridFightSessionPhase.AwaitingSupplyRound;
        PendingQueuePosition += SupplySelectionQueueAdvance;
        acquisition = FinalizeRoleAcquisition(acquisition);
        return new GridFightSupplySelectionResult(
            true,
            acquisition,
            equipment);
    }

    public bool ClaimInitialOrb()
    {
        if (_orbClaimed) return true;
        if (Phase != GridFightSessionPhase.AwaitingInitialOrb) return false;
        _orbClaimed = true;
        Phase = GridFightSessionPhase.AwaitingInitialReturn;
        return true;
    }

    public uint AdjustGold(int delta)
    {
        if (delta >= 0)
        {
            Gold = (uint)Math.Min(uint.MaxValue, (ulong)Gold + (uint)delta);
            return Gold;
        }

        var amount = (ulong)(-(long)delta);
        Gold = amount >= Gold ? 0 : Gold - (uint)amount;
        return Gold;
    }

    public bool TryAddRole(uint roleId, uint star, out GridFightRoleAcquisitionResult acquisition)
    {
        acquisition = GridFightRoleAcquisitionResult.Failed;
        if (!GameData.GridFightRoleBasicInfoData.ContainsKey(roleId) ||
            !GameData.GridFightRoleStarData.ContainsKey(roleId << 4 | star))
            return false;

        var role = new GridFightRoleState
        {
            UniqueId = _nextEntityUniqueId++,
            RoleId = roleId,
            Star = star,
            Position = GetFreeBenchPosition(),
        };
        Roles.Add(role);
        RecalculateRoleSwitches();
        acquisition = FinalizeRoleAcquisition(new GridFightRoleAcquisitionResult(true, [role], [], []));
        return true;
    }

    public bool TryAddEquipment(uint equipmentId, out GridFightEquipmentState equipment, uint source = 1)
    {
        equipment = null!;
        if (!GameData.GridFightEquipmentData.ContainsKey(equipmentId)) return false;
        equipment = new GridFightEquipmentState
        {
            UniqueId = _nextEntityUniqueId++,
            EquipmentId = equipmentId,
            Source = source,
        };
        Equipments.Add(equipment);
        return true;
    }

    public bool TryAddOrb(uint orbItemId, out GridFightOrbState orb)
    {
        orb = null!;
        if (!GameData.GridFightOrbData.ContainsKey(orbItemId)) return false;
        orb = new GridFightOrbState
        {
            UniqueId = _nextEntityUniqueId++,
            OrbItemId = orbItemId,
        };
        Orbs.Add(orb);
        return true;
    }

    public bool TryAddConsumable(
        uint itemId,
        out GridFightConsumableChange change,
        uint count = 1)
    {
        change = null!;
        if (!GameData.GridFightConsumablesData.ContainsKey(itemId) || count == 0) return false;

        var consumable = Consumables.FirstOrDefault(item => item.ItemId == itemId);
        if (consumable == null)
        {
            consumable = new GridFightConsumableState
            {
                GroupId = _nextConsumableGroupId++,
                ItemId = itemId,
                Count = count,
            };
            Consumables.Add(consumable);
            change = new GridFightConsumableChange(consumable, true, count);
            return true;
        }

        var previousCount = consumable.Count;
        consumable.Count = (uint)Math.Min(uint.MaxValue, (ulong)previousCount + count);
        var stackDelta = consumable.Count - previousCount;
        if (stackDelta == 0) return false;
        change = new GridFightConsumableChange(consumable, false, stackDelta);
        return true;
    }

    public bool IsSpecialGoodsPurchase(IReadOnlyList<uint> indices)
    {
        if (indices.Count == 0) return false;
        return indices.All(index => Shop.FirstOrDefault(slot => slot.Index == index) is
        {
            SoldOut: false,
            SpecialGoodsId: not 0,
        });
    }

    public IReadOnlyList<GridFightSpecialGoodsPurchaseResult> BuySpecialGoods(IReadOnlyList<uint> indices)
    {
        if (Phase != GridFightSessionPhase.Preparing ||
            indices.Count == 0 ||
            indices.Distinct().Count() != indices.Count ||
            !IsSpecialGoodsPurchase(indices))
            return [];

        var results = new List<GridFightSpecialGoodsPurchaseResult>();
        foreach (var index in indices)
        {
            var slot = Shop.Single(goods => goods.Index == index);
            var application = ApplyCyreneSpecialGoods(slot.SpecialGoodsId);
            if (!application.Success) return [];
            slot.SoldOut = true;
            results.Add(new GridFightSpecialGoodsPurchaseResult(index, slot.SpecialGoodsId, application));
        }
        return results;
    }

    public IReadOnlyList<GridFightRewardApplication> OpenOrbs(
        IReadOnlyList<uint> uniqueIds,
        bool takeAll)
    {
        var selected = takeAll
            ? Orbs.ToList()
            : uniqueIds.Distinct()
                .Select(uniqueId => Orbs.FirstOrDefault(orb => orb.UniqueId == uniqueId))
                .Where(orb => orb != null)
                .Cast<GridFightOrbState>()
                .ToList();
        if (selected.Count == 0 || (!takeAll && selected.Count != uniqueIds.Distinct().Count())) return [];

        var resolved = new List<(GridFightOrbState Orb, IReadOnlyList<GridFightRewardEntry> Rewards)>();
        foreach (var orb in selected)
        {
            if (!GridFightSpecialFeatures.TryResolveOrb(orb.OrbItemId, out var rewards)) return [];
            resolved.Add((orb, rewards));
        }

        var snapshot = CaptureRewardState();
        try
        {
            var applications = new List<GridFightRewardApplication>();
            foreach (var (orb, rewards) in resolved)
            {
                var application = ApplyRewards(rewards, orb.UniqueId, orb.OrbItemId);
                if (!application.Success)
                {
                    RestoreRewardState(snapshot);
                    return [];
                }
                applications.Add(application);
            }
            foreach (var (orb, _) in resolved) Orbs.Remove(orb);
            return applications;
        }
        catch
        {
            RestoreRewardState(snapshot);
            return [];
        }
    }

    public IReadOnlyList<GridFightTalentOrbReward> TakeTalentOrbRewards(
        GridFightTalentRewardTrigger trigger,
        uint chapterId)
    {
        var result = new List<GridFightTalentOrbReward>();
        foreach (var rule in GameData.GridFightRewardRulesConfig.TalentRules.Where(rule =>
                     rule.Trigger == trigger && rule.ChapterIds.Contains(chapterId)))
        {
            var key = (rule.TalentId, rule.EffectId, rule.Trigger, chapterId);
            if (_triggeredTalentRewards.Contains(key)) continue;
            var nextEntityUniqueId = _nextEntityUniqueId;
            var added = new List<GridFightOrbState>();
            foreach (var orbId in rule.OrbIds)
            {
                if (TryAddOrb(orbId, out var orb))
                {
                    added.Add(orb);
                    continue;
                }
                Orbs.RemoveAll(orb => added.Contains(orb));
                _nextEntityUniqueId = nextEntityUniqueId;
                added.Clear();
                break;
            }
            if (added.Count == 0) continue;
            _triggeredTalentRewards.Add(key);
            result.Add(new GridFightTalentOrbReward(rule.TalentId, rule.EffectId, added));
        }
        return result;
    }

    private GridFightRewardStateSnapshot CaptureRewardState()
    {
        return new GridFightRewardStateSnapshot(
            _nextEntityUniqueId,
            _nextConsumableGroupId,
            _cyrenePoemShopUnlocked,
            _silverWolfHackUnlocked,
            _traitEffectSelectEnhanceQueuePosition,
            _silverWolfShopRoleId,
            _silverWolfCostUpgradeAbandoned,
            _silverWolfPendingRoleUniqueId,
            _silverWolfPendingIsFinal,
            _silverWolfPendingEffectGroupId,
            [.._silverWolfPendingOptionIds],
            _silverWolfPendingJustActivated,
            _silverWolfDeferredRoleUniqueId,
            _silverWolfDeferredStar,
            _silverWolfDeferredIsFinal,
            _silverWolfDeferredEffectGroupId,
            [.._silverWolfDeferredOptionIds],
            Gold,
            PlayerLevel,
            PlayerExp,
            Roles.Select(CloneRole).ToList(),
            Equipments.Select(equipment => new GridFightEquipmentState
            {
                UniqueId = equipment.UniqueId,
                EquipmentId = equipment.EquipmentId,
                Source = equipment.Source,
            }).ToList(),
            Orbs.Select(orb => new GridFightOrbState
            {
                UniqueId = orb.UniqueId,
                OrbItemId = orb.OrbItemId,
            }).ToList(),
            Consumables.Select(consumable => new GridFightConsumableState
            {
                GroupId = consumable.GroupId,
                ItemId = consumable.ItemId,
                Count = consumable.Count,
            }).ToList(),
            ForgeItems.Select(forgeItem => new GridFightForgeItemState
            {
                UniqueId = forgeItem.UniqueId,
                ForgeItemId = forgeItem.ForgeItemId,
                Position = forgeItem.Position,
                EquipmentChoices = forgeItem.EquipmentChoices.ToList(),
            }).ToList(),
            Shop.Select(slot => new GridFightShopSlot
            {
                Index = slot.Index,
                RoleId = slot.RoleId,
                SpecialGoodsId = slot.SpecialGoodsId,
                Star = slot.Star,
                Price = slot.Price,
                SoldOut = slot.SoldOut,
            }).ToList());
    }

    private void RestoreRewardState(GridFightRewardStateSnapshot snapshot)
    {
        _nextEntityUniqueId = snapshot.NextEntityUniqueId;
        _nextConsumableGroupId = snapshot.NextConsumableGroupId;
        _cyrenePoemShopUnlocked = snapshot.CyrenePoemShopUnlocked;
        _silverWolfHackUnlocked = snapshot.SilverWolfHackUnlocked;
        _traitEffectSelectEnhanceQueuePosition = snapshot.TraitEffectSelectEnhanceQueuePosition;
        _silverWolfShopRoleId = snapshot.SilverWolfShopRoleId;
        _silverWolfCostUpgradeAbandoned = snapshot.SilverWolfCostUpgradeAbandoned;
        _silverWolfPendingRoleUniqueId = snapshot.SilverWolfPendingRoleUniqueId;
        _silverWolfPendingIsFinal = snapshot.SilverWolfPendingIsFinal;
        _silverWolfPendingEffectGroupId = snapshot.SilverWolfPendingEffectGroupId;
        _silverWolfPendingOptionIds.Clear();
        _silverWolfPendingOptionIds.AddRange(snapshot.SilverWolfPendingOptionIds);
        _silverWolfPendingJustActivated = snapshot.SilverWolfPendingJustActivated;
        _silverWolfDeferredRoleUniqueId = snapshot.SilverWolfDeferredRoleUniqueId;
        _silverWolfDeferredStar = snapshot.SilverWolfDeferredStar;
        _silverWolfDeferredIsFinal = snapshot.SilverWolfDeferredIsFinal;
        _silverWolfDeferredEffectGroupId = snapshot.SilverWolfDeferredEffectGroupId;
        _silverWolfDeferredOptionIds.Clear();
        _silverWolfDeferredOptionIds.AddRange(snapshot.SilverWolfDeferredOptionIds);
        Gold = snapshot.Gold;
        PlayerLevel = snapshot.PlayerLevel;
        PlayerExp = snapshot.PlayerExp;
        Roles.Clear();
        Roles.AddRange(snapshot.Roles.Select(CloneRole));
        Equipments.Clear();
        Equipments.AddRange(snapshot.Equipments);
        Orbs.Clear();
        Orbs.AddRange(snapshot.Orbs);
        Consumables.Clear();
        Consumables.AddRange(snapshot.Consumables);
        ForgeItems.Clear();
        ForgeItems.AddRange(snapshot.ForgeItems);
        Shop.Clear();
        Shop.AddRange(snapshot.Shop);
        RecalculateRoleSwitches(false);
    }

    private static GridFightRoleState CloneRole(GridFightRoleState role)
    {
        var clone = new GridFightRoleState
        {
            UniqueId = role.UniqueId,
            RoleId = role.RoleId,
            Star = role.Star,
            Position = role.Position,
        };
        clone.EquippedEquipmentUniqueIds.AddRange(role.EquippedEquipmentUniqueIds);
        return clone;
    }

    private sealed record GridFightRewardStateSnapshot(
        uint NextEntityUniqueId,
        uint NextConsumableGroupId,
        bool CyrenePoemShopUnlocked,
        bool SilverWolfHackUnlocked,
        uint? TraitEffectSelectEnhanceQueuePosition,
        uint SilverWolfShopRoleId,
        bool SilverWolfCostUpgradeAbandoned,
        uint? SilverWolfPendingRoleUniqueId,
        bool SilverWolfPendingIsFinal,
        uint SilverWolfPendingEffectGroupId,
        IReadOnlyList<uint> SilverWolfPendingOptionIds,
        bool SilverWolfPendingJustActivated,
        uint? SilverWolfDeferredRoleUniqueId,
        uint SilverWolfDeferredStar,
        bool SilverWolfDeferredIsFinal,
        uint SilverWolfDeferredEffectGroupId,
        IReadOnlyList<uint> SilverWolfDeferredOptionIds,
        uint Gold,
        uint PlayerLevel,
        uint PlayerExp,
        IReadOnlyList<GridFightRoleState> Roles,
        IReadOnlyList<GridFightEquipmentState> Equipments,
        IReadOnlyList<GridFightOrbState> Orbs,
        IReadOnlyList<GridFightConsumableState> Consumables,
        IReadOnlyList<GridFightForgeItemState> ForgeItems,
        IReadOnlyList<GridFightShopSlot> Shop);

    public GridFightTraitEnhanceActivationResult ActivateSilverWolfHackConsole(
        uint queuePosition,
        uint enhanceOptionId)
    {
        if (_traitEffectSelectEnhanceQueuePosition != queuePosition ||
            !_silverWolfPendingOptionIds.Contains(enhanceOptionId))
            return GridFightTraitEnhanceActivationResult.Failed;

        _pendingAutoMergeRoleId = null;
        try
        {
            // 终局手套：解锁骇入控制台
            if (_silverWolfPendingIsFinal)
            {
                if (HackConsole != null ||
                    !GridFightSpecialFeatures.TryResolveSilverWolfEquipmentId(out var gloveId) ||
                    !TryAddEquipment(gloveId, out var glove, GridFightSpecialFeatures.HackEquipmentSource))
                    return GridFightTraitEnhanceActivationResult.Failed;
                HackConsole = new GridFightHackConsoleState { GameItemUniqueId = _nextEntityUniqueId++ };
                _silverWolfHackUnlocked = true;
                return new GridFightTraitEnhanceActivationResult(true, queuePosition, glove);
            }

            // 升费：选项 SelectCondition 为 Permanent，EffectParamList[0] 指向下一档角色
            if (enhanceOptionId == GridFightSpecialFeatures.GetCostUpgradeOptionId(SilverWolfPendingRoleId))
            {
                if (!TryApplySilverWolfCostUpgrade(out var upgraded, out var updatedRoles))
                    return GridFightTraitEnhanceActivationResult.Failed;
                _pendingAutoMergeRoleId = upgraded!.RoleId;
                return new GridFightTraitEnhanceActivationResult(
                    true,
                    queuePosition,
                    null,
                    upgraded,
                    ShopNeedsRefresh: true,
                    UpdatedRoles: updatedRoles);
            }

            if (!GridFightSpecialFeatures.TryGetEquipmentIdForOption(enhanceOptionId, out var equipmentId) ||
                !TryAddEquipment(equipmentId, out var part, GridFightSpecialFeatures.HackEquipmentSource))
                return GridFightTraitEnhanceActivationResult.Failed;

            // 本次弹窗提供过升费却选了改件，视为永久放弃升费
            if (_silverWolfPendingOptionIds.Contains(
                    GridFightSpecialFeatures.GetCostUpgradeOptionId(SilverWolfPendingRoleId)))
                _silverWolfCostUpgradeAbandoned = true;
            return new GridFightTraitEnhanceActivationResult(true, queuePosition, part);
        }
        finally
        {
            ClearSilverWolfPending();
            // 推进 PendingQueuePosition，防止第二次弹窗复用同一位置导致卡死
            PendingQueuePosition++;
        }
    }

    /// <summary>当前弹窗对应角色的 RoleId，弹窗已失效时为 0。</summary>
    private uint SilverWolfPendingRoleId =>
        _silverWolfPendingRoleUniqueId is { } uniqueId
            ? Roles.FirstOrDefault(role => role.UniqueId == uniqueId)?.RoleId ?? 0
            : 0;

    /// <summary>
    /// Runs merges only after the enhance pending state has been cleared. A resulting two/three-star
    /// Silver Wolf may enqueue the next resource-driven enhance choice.
    /// </summary>
    public GridFightRoleAcquisitionResult? ProcessPendingAutoMerge()
    {
        if (_pendingAutoMergeRoleId is not { } roleId) return null;
        _pendingAutoMergeRoleId = null;
        var mergeSteps = MergeRoles(roleId);
        if (mergeSteps.Count == 0) return null;
        RecalculateRoleSwitches();
        return FinalizeRoleAcquisition(new GridFightRoleAcquisitionResult(
            true,
            [],
            mergeSteps,
            GetFinalMergedRoles(mergeSteps)));
    }

    private bool TryApplySilverWolfCostUpgrade(
        out GridFightRoleState? upgraded,
        out IReadOnlyList<GridFightRoleState> updatedRoles)
    {
        upgraded = null;
        updatedRoles = [];
        if (_silverWolfCostUpgradeAbandoned) return false;
        if (_silverWolfPendingRoleUniqueId is not { } roleUid) return false;
        var role = Roles.FirstOrDefault(r => r.UniqueId == roleUid);
        if (role == null) return false;
        var currentId = role.RoleId;
        var nextId = GridFightSpecialFeatures.GetSilverWolfNextCostRoleId(currentId);
        if (nextId == 0 || !GameData.GridFightRoleBasicInfoData.ContainsKey(nextId)) return false;

        var changed = Roles.Where(candidate => candidate.RoleId == currentId).ToList();
        foreach (var candidate in changed)
        {
            candidate.RoleId = nextId;
            candidate.Star = 1;
        }
        if (changed.Count == 0) return false;

        _silverWolfShopRoleId = nextId;
        RecalculateRoleSwitches();
        upgraded = changed.FirstOrDefault(candidate => candidate.UniqueId == roleUid) ?? changed[0];
        updatedRoles = changed;
        return true;
    }

    /// <summary>组一次骇入弹窗：终局只给手套，否则一件改件 + 升费（放弃过则再来一件改件）。</summary>
    private void PrepareSilverWolfEnhanceOptions(GridFightRoleState role)
    {
        _silverWolfPendingEffectGroupId = GridFightSpecialFeatures.GetSilverWolfEffectGroup(role.RoleId);
        _silverWolfPendingOptionIds.Clear();
        if (_silverWolfPendingIsFinal)
        {
            _silverWolfPendingOptionIds.Add(GridFightSpecialFeatures.SilverWolfEnhanceOptionId);
            return;
        }

        var owned = Equipments.Select(equipment => equipment.EquipmentId).ToHashSet();
        var pool = GridFightSpecialFeatures.GetHackEquipmentOptionPoolForRole(role.RoleId);
        var left = GridFightSpecialFeatures.RollRandomHackOptionId(Random.Shared, role.RoleId, owned);
        if (left == 0) left = pool.FirstOrDefault();
        if (left != 0) _silverWolfPendingOptionIds.Add(left);

        var costOptionId = GridFightSpecialFeatures.GetCostUpgradeOptionId(role.RoleId);
        if (!_silverWolfCostUpgradeAbandoned && costOptionId != 0)
        {
            _silverWolfPendingOptionIds.Add(costOptionId);
            return;
        }

        var alternatives = pool.Where(optionId => optionId != left).ToList();
        if (alternatives.Count > 0)
            _silverWolfPendingOptionIds.Add(alternatives[Random.Shared.Next(alternatives.Count)]);
    }

    private void ClearSilverWolfPending()
    {
        _traitEffectSelectEnhanceQueuePosition = null;
        _silverWolfPendingRoleUniqueId = null;
        _silverWolfPendingIsFinal = false;
        _silverWolfPendingEffectGroupId = 0;
        _silverWolfPendingOptionIds.Clear();
        _silverWolfPendingJustActivated = false;
    }

    private void ClearSilverWolfDeferred()
    {
        _silverWolfDeferredRoleUniqueId = null;
        _silverWolfDeferredStar = 0;
        _silverWolfDeferredIsFinal = false;
        _silverWolfDeferredEffectGroupId = 0;
        _silverWolfDeferredOptionIds.Clear();
    }

    /// <summary>是否已持有同费用档、星数≥2 的另一只银狼，用于二星重复合成时不再弹骇入。</summary>
    private bool HasOtherSameTierTwoStarOrAbove(uint roleId, uint excludeUniqueId) =>
        Roles.Any(r =>
            r.UniqueId != excludeUniqueId &&
            r.RoleId == roleId &&
            r.Star >= 2);

    private void StoreSilverWolfDeferred(GridFightRoleState role)
    {
        _silverWolfDeferredRoleUniqueId = role.UniqueId;
        _silverWolfDeferredStar = role.Star;
        _silverWolfDeferredIsFinal = _silverWolfPendingIsFinal;
        _silverWolfDeferredEffectGroupId = _silverWolfPendingEffectGroupId;
        _silverWolfDeferredOptionIds.Clear();
        _silverWolfDeferredOptionIds.AddRange(_silverWolfPendingOptionIds);
    }

    private bool TryQueueSilverWolfPendingFromPrepared(GridFightRoleState role)
    {
        // 选项组不出来就别弹窗，否则客户端会收到空列表卡住
        if (_traitEffectSelectEnhanceQueuePosition != null || _silverWolfPendingOptionIds.Count == 0)
            return false;
        _silverWolfPendingRoleUniqueId = role.UniqueId;
        _traitEffectSelectEnhanceQueuePosition = PendingQueuePosition;
        _silverWolfPendingJustActivated = true;
        return true;
    }

    public bool TryPromoteDeferredSilverWolfEnhance(IReadOnlyList<uint>? movedRoleUniqueIds = null)
    {
        if (_traitEffectSelectEnhanceQueuePosition != null)
            return false;
        if (_silverWolfDeferredRoleUniqueId is not { } deferredUid)
            return false;

        var onField = Roles
            .Where(r => GridFightSpecialFeatures.IsSilverWolfRoleId(r.RoleId) && IsActivePosition(r.Position))
            .ToList();
        if (onField.Count == 0)
            return false;

        var eligible = onField.Where(r => r.Star >= _silverWolfDeferredStar).ToList();
        if (eligible.Count == 0)
            return false;

        var maxStar = eligible.Max(r => r.Star);
        eligible = eligible.Where(r => r.Star == maxStar).ToList();

        GridFightRoleState? chosen = null;
        if (movedRoleUniqueIds is { Count: > 0 })
        {
            foreach (var id in movedRoleUniqueIds)
            {
                chosen = eligible.FirstOrDefault(r => r.UniqueId == id);
                if (chosen != null)
                    break;
            }
        }
        chosen ??= eligible.FirstOrDefault(r => r.UniqueId == deferredUid) ?? eligible[0];

        _silverWolfPendingIsFinal = _silverWolfDeferredIsFinal;
        _silverWolfPendingEffectGroupId = _silverWolfDeferredEffectGroupId;
        _silverWolfPendingOptionIds.Clear();
        _silverWolfPendingOptionIds.AddRange(_silverWolfDeferredOptionIds);
        if (_silverWolfPendingIsFinal && HackConsole != null)
        {
            ClearSilverWolfDeferred();
            return false;
        }

        if (!TryQueueSilverWolfPendingFromPrepared(chosen))
            return false;

        ClearSilverWolfDeferred();
        return true;
    }

    public GridFightHackOptionResult UseHackOption(uint optionId, uint enemyHpPercent)
    {
        var console = HackConsole;
        if (console == null) return GridFightHackOptionResult.Failed;
        var application = new GridFightRewardApplication { Success = true };

        switch (optionId)
        {
            case 0 when enemyHpPercent is >= GridFightSpecialFeatures.MinimumEnemyHpPercent and
                <= GridFightSpecialFeatures.MaximumEnemyHpPercent:
                console.EnemyHpPercent = enemyHpPercent;
                break;
            case GridFightSpecialFeatures.HackAddGoldOptionId when console.RemainingGoldActions > 0:
                console.RemainingGoldActions--;
                AdjustGold(checked((int)GridFightSpecialFeatures.HackGoldPerAction));
                application.GoldChanged = true;
                break;
            case GridFightSpecialFeatures.HackFullHealOptionId when console.RemainingHealActions > 0:
                console.RemainingHealActions--;
                LineupHp = MaxLineupHp;
                application.LineupHpChanged = true;
                break;
            case GridFightSpecialFeatures.HackGrantOrbOptionId when console.RemainingOrbActions > 0:
                var index = GridFightSpecialFeatures.HackOrbActionCount - console.RemainingOrbActions;
                if (!TryAddOrb(GridFightSpecialFeatures.HackOrbIds[checked((int)index)], out var orb))
                    return GridFightHackOptionResult.Failed;
                console.RemainingOrbActions--;
                application.AddedOrbs.Add(orb);
                break;
            default:
                return GridFightHackOptionResult.Failed;
        }

        return new GridFightHackOptionResult(true, optionId, application);
    }

    private GridFightRewardApplication ApplyCyreneSpecialGoods(uint specialGoodsId)
    {
        switch (specialGoodsId)
        {
            case GridFightSpecialFeatures.CyreneHealGoodsId:
                LineupHp = (uint)Math.Min(MaxLineupHp, (ulong)LineupHp + GridFightSpecialFeatures.CyreneHealAmount);
                return new GridFightRewardApplication { Success = true, LineupHpChanged = true };
            case GridFightSpecialFeatures.CyreneWealthGoodsId:
                return GridFightSpecialFeatures.TryResolveBonus(
                    GridFightSpecialFeatures.CyreneWealthBonusId,
                    out var wealthRewards)
                    ? ApplyRewards(wealthRewards)
                    : new GridFightRewardApplication();
            case GridFightSpecialFeatures.CyreneInsigniaGoodsId:
                return GridFightSpecialFeatures.TryResolveBonus(
                    GridFightSpecialFeatures.CyreneInsigniaBonusId,
                    out var insigniaRewards)
                    ? ApplyRewards(insigniaRewards)
                    : new GridFightRewardApplication();
            case GridFightSpecialFeatures.CyreneCombatGoodsId:
                HasCyreneCombatEnhancement = true;
                return new GridFightRewardApplication { Success = true, RolePropertiesChanged = true };
            case GridFightSpecialFeatures.CyreneHeroGoodsId:
                return GridFightSpecialFeatures.TryResolveBonus(
                    GridFightSpecialFeatures.CyreneHeroBonusId,
                    out var heroRewards)
                    ? ApplyRewards(heroRewards)
                    : new GridFightRewardApplication();
            default:
                return new GridFightRewardApplication();
        }
    }

    private GridFightRewardApplication ApplyRewards(
        IReadOnlyList<GridFightRewardEntry> rewards,
        uint sourceUniqueId = 0,
        uint sourceItemId = 0)
    {
        var application = new GridFightRewardApplication
        {
            Success = true,
            SourceUniqueId = sourceUniqueId,
            SourceItemId = sourceItemId,
        };
        foreach (var reward in rewards)
        {
            application.Drops.Add(reward);
            switch (reward.Type)
            {
                case GridFightBonusTypeEnum.Gold:
                    Gold = (uint)Math.Min(uint.MaxValue, (ulong)Gold + reward.Count);
                    application.GoldChanged = true;
                    break;
                case GridFightBonusTypeEnum.Exp:
                    var previousLevel = PlayerLevel;
                    var previousExp = PlayerExp;
                    AddPlayerExp(reward.Count);
                    application.PlayerLevelChanged |= PlayerLevel != previousLevel;
                    application.PlayerExpChanged |= PlayerExp != previousExp;
                    break;
                case GridFightBonusTypeEnum.SpecificAvatar:
                    for (var index = 0u; index < reward.Count; index++)
                    {
                        if (!TryAddRole(reward.ItemId, reward.RoleStar == 0 ? 1 : reward.RoleStar, out var acquisition))
                            return new GridFightRewardApplication();
                        application.RoleAcquisitions.Add(acquisition);
                    }
                    break;
                case GridFightBonusTypeEnum.Item:
                    if (GameData.GridFightEquipmentData.ContainsKey(reward.ItemId))
                    {
                        for (var index = 0u; index < reward.Count; index++)
                        {
                            if (!TryAddEquipment(reward.ItemId, out var equipment))
                                return new GridFightRewardApplication();
                            application.AddedEquipments.Add(equipment);
                        }
                    }
                    else if (GameData.GridFightConsumablesData.ContainsKey(reward.ItemId))
                    {
                        if (!TryAddConsumable(reward.ItemId, out var change, reward.Count))
                            return new GridFightRewardApplication();
                        application.ConsumableChanges.Add(change);
                    }
                    else if (GameData.GridFightForgeData.ContainsKey(reward.ItemId))
                    {
                        for (var index = 0u; index < reward.Count; index++)
                        {
                            if (!TryAddForgeItem(reward.ItemId, out var forgeItem))
                                return new GridFightRewardApplication();
                            application.AddedForgeItems.Add(forgeItem);
                        }
                    }
                    else
                    {
                        return new GridFightRewardApplication();
                    }
                    break;
                case GridFightBonusTypeEnum.Orb:
                    for (var index = 0u; index < reward.Count; index++)
                    {
                        if (!TryAddOrb(reward.ItemId, out var orb)) return new GridFightRewardApplication();
                        application.AddedOrbs.Add(orb);
                    }
                    break;
                default:
                    return new GridFightRewardApplication();
            }
        }
        return application;
    }

    private bool TryAddForgeItem(uint forgeItemId, out GridFightForgeItemState forgeItem)
    {
        forgeItem = null!;
        var choices = _catalog.RollForgeEquipment(forgeItemId);
        var position = GetFreeBenchPosition();
        if (choices.Count == 0 || position == 0) return false;
        forgeItem = new GridFightForgeItemState
        {
            UniqueId = _nextEntityUniqueId++,
            ForgeItemId = forgeItemId,
            Position = position,
            EquipmentChoices = choices,
        };
        ForgeItems.Add(forgeItem);
        return true;
    }

    public GridFightForgeUseResult UseForge(uint uniqueId, uint targetIndex)
    {
        if (Phase != GridFightSessionPhase.Preparing)
            return GridFightForgeUseResult.Failed;
        var forgeItem = ForgeItems.FirstOrDefault(candidate => candidate.UniqueId == uniqueId);
        if (forgeItem == null ||
            !GameData.GridFightForgeData.TryGetValue(forgeItem.ForgeItemId, out var forge) ||
            forge.FuncType != GridFightForgeFuncTypeEnum.Equip ||
            targetIndex >= forgeItem.EquipmentChoices.Count)
            return GridFightForgeUseResult.Failed;

        var equipmentId = forgeItem.EquipmentChoices[checked((int)targetIndex)];
        if (!TryAddEquipment(equipmentId, out var equipment))
            return GridFightForgeUseResult.Failed;

        ForgeItems.Remove(forgeItem);
        var promoted = PromoteOverflowItemsToBench();
        return new GridFightForgeUseResult(
            true,
            uniqueId,
            equipment,
            promoted.Roles,
            promoted.ForgeItems);
    }

    public bool TryMoveToSection(uint chapterId, uint sectionId, out uint finishedPendingPosition)
    {
        finishedPendingPosition = 0;
        if (Phase == GridFightSessionPhase.InBattle ||
            !_catalog.StandardRoute.Any(node => node.ChapterId == chapterId && node.SectionId == sectionId))
            return false;

        if (Phase is GridFightSessionPhase.SelectingPortal or
            GridFightSessionPhase.AwaitingInitialRound or
            GridFightSessionPhase.AwaitingInitialOrb or
            GridFightSessionPhase.AwaitingInitialReturn or
            GridFightSessionPhase.AwaitingBattleRound or
            GridFightSessionPhase.AwaitingBattleReturn)
            finishedPendingPosition = PendingQueuePosition;

        ChapterId = chapterId;
        SectionId = sectionId;
        InvestmentOffer = [];
        SupplyOffer = [];
        _rerolledInvestmentIds.Clear();
        SupplyRerollCount = 0;
        PrepareCurrentNode();
        RefreshShop(false);
        Phase = GridFightSessionPhase.AwaitingBattleRound;
        return true;
    }

    public GridFightRoleAcquisitionResult BuyGoods(IReadOnlyList<uint> indices)
    {
        if (Phase != GridFightSessionPhase.Preparing || indices.Count == 0 || indices.Distinct().Count() != indices.Count)
            return GridFightRoleAcquisitionResult.Failed;
        var slots = indices.Select(index => Shop.FirstOrDefault(slot => slot.Index == index)).ToList();
        if (slots.Any(slot => slot == null || slot.SoldOut || slot.SpecialGoodsId != 0))
            return GridFightRoleAcquisitionResult.Failed;
        var cost = slots.OfType<GridFightShopSlot>().Aggregate(0UL, (sum, slot) => sum + slot.Price);
        if (cost > Gold) return GridFightRoleAcquisitionResult.Failed;

        Gold -= (uint)cost;
        var acquiredRoles = new List<GridFightRoleState>();
        var mergeSteps = new List<GridFightRoleMergeStep>();
        foreach (var slot in slots.OfType<GridFightShopSlot>())
        {
            slot.SoldOut = true;
            var role = new GridFightRoleState
            {
                UniqueId = _nextEntityUniqueId++,
                RoleId = slot.RoleId,
                Star = slot.Star,
                Position = GetFreeBenchPosition(),
            };
            Roles.Add(role);
            acquiredRoles.Add(role);
            mergeSteps.AddRange(MergeRoles(role.RoleId, role));
        }
        RecalculateRoleSwitches();
        return FinalizeRoleAcquisition(new GridFightRoleAcquisitionResult(
            true,
            acquiredRoles,
            mergeSteps,
            GetFinalMergedRoles(mergeSteps)));
    }

    public GridFightSessionChange RecycleRole(uint uniqueId)
    {
        if (Phase != GridFightSessionPhase.Preparing) return GridFightSessionChange.Failed;
        var role = Roles.FirstOrDefault(candidate => candidate.UniqueId == uniqueId);
        if (role == null) return GridFightSessionChange.Failed;
        Gold += _catalog.GetSellPrice(role.RoleId, role.Star);
        Roles.Remove(role);
        RecalculateRoleSwitches();
        var promoted = PromoteOverflowItemsToBench();
        return new GridFightSessionChange(true, [], [uniqueId], promoted.Roles, promoted.ForgeItems);
    }

    public bool BuyExp()
    {
        if (Phase != GridFightSessionPhase.Preparing || Gold < _catalog.BuyExpCost) return false;
        var current = _catalog.GetPlayerLevel(PlayerLevel);
        if (current.LevelUpExp == 0) return false;

        Gold -= _catalog.BuyExpCost;
        AddPlayerExp(_catalog.BuyExpAmount);
        return true;
    }

    private void AddPlayerExp(uint amount)
    {
        PlayerExp += amount;
        while (GameDataHasNextLevel() && PlayerExp >= _catalog.GetPlayerLevel(PlayerLevel).LevelUpExp)
        {
            PlayerExp -= _catalog.GetPlayerLevel(PlayerLevel).LevelUpExp;
            PlayerLevel++;
        }
    }

    public GridFightSessionChange UpdatePositions(IReadOnlyList<(uint UniqueId, uint Position)> updates)
    {
        if (Phase != GridFightSessionPhase.Preparing || updates.Count == 0 ||
            updates.Select(update => update.UniqueId).Distinct().Count() != updates.Count)
            return GridFightSessionChange.Failed;
        var rolesById = Roles.ToDictionary(role => role.UniqueId);
        var forgeItemsById = ForgeItems.ToDictionary(item => item.UniqueId);
        if (updates.Any(update =>
                rolesById.ContainsKey(update.UniqueId) == forgeItemsById.ContainsKey(update.UniqueId) ||
                rolesById.ContainsKey(update.UniqueId) && !IsValidPosition(update.Position) ||
                forgeItemsById.ContainsKey(update.UniqueId) && !IsBenchPosition(update.Position)))
            return GridFightSessionChange.Failed;

        var rolePositions = Roles.ToDictionary(role => role.UniqueId, role => role.Position);
        var forgePositions = ForgeItems.ToDictionary(item => item.UniqueId, item => item.Position);
        foreach (var update in updates)
            if (rolePositions.ContainsKey(update.UniqueId))
                rolePositions[update.UniqueId] = update.Position;
            else
                forgePositions[update.UniqueId] = update.Position;
        var occupied = rolePositions.Values.Concat(forgePositions.Values)
            .Where(position => position != 0)
            .ToList();
        if (occupied.Distinct().Count() != occupied.Count)
            return GridFightSessionChange.Failed;
        if (rolePositions.Values.Count(IsActivePosition) > MaxActiveRoles) return GridFightSessionChange.Failed;

        var updatedRoles = new List<GridFightRoleState>();
        var updatedForgeItems = new List<GridFightForgeItemState>();
        foreach (var update in updates)
        {
            if (rolesById.TryGetValue(update.UniqueId, out var role))
            {
                role.Position = update.Position;
                updatedRoles.Add(role);
            }
            else
            {
                var forgeItem = forgeItemsById[update.UniqueId];
                forgeItem.Position = update.Position;
                updatedForgeItems.Add(forgeItem);
            }
        }
        RecalculateRoleSwitches();
        var updatedRoleIds = updatedRoles.Select(role => role.UniqueId).ToHashSet();
        var updatedForgeItemIds = updatedForgeItems.Select(item => item.UniqueId).ToHashSet();
        var promoted = PromoteOverflowItemsToBench();
        updatedRoles.AddRange(promoted.Roles.Where(role => updatedRoleIds.Add(role.UniqueId)));
        updatedForgeItems.AddRange(promoted.ForgeItems.Where(item => updatedForgeItemIds.Add(item.UniqueId)));
        // 银狼待生效：有角色进入出战席时尝试弹出骇入
        TryPromoteDeferredSilverWolfEnhance(updatedRoles.Select(role => role.UniqueId).ToList());
        return new GridFightSessionChange(true, [], [], updatedRoles, updatedForgeItems);
    }

    public bool EnterBattle()
    {
        var activeRoleCount = Roles.Count(role => IsActivePosition(role.Position));
        if (Phase != GridFightSessionPhase.Preparing ||
            !IsCombatNode(CurrentNode) ||
            BattlePlan == null ||
            activeRoleCount == 0 ||
            activeRoleCount > MaxActiveRoles)
            return false;
        Phase = GridFightSessionPhase.InBattle;
        return true;
    }

    public GridFightBattleSettlementResult ResolveBattle(
        bool battleEndedNormally,
        GridFightBattleStatistics statistics)
    {
        if (Phase != GridFightSessionPhase.InBattle) return GridFightBattleSettlementResult.Failed;
        if (!battleEndedNormally)
        {
            BattlesFinished++;
            KeepWinCount = 0;
            EnterPreparingPhase();
            return GridFightBattleSettlementResult.Failed;
        }

        var progressPercent = Math.Min(statistics.ProgressPercent, 100u);
        statistics = statistics with { ProgressPercent = progressPercent };
        var isPerfectFinish = progressPercent == 100;
        var penaltyRule = _catalog.GetPenaltyRule(CurrentPenaltyRuleId);
        var lineupHpBefore = LineupHp;
        var isFinalBoss = CurrentNode.NodeType == GridFightNodeTypeEnum.Boss &&
                          _catalog.GetNextNode(ChapterId, SectionId) == null;
        var hpChanges = ApplyBattleHpChanges(
            penaltyRule,
            progressPercent,
            isPerfectFinish,
            isFinalBoss,
            statistics.RoundCount);
        var previousKeepWinCount = KeepWinCount;
        if (CurrentNode.NodeType is GridFightNodeTypeEnum.CampMonster or
            GridFightNodeTypeEnum.EliteBranch or GridFightNodeTypeEnum.Boss)
            KeepWinCount = isPerfectFinish ? KeepWinCount + 1 : 0;

        var settlementBalance = Gold;
        var basicGold = CurrentNode.BasicGoldReward;
        var interestGold = _catalog.CalculateInterest(settlementBalance);
        var keepWinGold = _catalog.GetVictoryGoldBonus(KeepWinCount);
        var goldAfterBasic = AddGold(basicGold);
        var goldAfterInterest = AddGold(interestGold);
        var goldAfterKeepWin = AddGold(keepWinGold);
        AddPlayerExp(_catalog.BattleWinExp);
        var battlePlan = BattlePlan;
        var nodeType = CurrentNode.NodeType;
        var chapterId = ChapterId;
        IReadOnlyList<GridFightOrbState> addedBattleOrbs = nodeType == GridFightNodeTypeEnum.Monster && battlePlan != null
            ? AddKilledMonsterOrbs(battlePlan, statistics.KilledMonsters)
            : [];
        IReadOnlyList<GridFightTalentOrbReward> talentRewards = nodeType == GridFightNodeTypeEnum.Boss
            ? TakeTalentOrbRewards(GridFightTalentRewardTrigger.BossClear, chapterId)
            : [];
        var routeAdvanced = AdvanceToNextNode();
        BattlesFinished++;
        LastBattleStatistics = statistics;
        if (routeAdvanced)
        {
            Phase = GridFightSessionPhase.AwaitingBattleRound;
            PendingQueuePosition++;
        }
        else
        {
            EnterPreparingPhase();
        }
        return new GridFightBattleSettlementResult(
            true,
            routeAdvanced,
            progressPercent,
            penaltyRule.ThresholdPosition,
            isPerfectFinish,
            previousKeepWinCount,
            KeepWinCount,
            basicGold,
            interestGold,
            keepWinGold,
            goldAfterBasic,
            goldAfterInterest,
            goldAfterKeepWin,
            _catalog.BattleWinExp,
            lineupHpBefore,
            LineupHp,
            hpChanges,
            statistics,
            addedBattleOrbs,
            talentRewards);
    }

    private IReadOnlyList<GridFightOrbState> AddKilledMonsterOrbs(
        GridFightBattlePlan battlePlan,
        IReadOnlyList<GridFightKilledMonsterInstance> killedMonsters)
    {
        var result = new List<GridFightOrbState>();
        var seen = new HashSet<(uint WaveIndex, uint MonsterIndex)>();
        foreach (var killed in killedMonsters)
        {
            if (!seen.Add((killed.WaveIndex, killed.MonsterIndex)) ||
                killed.WaveIndex == 0 || killed.WaveIndex > battlePlan.Waves.Count)
                continue;
            var wave = battlePlan.Waves[checked((int)killed.WaveIndex - 1)];
            if (killed.MonsterIndex == 0 || killed.MonsterIndex > wave.Monsters.Count)
                continue;
            var monster = wave.Monsters[checked((int)killed.MonsterIndex - 1)];
            if (monster.Monster.MonsterID != killed.MonsterId) continue;
            foreach (var drop in monster.Drops.Where(drop => drop.Type == GridFightBonusTypeEnum.Orb))
            for (var index = 0u; index < drop.Count; index++)
                if (TryAddOrb(drop.ItemId, out var orb))
                    result.Add(orb);
        }
        return result;
    }

    private IReadOnlyList<GridFightHpChange> ApplyBattleHpChanges(
        GridFightPenaltyRuleExcel penaltyRule,
        uint progressPercent,
        bool isPerfectFinish,
        bool isFinalBoss,
        uint roundCount)
    {
        var basicPenalty = isPerfectFinish ? 0 : penaltyRule.ThresholdPassBasicPlayerHPPenalty;
        var progressPenalty = isPerfectFinish
            ? 0
            : (uint)(((ulong)(100 - progressPercent) * penaltyRule.ProgressPenaltyCoefficient) / 100);
        var thresholdPenalty = isPerfectFinish || progressPercent >= penaltyRule.ThresholdPosition
            ? 0
            : penaltyRule.ThresholdFailPlayerHPPenalty;
        List<GridFightHpChange> changes =
        [
            ApplyHpLoss(GridFightHpChangeKind.BasicPenalty, basicPenalty),
            ApplyHpLoss(GridFightHpChangeKind.ProgressPenalty, progressPenalty),
            ApplyHpLoss(GridFightHpChangeKind.ThresholdPenalty, thresholdPenalty),
            ApplyHpHealing(
                GridFightHpChangeKind.TalentHealing,
                _catalog.GetPostBattleHealing(),
                _catalog.PostBattleHealingSourceId),
        ];
        var finalBattleHealing = isFinalBoss ? _catalog.GetFinalBattleTurnHealing(roundCount) : 0;
        if (finalBattleHealing > 0)
            changes.Add(ApplyHpHealing(
                GridFightHpChangeKind.FinalBattleTurnHealing,
                finalBattleHealing,
                _catalog.FinalBattleTurnHealingSourceId));
        return changes;
    }

    private GridFightHpChange ApplyHpLoss(GridFightHpChangeKind kind, uint amount)
    {
        var previous = LineupHp;
        LineupHp = amount >= LineupHp ? 0 : LineupHp - amount;
        return new GridFightHpChange(kind, previous, LineupHp, previous - LineupHp);
    }

    private GridFightHpChange ApplyHpHealing(GridFightHpChangeKind kind, uint amount, uint sourceId)
    {
        var previous = LineupHp;
        LineupHp = (uint)Math.Min(MaxLineupHp, (ulong)LineupHp + amount);
        return new GridFightHpChange(kind, previous, LineupHp, amount, sourceId);
    }

    private uint AddGold(uint amount)
    {
        Gold = (uint)Math.Min(uint.MaxValue, (ulong)Gold + amount);
        return Gold;
    }

    public void AbortBattleStart()
    {
        // 开战构建失败：只回退阶段，不推进备战计数、不重随骰子
        if (Phase == GridFightSessionPhase.InBattle) Phase = GridFightSessionPhase.Preparing;
    }

    public bool BackToPrepare()
    {
        if (Phase != GridFightSessionPhase.AwaitingBackToPrepare) return false;
        EnterPreparingPhase();
        return true;
    }

    /// <summary>进入备战阶段：刷新 Portal 阶段效果，并结算装备的周期收益。</summary>
    private void EnterPreparingPhase()
    {
        Phase = GridFightSessionPhase.Preparing;
        _preparationPhaseCount++;
        RollRotationShopRarity();

        // 每个节点：随便骰子 / 特权随便骰子刷新随机装备填充
        ApplyDiceEquipmentRefills();
        GrantEquippedPeriodicGold();
    }

    private void RollRotationShopRarity()
    {
        _rotationTargetRarityIndex = null;
        if (!_catalog.IsRotationPortal(SelectedPortalId)) return;
        var rarityCount = _catalog.GetShopRarityWeights(PlayerLevel).Count;
        if (rarityCount > 0)
            _rotationTargetRarityIndex = Random.Shared.Next(rarityCount);
    }

    /// <summary>
    /// Doubles the selected rarity for the current preparation phase. Remaining rarities share the
    /// leftover probability in their original ratio; the roll weights retain fractions while the
    /// protocol-facing weights are rounded to whole percentages.
    /// </summary>
    private RotationShopWeights? BuildRotationShopWeights()
    {
        if (!_catalog.IsRotationPortal(SelectedPortalId) ||
            _rotationTargetRarityIndex is not { } targetIndex)
            return null;

        var baseWeights = _catalog.GetShopRarityWeights(PlayerLevel).ToList();
        if (targetIndex < 0 || targetIndex >= baseWeights.Count) return null;
        var total = baseWeights.Sum(weight => (double)weight);
        if (total <= 0) return null;

        var doubledTargetWeight = baseWeights[targetIndex] * 2.0;
        var rollWeights = new double[baseWeights.Count];
        var displayWeights = new uint[baseWeights.Count];
        if (doubledTargetWeight >= total)
        {
            rollWeights[targetIndex] = total;
            displayWeights[targetIndex] = RoundPercentage(doubledTargetWeight, total);
        }
        else
        {
            rollWeights[targetIndex] = doubledTargetWeight;
            var otherBaseTotal = total - baseWeights[targetIndex];
            for (var index = 0; index < baseWeights.Count; index++)
            {
                if (index == targetIndex) continue;
                rollWeights[index] = otherBaseTotal <= 0
                    ? 0
                    : baseWeights[index] * (total - doubledTargetWeight) / otherBaseTotal;
            }
            for (var index = 0; index < rollWeights.Length; index++)
                displayWeights[index] = RoundPercentage(rollWeights[index], total);
        }

        return new RotationShopWeights(rollWeights, displayWeights);
    }

    private static uint RoundPercentage(double weight, double total)
    {
        if (total <= 0 || weight <= 0) return 0;
        return (uint)Math.Round(weight * 100.0 / total, MidpointRounding.AwayFromZero);
    }

    private sealed record RotationShopWeights(
        IReadOnlyList<double> RollWeights,
        IReadOnlyList<uint> DisplayWeights);

    /// <summary>已穿戴的产金装备（财富宝钻）按 ParamList 的「每 N 个备战阶段给 M 金」结算。</summary>
    private void GrantEquippedPeriodicGold()
    {
        var equippedIds = Roles
            .SelectMany(role => role.EquippedEquipmentUniqueIds)
            .Select(uniqueId => Equipments.FirstOrDefault(item => item.UniqueId == uniqueId)?.EquipmentId ?? 0)
            .Where(id => id != 0);

        uint gold = 0;
        foreach (var equipmentId in equippedIds)
        {
            var config = GameData.GridFightEquipmentData.GetValueOrDefault(equipmentId);
            if (config?.EquipFunc != GridFightEquipFuncTypeEnum.AvatarMaxNumberAdd) continue;
            var interval = (uint)Math.Max(0, config.ParamList.ElementAtOrDefault(0)?.Value ?? 0);
            var amount = (uint)Math.Max(0, config.ParamList.ElementAtOrDefault(1)?.Value ?? 0);
            if (interval == 0 || amount == 0) continue;
            if (_preparationPhaseCount % interval != 0) continue;
            gold += amount;
        }
        if (gold > 0) AddGold(gold);
    }

    public bool RefreshShop(bool chargeGold)
    {
        if (chargeGold &&
            (Phase != GridFightSessionPhase.Preparing ||
             Gold < _catalog.RefreshCost ||
             Shop.Any(slot => slot.SpecialGoodsId != 0 && !slot.SoldOut)))
            return false;
        if (chargeGold) Gold -= _catalog.RefreshCost;
        Shop.Clear();
        var excluded = GetShopExcludedRoleIds();
        var portalEffects = _catalog.GetPortalRuntimeEffects(SelectedPortalId);
        var rolled = _catalog.RollShop(
            PlayerLevel,
            excluded,
            GetShopExtraCandidateRoleIds(excluded),
            portalEffects.ShopBoostTraitIds,
            portalEffects.ShopBoostMultiplier,
            ShopRarityRollWeights);
        var roleIds = rolled.Select(role => role.ID).ToList();
        for (var index = 0; index < roleIds.Count; index++)
        {
            var roleId = roleIds[index];
            Shop.Add(new GridFightShopSlot
            {
                Index = (uint)index,
                RoleId = roleId,
                Price = _catalog.GetBuyPrice(roleId),
            });
        }
        return true;
    }

    /// <summary>银狼 RoleSavedValueList 为空被 RolePool 过滤掉，按当前费用档补进候选池参与稀有度抽取。</summary>
    private IReadOnlyList<GridFightRoleBasicInfoExcel> GetShopExtraCandidateRoleIds(HashSet<uint> excluded)
    {
        var roleId = SilverWolfShopRoleId;
        if (roleId == 0 || excluded.Contains(roleId)) return [];
        if (_catalog.RolePool.Any(row => row.ID == roleId)) return [];
        var row = GameData.GridFightRoleBasicInfoData.GetValueOrDefault(roleId);
        return row is { IsInPool: true } ? [row] : [];
    }

    /// <summary>收集局内已达到三星的角色 ID；若存在切换组，整组一并排除。</summary>
    private HashSet<uint> GetMaxStarExcludedRoleIds()
    {
        const uint maxStar = 3;
        var excluded = new HashSet<uint>();
        foreach (var role in Roles)
        {
            if (role.Star < maxStar) continue;
            excluded.Add(role.RoleId);
            var group = _catalog.RoleSwitchGroups
                .FirstOrDefault(g => g.RoleIdList.Contains(role.RoleId));
            if (group == null) continue;
            foreach (var id in group.RoleIdList)
                excluded.Add(id);
        }
        return excluded;
    }

    /// <summary>商店排除：满三星角色 + 银狼非当前费用档的其它 ID。</summary>
    private HashSet<uint> GetShopExcludedRoleIds()
    {
        var excluded = GetMaxStarExcludedRoleIds();
        foreach (var id in GridFightSpecialFeatures.SilverWolfRoleChain)
        {
            if (id != SilverWolfShopRoleId)
                excluded.Add(id);
        }
        return excluded;
    }

    public GridFightRouteNode CurrentNode => _catalog.GetNode(ChapterId, SectionId);
    public uint CampId => CampIds[checked((int)ChapterId - 1)];
    public uint FightCampId => BattlePlan?.CampId ??
                               (CurrentNode.NodeType == GridFightNodeTypeEnum.Monster ? RewardCampId : 0);
    public uint EliteBranchId => EncounterOptions.FirstOrDefault(option => option.BattlePlan == BattlePlan)?.EliteBranchId ?? 0;
    public uint EncounterRerollCount => _encounterRerollCount;
    public uint CurrentPenaltyRuleId => BattlePlan?.PenaltyRuleId ?? CurrentNode.PenaltyBonusRuleId;

    public uint EffectiveEnemyDifficultyLevel
    {
        get
        {
            var value = (ulong)_catalog.GetEnemyDifficultyLevel(DivisionId) +
                        ActiveInvestmentIds.Aggregate(0UL,
                            (sum, id) => sum + _catalog.GetInvestmentDifficultyAdd(DivisionId, id)) +
                        (BattlePlan?.DifficultyAdd ?? 0);
            return (uint)Math.Min(value, uint.MaxValue);
        }
    }

    private void PrepareInvestmentOffer()
    {
        var quality = _catalog.RollInvestmentQuality(ChapterId, InvestmentOfferCount, ActiveInvestmentIds);
        InvestmentOffer = _catalog.RollInvestmentOffer(ChapterId, quality, InvestmentOfferCount, ActiveInvestmentIds);
        _rerolledInvestmentIds.Clear();
    }

    private void PrepareSupplyOffer()
    {
        SupplyOffer = _catalog.RollSupplyOffer(SupplyOfferCount)
            .Select(offer => new GridFightSupplyOfferState(offer.RoleId, offer.EquipmentId))
            .ToList();
        SupplyRerollCount = 0;
    }

    private void ApplyPortalEntryEquipments(GridFightPortalRuntimeEffects effects)
    {
        foreach (var equipmentId in effects.EntryEquipmentIds)
            TryAddEquipment(equipmentId, out _);
    }

    private void MaterializeInitialRoles(IReadOnlyCollection<uint>? entryRoleIds = null)
    {
        if (Roles.Count > 0) return;
        var roles = _catalog.RollInitialRoles(checked((int)_catalog.InitialRoleCount)).ToList();
        if (entryRoleIds is { Count: > 0 })
            foreach (var roleId in entryRoleIds)
            {
                if (roles.Any(role => role.ID == roleId) ||
                    !GameData.GridFightRoleBasicInfoData.TryGetValue(roleId, out var role) ||
                    !GameData.GridFightRoleStarData.ContainsKey(roleId << 4 | 1))
                    continue;
                roles.Add(role);
            }
        for (var index = 0; index < roles.Count; index++)
            Roles.Add(new GridFightRoleState
            {
                UniqueId = _nextEntityUniqueId++,
                RoleId = roles[index].ID,
                Star = 1,
                Position = 14u + (uint)index,
            });
        RecalculateRoleSwitches();
    }

    private List<GridFightRoleMergeStep> MergeRoles(uint roleId, GridFightRoleState? preferred = null)
    {
        var steps = new List<GridFightRoleMergeStep>();
        var switchGroup = _catalog.RoleSwitchGroups.FirstOrDefault(group => group.RoleIdList.Contains(roleId));
        var mergeRoleIds = switchGroup?.RoleIdList.ToHashSet() ?? [roleId];
        var starRoleId = switchGroup?.BaseRoleId ?? roleId;
        while (true)
        {
            var group = Roles.Where(role => mergeRoleIds.Contains(role.RoleId))
                .GroupBy(role => role.Star)
                .OrderBy(grouping => grouping.Key)
                .FirstOrDefault(grouping => grouping.Count() >= 3 &&
                    GameData.GridFightRoleStarData.ContainsKey(starRoleId << 4 | (grouping.Key + 1)));
            if (group == null) return steps;
            var merge = SelectMergeParticipants(group.ToList(), preferred);
            var retained = SelectMergeAnchor(merge);
            foreach (var role in merge.Where(role => role != retained))
                role.EquippedEquipmentUniqueIds.Clear();
            foreach (var role in merge) Roles.Remove(role);
            var mergedRole = new GridFightRoleState
            {
                UniqueId = _nextEntityUniqueId++,
                RoleId = roleId,
                Star = group.Key + 1,
                Position = retained.Position,
            };
            mergedRole.EquippedEquipmentUniqueIds.AddRange(retained.EquippedEquipmentUniqueIds);
            Roles.Add(mergedRole);
            preferred = mergedRole;
            steps.Add(new GridFightRoleMergeStep(
                merge.Select(role => role.UniqueId).ToList(),
                mergedRole));
        }
    }

    private static List<GridFightRoleState> SelectMergeParticipants(
        IReadOnlyList<GridFightRoleState> candidates,
        GridFightRoleState? preferred)
    {
        if (candidates.Count <= 3) return candidates.ToList();
        var selected = new List<GridFightRoleState>(3);
        if (preferred != null && candidates.Contains(preferred))
            selected.Add(preferred);
        selected.AddRange(candidates
            .Where(role => !selected.Contains(role))
            .OrderByDescending(role => IsActivePosition(role.Position))
            .ThenByDescending(role => role.EquippedEquipmentUniqueIds.Count)
            .ThenBy(role => role.UniqueId)
            .Take(3 - selected.Count));
        return selected;
    }

    private static GridFightRoleState SelectMergeAnchor(IReadOnlyList<GridFightRoleState> roles)
    {
        return roles
            .OrderByDescending(role => IsActivePosition(role.Position))
            .ThenByDescending(role => role.EquippedEquipmentUniqueIds.Count)
            .ThenBy(role => role.UniqueId)
            .First();
    }

    private IReadOnlyList<GridFightRoleState> GetFinalMergedRoles(
        IEnumerable<GridFightRoleMergeStep> mergeSteps)
    {
        return mergeSteps
            .Select(step => step.AddedRole)
            .Where(role => Roles.Contains(role))
            .ToList();
    }

    private GridFightRoleAcquisitionResult FinalizeRoleAcquisition(GridFightRoleAcquisitionResult acquisition)
    {
        if (!acquisition.Success) return acquisition;
        var acquiredStars = acquisition.AcquiredRoles
            .Concat(acquisition.MergeSteps.Select(step => step.AddedRole))
            .Concat(acquisition.FinalMergedRoles)
            .Where(role => role.Star >= 3)
            .ToList();
        var effects = new List<GridFightRoleUnlockEffect>();

        if (!_cyrenePoemShopUnlocked &&
            acquiredStars.Any(role => role.RoleId == GridFightSpecialFeatures.CyreneRoleId))
        {
            _cyrenePoemShopUnlocked = true;
            RefreshCyrenePoemShop();
            effects.Add(GridFightRoleUnlockEffect.CyrenePoemShop);
        }

        // 银狼 LV999：分段选项池；出战席立即弹窗，否则待生效
        if (_traitEffectSelectEnhanceQueuePosition == null)
        {
            var swMerged = acquisition.MergeSteps
                .Select(step => step.AddedRole)
                .Where(role => Roles.Contains(role) &&
                               GridFightSpecialFeatures.IsSilverWolfRoleId(role.RoleId))
                .ToList();
            if (swMerged.Count > 0)
            {
                var role = swMerged[^1];
                var isFinal =
                    role.RoleId == GridFightSpecialFeatures.SilverWolfTopRoleId &&
                    role.Star >= 3 &&
                    HackConsole == null;

                // 已有同费用二星时，再次合成第二个二星不触发（3/4/5 费均适用；三星终局除外）
                var alreadyOffered = !isFinal &&
                                     role.Star == 2 &&
                                     HasOtherSameTierTwoStarOrAbove(role.RoleId, role.UniqueId);
                if (!alreadyOffered)
                {
                    if (GridFightSpecialFeatures.GetSilverWolfCostTier(role.RoleId) >
                        GridFightSpecialFeatures.GetSilverWolfCostTier(SilverWolfShopRoleId))
                        _silverWolfShopRoleId = role.RoleId;

                    _silverWolfPendingIsFinal = isFinal;
                    PrepareSilverWolfEnhanceOptions(role);

                    if (IsActivePosition(role.Position))
                    {
                        if (TryQueueSilverWolfPendingFromPrepared(role))
                            effects.Add(GridFightRoleUnlockEffect.SilverWolfHackConsole);
                    }
                    else
                    {
                        StoreSilverWolfDeferred(role);
                    }
                }
            }
        }

        return effects.Count == 0 ? acquisition : acquisition with { UnlockEffects = effects };
    }

    private void RefreshCyrenePoemShop()
    {
        Shop.Clear();
        for (var index = 0; index < GridFightSpecialFeatures.CyreneSpecialGoodsIds.Count; index++)
            Shop.Add(new GridFightShopSlot
            {
                Index = (uint)index,
                SpecialGoodsId = GridFightSpecialFeatures.CyreneSpecialGoodsIds[index],
                Price = 0,
            });
    }

    private bool GameDataHasNextLevel()
    {
        try
        {
            _ = _catalog.GetPlayerLevel(PlayerLevel + 1);
            return true;
        }
        catch (KeyNotFoundException)
        {
            return false;
        }
    }

    private bool AdvanceToNextNode()
    {
        var next = _catalog.GetNextNode(ChapterId, SectionId);
        if (next == null) return false;
        ChapterId = next.ChapterId;
        SectionId = next.SectionId;
        PrepareCurrentNode();
        RefreshShop(false);
        return true;
    }

    private void PrepareCurrentNode()
    {
        BattlePlan = null;
        EncounterOptions = [];
        _encounterRerollCount = 0;
        if (CurrentNode.NodeType == GridFightNodeTypeEnum.EliteBranch)
        {
            EncounterOptions = _catalog.RollEncounterOptions(CurrentNode, CampIds, DivisionId);
            return;
        }
        BattlePlan = _catalog.RollBattlePlan(CurrentNode, CampIds, RewardCampId, Bosses);
    }

    private uint GetFreeBenchPosition()
    {
        var max = 13u + _catalog.BenchSize + _catalog.BenchOverflowSize;
        for (var position = 14u; position <= max; position++)
            if (Roles.All(role => role.Position != position) &&
                ForgeItems.All(item => item.Position != position))
                return position;
        return 0;
    }

    private (IReadOnlyList<GridFightRoleState> Roles, IReadOnlyList<GridFightForgeItemState> ForgeItems)
        PromoteOverflowItemsToBench()
    {
        const uint firstBenchPosition = 14;
        var firstOverflowPosition = firstBenchPosition + _catalog.BenchSize;
        var freeBenchPositions = new List<uint>();
        for (var position = firstBenchPosition; position < firstOverflowPosition; position++)
            if (Roles.All(role => role.Position != position) &&
                ForgeItems.All(item => item.Position != position))
                freeBenchPositions.Add(position);

        var overflowItems = Roles
            .Where(role => role.Position >= firstOverflowPosition)
            .Select(role => (
                role.Position,
                role.UniqueId,
                Role: (GridFightRoleState?)role,
                ForgeItem: (GridFightForgeItemState?)null))
            .Concat(ForgeItems
                .Where(item => item.Position >= firstOverflowPosition)
                .Select(item => (
                    item.Position,
                    item.UniqueId,
                    Role: (GridFightRoleState?)null,
                    ForgeItem: (GridFightForgeItemState?)item)))
            .OrderBy(item => item.Position)
            .ThenBy(item => item.UniqueId)
            .ToList();
        var promotedRoles = new List<GridFightRoleState>();
        var promotedForgeItems = new List<GridFightForgeItemState>();
        for (var index = 0; index < freeBenchPositions.Count && index < overflowItems.Count; index++)
        {
            var item = overflowItems[index];
            if (item.Role != null)
            {
                item.Role.Position = freeBenchPositions[index];
                promotedRoles.Add(item.Role);
            }
            else
            {
                item.ForgeItem!.Position = freeBenchPositions[index];
                promotedForgeItems.Add(item.ForgeItem);
            }
        }
        return (promotedRoles, promotedForgeItems);
    }

    private bool IsValidPosition(uint position)
    {
        return position == 0 || IsActivePosition(position) ||
               IsBenchPosition(position);
    }

    private bool IsBenchPosition(uint position) =>
        position is >= 14 && position <= 13 + _catalog.BenchSize + _catalog.BenchOverflowSize;

    private static bool IsActivePosition(uint position) => position is >= 1 and <= 13;

    private static bool IsBackPosition(uint position) => position is >= 5 and <= 13;

    private static bool IsCombatNode(GridFightRouteNode node)
    {
        return node.NodeType is GridFightNodeTypeEnum.Monster or
            GridFightNodeTypeEnum.CampMonster or
            GridFightNodeTypeEnum.EliteBranch or
            GridFightNodeTypeEnum.Boss;
    }
}
