using March7thHoney.Data;
using March7thHoney.Enums.GridFight;

namespace March7thHoney.GameServer.Game.GridFight;

public sealed record GridFightConsumableInventoryChange(
    uint GroupId,
    uint ItemId,
    uint RemainingCount,
    bool Removed);

public sealed record GridFightEquipDressResult(
    bool Success,
    IReadOnlyList<GridFightEquipmentState> RemovedEquipments,
    IReadOnlyList<GridFightEquipmentState> AddedEquipments,
    IReadOnlyList<GridFightRoleState> UpdatedRoles,
    bool AutoCrafted,
    bool MaxActiveRolesChanged)
{
    public static GridFightEquipDressResult Failed { get; } = new(false, [], [], [], false, false);
}

public sealed record GridFightEquipCraftResult(
    bool Success,
    IReadOnlyList<GridFightEquipmentState> RemovedEquipments,
    GridFightEquipmentState? AddedEquipment,
    bool MaxActiveRolesChanged)
{
    public static GridFightEquipCraftResult Failed { get; } = new(false, [], null, false);
}

public sealed record GridFightConsumableUseResult(
    bool Success,
    uint ItemId,
    GridFightConsumeTypeEnum Rule,
    GridFightConsumableInventoryChange? InventoryChange,
    IReadOnlyList<GridFightEquipmentState> RemovedEquipments,
    IReadOnlyList<GridFightEquipmentState> AddedEquipments,
    IReadOnlyList<GridFightRoleState> UpdatedRoles,
    GridFightRoleAcquisitionResult? RoleAcquisition,
    bool RecommendationStarted,
    bool MaxActiveRolesChanged)
{
    public static GridFightConsumableUseResult Failed { get; } =
        new(false, 0, GridFightConsumeTypeEnum.Remove, null, [], [], [], null, false, false);
}

public sealed record GridFightRecommendEquipmentSelectionResult(
    bool Success,
    uint FinishedQueuePosition,
    GridFightEquipmentState? Equipment)
{
    public static GridFightRecommendEquipmentSelectionResult Failed { get; } = new(false, 0, null);
}

public sealed record GridFightEquipmentRecommendationState(
    uint QueuePosition,
    uint RoleUniqueId,
    IReadOnlyList<uint> EquipmentIds);

public sealed partial class GridFightSession
{
    private const uint CraftedEquipmentSource = 5;
    private const uint RolledEquipmentSource = 0;
    private const uint RecommendedEquipmentSource = 0;
    /// <summary>骰子每节点随机填充的临时装备 Source，刷新/拆装时回收。</summary>
    private const uint DiceFilledEquipmentSource = 100;
    private const int NormalEquipmentSlotCount = 3;
    /// <summary>随便骰子</summary>
    private const uint CasualDiceEquipmentId = 35030404;
    /// <summary>随便骰子•特权</summary>
    private const uint PrivilegeDiceEquipmentId = 35040404;

    public GridFightEquipmentRecommendationState? EquipmentRecommendation { get; private set; }

    public GridFightEquipDressResult DressEquipment(uint roleUniqueId, uint equipmentUniqueId)
    {
        if (!CanModifyEquipment()) return GridFightEquipDressResult.Failed;
        var role = Roles.FirstOrDefault(candidate => candidate.UniqueId == roleUniqueId);
        var equipment = Equipments.FirstOrDefault(candidate => candidate.UniqueId == equipmentUniqueId);
        if (role == null || equipment == null || role.EquippedEquipmentUniqueIds.Contains(equipmentUniqueId))
            return GridFightEquipDressResult.Failed;
        var previousWearer = FindEquipmentWearer(equipmentUniqueId);
        if (!CanDress(role, equipment)) return GridFightEquipDressResult.Failed;

        var previousMaxActiveRoles = MaxActiveRoles;
        var updatedRoles = new List<GridFightRoleState>();
        var removed = new List<GridFightEquipmentState>();
        var added = new List<GridFightEquipmentState>();
        if (previousWearer != null)
        {
            previousWearer.EquippedEquipmentUniqueIds.Remove(equipmentUniqueId);
            // 骰子从原角色卸下：其填充装备直接销毁（不进背包）
            if (IsDiceEquipment(equipment.EquipmentId))
                DestroyDiceFilledOnRole(previousWearer, removed);
            updatedRoles.Add(previousWearer);
        }
        role.EquippedEquipmentUniqueIds.Add(equipmentUniqueId);
        if (!updatedRoles.Contains(role)) updatedRoles.Add(role);

        var crafted = TryAutoCraftOnRole(role, equipmentUniqueId, removed, added);
        if (IsDiceEquipment(equipment.EquipmentId))
            ApplyDiceEquipmentRefillForRole(role, removed, added, updatedRoles);
        RecalculateRoleSwitches();
        return new GridFightEquipDressResult(
            true,
            removed,
            added,
            updatedRoles,
            crafted,
            previousMaxActiveRoles != MaxActiveRoles);
    }

    public GridFightEquipCraftResult CraftEquipment(
        uint targetEquipmentId,
        IReadOnlyList<uint> materialUniqueIds)
    {
        if (!CanModifyEquipment() || materialUniqueIds.Count != 2 || materialUniqueIds.Distinct().Count() != 2)
            return GridFightEquipCraftResult.Failed;
        var materials = materialUniqueIds
            .Select(uniqueId => Equipments.FirstOrDefault(equipment => equipment.UniqueId == uniqueId))
            .ToList();
        if (materials.Any(equipment => equipment == null) ||
            materials.Any(equipment => FindEquipmentWearer(equipment!.UniqueId) != null))
            return GridFightEquipCraftResult.Failed;
        var materialIds = materials.Select(equipment => equipment!.EquipmentId).Order().ToList();
        var recipe = GameData.GridFightCraftConfigData.Values
            .Where(candidate => candidate.CraftEquipID == targetEquipmentId)
            .OrderBy(candidate => candidate.CraftID)
            .FirstOrDefault(candidate => candidate.CostEquipList.Order().SequenceEqual(materialIds));
        if (recipe == null || !GameData.GridFightEquipmentData.ContainsKey(recipe.CraftEquipID))
            return GridFightEquipCraftResult.Failed;

        var previousMaxActiveRoles = MaxActiveRoles;
        var removed = materials.Cast<GridFightEquipmentState>().ToList();
        foreach (var material in removed) Equipments.Remove(material);
        var added = CreateEquipment(recipe.CraftEquipID, CraftedEquipmentSource);
        RecalculateRoleSwitches();
        return new GridFightEquipCraftResult(
            true,
            removed,
            added,
            previousMaxActiveRoles != MaxActiveRoles);
    }

    public GridFightConsumableUseResult UseConsumable(
        uint groupId,
        uint itemId,
        uint roleUniqueId,
        uint equipmentUniqueId)
    {
        if (!CanModifyEquipment() ||
            !GameData.GridFightConsumablesData.TryGetValue(itemId, out var config))
            return GridFightConsumableUseResult.Failed;
        var consumable = Consumables.FirstOrDefault(item => item.GroupId == groupId && item.ItemId == itemId);
        if (consumable == null || consumable.Count == 0) return GridFightConsumableUseResult.Failed;

        var previousMaxActiveRoles = MaxActiveRoles;
        var removed = new List<GridFightEquipmentState>();
        var added = new List<GridFightEquipmentState>();
        var updatedRoles = new List<GridFightRoleState>();
        GridFightRoleAcquisitionResult? acquisition = null;
        var recommendationStarted = false;
        var success = config.ConsumableRule switch
        {
            GridFightConsumeTypeEnum.Remove => RemoveEquipmentFromRole(roleUniqueId, updatedRoles, removed),
            GridFightConsumeTypeEnum.Roll => RollEquipment(roleUniqueId, equipmentUniqueId, removed, added, updatedRoles),
            GridFightConsumeTypeEnum.Upgrade => UpgradeEquipment(equipmentUniqueId, removed, added, updatedRoles),
            GridFightConsumeTypeEnum.Copy => CopyRole(roleUniqueId, config.ConsumableParamList, out acquisition),
            GridFightConsumeTypeEnum.GainRecommendEquip => StartEquipmentRecommendation(
                roleUniqueId,
                config.ConsumableParamList,
                out recommendationStarted),
            _ => false,
        };
        if (!success) return GridFightConsumableUseResult.Failed;

        RecalculateRoleSwitches();
        var inventoryChange = ConsumeConsumable(consumable, config.IfConsume);
        return new GridFightConsumableUseResult(
            true,
            itemId,
            config.ConsumableRule,
            inventoryChange,
            removed,
            added,
            updatedRoles,
            acquisition,
            recommendationStarted,
            previousMaxActiveRoles != MaxActiveRoles);
    }

    public GridFightRecommendEquipmentSelectionResult SelectRecommendedEquipment(
        uint queuePosition,
        uint equipmentId)
    {
        var recommendation = EquipmentRecommendation;
        if (recommendation == null || recommendation.QueuePosition != queuePosition ||
            !recommendation.EquipmentIds.Contains(equipmentId) ||
            !GameData.GridFightEquipmentData.ContainsKey(equipmentId))
            return GridFightRecommendEquipmentSelectionResult.Failed;
        var equipment = CreateEquipment(equipmentId, RecommendedEquipmentSource);
        EquipmentRecommendation = null;
        PendingQueuePosition++;
        return new GridFightRecommendEquipmentSelectionResult(true, queuePosition, equipment);
    }

    public IReadOnlyList<uint> ResolveRoleTraitIds(GridFightRoleState role)
    {
        var result = GameData.GridFightRoleBasicInfoData.GetValueOrDefault(role.RoleId)?.TraitList.ToHashSet() ?? [];
        foreach (var equipment in GetEquippedEquipment(role))
        {
            var config = GameData.GridFightEquipmentData.GetValueOrDefault(equipment.EquipmentId);
            if (config?.EquipFunc is GridFightEquipFuncTypeEnum.OriginEmblem or
                GridFightEquipFuncTypeEnum.ClassEmblem)
            {
                var traitId = config.EquipFuncParamList.FirstOrDefault();
                if (traitId != 0) result.Add(traitId);
            }
        }
        return result.Order().ToList();
    }

    public uint ResolveTraitExtraMemberCount(uint traitId, IEnumerable<GridFightRoleState> roles)
    {
        return (uint)roles.Sum(role => GetEquippedEquipment(role).Count(equipment =>
        {
            var config = GameData.GridFightEquipmentData.GetValueOrDefault(equipment.EquipmentId);
            return config?.EquipFunc == GridFightEquipFuncTypeEnum.AddTraitLayer &&
                   config.EquipFuncParamList.FirstOrDefault() == traitId;
        }));
    }

    public IReadOnlyList<GridFightEquipmentState> GetEquippedEquipment(GridFightRoleState role)
    {
        return role.EquippedEquipmentUniqueIds
            .Select(uniqueId => Equipments.FirstOrDefault(equipment => equipment.UniqueId == uniqueId))
            .Where(equipment => equipment != null)
            .Cast<GridFightEquipmentState>()
            .ToList();
    }

    private bool CanModifyEquipment()
    {
        return Phase == GridFightSessionPhase.Preparing && EquipmentRecommendation == null;
    }

    private GridFightRoleState? FindEquipmentWearer(uint equipmentUniqueId)
    {
        return Roles.FirstOrDefault(role => role.EquippedEquipmentUniqueIds.Contains(equipmentUniqueId));
    }

    private bool CanDress(GridFightRoleState role, GridFightEquipmentState equipment)
    {
        if (!GameData.GridFightEquipmentData.TryGetValue(equipment.EquipmentId, out var config)) return false;
        var equipped = GetEquippedEquipment(role)
            .Where(candidate => candidate.UniqueId != equipment.UniqueId)
            .ToList();
        var normalEquipped = equipped
            .Where(candidate => GameData.GridFightEquipmentData[candidate.EquipmentId].EquipType !=
                                GridFightEquipmentTypeEnum.Implants)
            .ToList();
        if (config.EquipType != GridFightEquipmentTypeEnum.Implants)
        {
            var willAutoCraft = normalEquipped.Any(candidate =>
                ResolveCraftedEquipmentId(equipment.EquipmentId, candidate.EquipmentId) != 0);
            if (normalEquipped.Count >= NormalEquipmentSlotCount && !willAutoCraft) return false;
            if (normalEquipped.Any(candidate =>
                    GameData.GridFightEquipmentData[candidate.EquipmentId].DressRule ==
                    GridFightEquipDressTypeEnum.DressRuleAllSlotEmpty))
                return false;
        }

        return config.DressRule switch
        {
            GridFightEquipDressTypeEnum.DressRuleNotUnique => true,
            GridFightEquipDressTypeEnum.DressRuleUnique =>
                equipped.All(candidate => candidate.EquipmentId != equipment.EquipmentId),
            GridFightEquipDressTypeEnum.DressRuleAllSlotEmpty => normalEquipped.Count == 0,
            GridFightEquipDressTypeEnum.DressRuleLeader => role.Position == 1,
            GridFightEquipDressTypeEnum.DressRuleTraitOnly =>
                config.DressRuleParamList.Any(ResolveRoleTraitIds(role).Contains),
            GridFightEquipDressTypeEnum.DressRuleUniqueAndExclusiveTrait =>
                equipped.All(candidate => candidate.EquipmentId != equipment.EquipmentId) &&
                config.DressRuleParamList.All(traitId => !ResolveRoleTraitIds(role).Contains(traitId)),
            GridFightEquipDressTypeEnum.DressRuleRoleOnly => config.DressRuleParamList.Contains(role.RoleId),
            _ => false,
        };
    }

    private bool TryAutoCraftOnRole(
        GridFightRoleState role,
        uint newlyEquippedUniqueId,
        ICollection<GridFightEquipmentState> removed,
        ICollection<GridFightEquipmentState> added)
    {
        var newlyEquipped = Equipments.First(equipment => equipment.UniqueId == newlyEquippedUniqueId);
        var craftCandidates = GetEquippedEquipment(role)
            .Where(equipment => equipment.UniqueId != newlyEquippedUniqueId)
            .Where(equipment => GameData.GridFightEquipmentData[equipment.EquipmentId].EquipType !=
                                GridFightEquipmentTypeEnum.Implants)
            .ToList();
        foreach (var other in craftCandidates)
        {
            var craftedEquipmentId = ResolveCraftedEquipmentId(newlyEquipped.EquipmentId, other.EquipmentId);
            if (craftedEquipmentId == 0) continue;

            var insertIndex = Math.Min(
                role.EquippedEquipmentUniqueIds.IndexOf(newlyEquipped.UniqueId),
                role.EquippedEquipmentUniqueIds.IndexOf(other.UniqueId));
            role.EquippedEquipmentUniqueIds.Remove(newlyEquipped.UniqueId);
            role.EquippedEquipmentUniqueIds.Remove(other.UniqueId);
            Equipments.Remove(newlyEquipped);
            Equipments.Remove(other);
            removed.Add(newlyEquipped);
            removed.Add(other);
            var crafted = CreateEquipment(craftedEquipmentId, CraftedEquipmentSource);
            role.EquippedEquipmentUniqueIds.Insert(Math.Max(0, insertIndex), crafted.UniqueId);
            added.Add(crafted);
            return true;
        }
        return false;
    }

    private static uint ResolveCraftedEquipmentId(uint firstEquipmentId, uint secondEquipmentId)
    {
        var materialIds = new[] { firstEquipmentId, secondEquipmentId }.Order().ToList();
        var recipe = GameData.GridFightCraftConfigData.Values
            .OrderBy(candidate => candidate.CraftID)
            .FirstOrDefault(candidate => candidate.CostEquipList.Order().SequenceEqual(materialIds));
        return recipe != null && GameData.GridFightEquipmentData.ContainsKey(recipe.CraftEquipID)
            ? recipe.CraftEquipID
            : 0;
    }

    private bool RemoveEquipmentFromRole(
        uint roleUniqueId,
        ICollection<GridFightRoleState> updatedRoles,
        ICollection<GridFightEquipmentState>? removed = null)
    {
        var role = Roles.FirstOrDefault(candidate => candidate.UniqueId == roleUniqueId);
        if (role == null || role.EquippedEquipmentUniqueIds.Count == 0) return false;
        // 拆装：填充件从角色身上移除并销毁「显示实体」（不进背包），但骰子绑定配置保留
        DestroyDiceFilledOnRole(role, removed);
        role.EquippedEquipmentUniqueIds.Clear();
        updatedRoles.Add(role);
        return true;
    }

    /// <summary>销毁角色身上所有骰子临时填充装备（不进背包）。</summary>
    private void DestroyDiceFilledOnRole(
        GridFightRoleState role,
        ICollection<GridFightEquipmentState>? removed = null)
    {
        foreach (var uniqueId in role.EquippedEquipmentUniqueIds.ToList())
        {
            var equipment = Equipments.FirstOrDefault(item => item.UniqueId == uniqueId);
            if (equipment == null || equipment.Source != DiceFilledEquipmentSource) continue;
            role.EquippedEquipmentUniqueIds.Remove(uniqueId);
            Equipments.Remove(equipment);
            removed?.Add(equipment);
        }
    }

    private bool RollEquipment(
        uint roleUniqueId,
        uint equipmentUniqueId,
        ICollection<GridFightEquipmentState> removed,
        ICollection<GridFightEquipmentState> added,
        ICollection<GridFightRoleState> updatedRoles)
    {
        if (equipmentUniqueId != 0)
        {
            var equipment = Equipments.FirstOrDefault(candidate => candidate.UniqueId == equipmentUniqueId);
            if (equipment == null || FindEquipmentWearer(equipmentUniqueId) != null) return false;
            return RollOneEquipment(equipment, removed, added);
        }

        var role = Roles.FirstOrDefault(candidate => candidate.UniqueId == roleUniqueId);
        if (role == null) return false;
        var replacements = GetEquippedEquipment(role)
            .Select(equipment =>
            {
                var config = GameData.GridFightEquipmentData[equipment.EquipmentId];
                var replacementId = config.EquipType == GridFightEquipmentTypeEnum.Implants
                    ? 0
                    : _catalog.RollEquipment(config.EquipCategory, equipment.EquipmentId);
                return (Equipment: equipment, ReplacementId: replacementId);
            })
            .Where(replacement => replacement.ReplacementId != 0)
            .ToList();
        if (replacements.Count == 0) return false;
        foreach (var replacement in replacements)
        {
            role.EquippedEquipmentUniqueIds.Remove(replacement.Equipment.UniqueId);
            Equipments.Remove(replacement.Equipment);
            removed.Add(replacement.Equipment);
            added.Add(CreateEquipment(replacement.ReplacementId, RolledEquipmentSource));
        }
        updatedRoles.Add(role);
        return true;
    }

    private bool RollOneEquipment(
        GridFightEquipmentState equipment,
        ICollection<GridFightEquipmentState> removed,
        ICollection<GridFightEquipmentState> added)
    {
        var config = GameData.GridFightEquipmentData[equipment.EquipmentId];
        if (config.EquipType == GridFightEquipmentTypeEnum.Implants) return false;
        var replacementId = _catalog.RollEquipment(config.EquipCategory, equipment.EquipmentId);
        if (replacementId == 0) return false;
        Equipments.Remove(equipment);
        removed.Add(equipment);
        added.Add(CreateEquipment(replacementId, RolledEquipmentSource));
        return true;
    }

    private bool UpgradeEquipment(
        uint equipmentUniqueId,
        ICollection<GridFightEquipmentState> removed,
        ICollection<GridFightEquipmentState> added,
        ICollection<GridFightRoleState> updatedRoles)
    {
        var equipment = Equipments.FirstOrDefault(candidate => candidate.UniqueId == equipmentUniqueId);
        if (equipment == null ||
            !GameData.GridFightEquipUpgradeData.TryGetValue(equipment.EquipmentId, out var upgrade) ||
            !GameData.GridFightEquipmentData.ContainsKey(upgrade.UpgradeID))
            return false;
        var wearer = FindEquipmentWearer(equipmentUniqueId);
        if (wearer != null)
        {
            wearer.EquippedEquipmentUniqueIds.Remove(equipmentUniqueId);
            updatedRoles.Add(wearer);
        }
        Equipments.Remove(equipment);
        removed.Add(equipment);
        added.Add(CreateEquipment(upgrade.UpgradeID, equipment.Source));
        return true;
    }

    private bool CopyRole(
        uint roleUniqueId,
        IReadOnlyList<uint> parameters,
        out GridFightRoleAcquisitionResult? acquisition)
    {
        acquisition = null;
        var sourceRole = Roles.FirstOrDefault(role => role.UniqueId == roleUniqueId);
        if (sourceRole == null || parameters.Count < 2 ||
            !GameData.GridFightRoleBasicInfoData.TryGetValue(sourceRole.RoleId, out var roleConfig) ||
            roleConfig.Rarity > parameters[0] || parameters[1] != 1 || GetFreeBenchPosition() == 0)
            return false;
        var acquired = new List<GridFightRoleState>();
        var mergeSteps = new List<GridFightRoleMergeStep>();
        for (var index = 0u; index < parameters[1]; index++)
        {
            var role = new GridFightRoleState
            {
                UniqueId = _nextEntityUniqueId++,
                RoleId = sourceRole.RoleId,
                Star = 1,
                Position = GetFreeBenchPosition(),
            };
            if (role.Position == 0) return false;
            Roles.Add(role);
            acquired.Add(role);
            mergeSteps.AddRange(MergeRoles(role.RoleId, role));
        }
        acquisition = FinalizeRoleAcquisition(new GridFightRoleAcquisitionResult(
            true,
            acquired,
            mergeSteps,
            GetFinalMergedRoles(mergeSteps)));
        return true;
    }

    private bool StartEquipmentRecommendation(
        uint roleUniqueId,
        IReadOnlyList<uint> parameters,
        out bool started)
    {
        started = false;
        var role = Roles.FirstOrDefault(candidate => candidate.UniqueId == roleUniqueId);
        if (role == null || parameters.Count == 0 || parameters[0] == 0 ||
            !GameData.GridFightRoleBasicInfoData.TryGetValue(role.RoleId, out var roleConfig))
            return false;
        var equipmentIds = _catalog.RollRecommendedEquipment(
            role.RoleId,
            roleConfig.FrontBackType,
            checked((int)parameters[0]));
        if (equipmentIds.Count != parameters[0] ||
            equipmentIds.Any(id => !GameData.GridFightEquipmentData.ContainsKey(id)))
            return false;
        EquipmentRecommendation = new GridFightEquipmentRecommendationState(
            PendingQueuePosition,
            roleUniqueId,
            equipmentIds);
        started = true;
        return true;
    }

    private GridFightConsumableInventoryChange? ConsumeConsumable(
        GridFightConsumableState consumable,
        bool shouldConsume)
    {
        if (!shouldConsume) return null;
        consumable.Count--;
        var removed = consumable.Count == 0;
        if (removed) Consumables.Remove(consumable);
        return new GridFightConsumableInventoryChange(
            consumable.GroupId,
            consumable.ItemId,
            consumable.Count,
            removed);
    }

    private GridFightEquipmentState CreateEquipment(uint equipmentId, uint source)
    {
        var equipment = new GridFightEquipmentState
        {
            UniqueId = _nextEntityUniqueId++,
            EquipmentId = equipmentId,
            Source = source,
        };
        Equipments.Add(equipment);
        return equipment;
    }

    /// <summary>战斗结束：所有骰子重随绑定；已穿戴的角色立刻换上新绑定装备。</summary>
    public void ApplyDiceEquipmentRefills()
    {
        foreach (var dice in Equipments.Where(item => IsDiceEquipment(item.EquipmentId)).ToList())
        {
            var privilege = dice.EquipmentId == PrivilegeDiceEquipmentId;
            RerollDiceBinding(dice.UniqueId, privilege);
        }

        foreach (var role in Roles.ToList())
        {
            var dice = GetEquippedEquipment(role).FirstOrDefault(item => IsDiceEquipment(item.EquipmentId));
            if (dice == null) continue;
            ApplyDiceBoundToRole(role, dice, null, null, null);
        }
    }

    /// <summary>穿上骰子沿用已有绑定，无绑定则首次随机；卸下再穿不变，战斗结束才重随。</summary>
    private void ApplyDiceEquipmentRefillForRole(
        GridFightRoleState role,
        ICollection<GridFightEquipmentState>? removed,
        ICollection<GridFightEquipmentState>? added,
        ICollection<GridFightRoleState>? updatedRoles)
    {
        var dice = GetEquippedEquipment(role).FirstOrDefault(item => IsDiceEquipment(item.EquipmentId));
        if (dice == null) return;
        ApplyDiceBoundToRole(role, dice, removed, added, updatedRoles);
    }

    private void ApplyDiceBoundToRole(
        GridFightRoleState role,
        GridFightEquipmentState dice,
        ICollection<GridFightEquipmentState>? removed,
        ICollection<GridFightEquipmentState>? added,
        ICollection<GridFightRoleState>? updatedRoles)
    {
        var privilege = dice.EquipmentId == PrivilegeDiceEquipmentId;
        DestroyDiceFilledOnRole(role, removed);

        var binding = GetOrCreateDiceBinding(dice.UniqueId, privilege, forceReroll: false);
        foreach (var equipmentId in binding)
        {
            if (equipmentId == 0) continue;
            var created = CreateEquipment(equipmentId, DiceFilledEquipmentSource);
            role.EquippedEquipmentUniqueIds.Add(created.UniqueId);
            added?.Add(created);
        }

        if (updatedRoles != null && !updatedRoles.Contains(role))
            updatedRoles.Add(role);
    }

    private uint[] GetOrCreateDiceBinding(uint diceUniqueId, bool privilege, bool forceReroll)
    {
        if (!forceReroll &&
            _diceBoundEquipmentConfigIds.TryGetValue(diceUniqueId, out var existing) &&
            existing.Length > 0)
            return existing;
        return RerollDiceBinding(diceUniqueId, privilege);
    }

    private uint[] RerollDiceBinding(uint diceUniqueId, bool privilege)
    {
        var binding = new uint[]
        {
            RollDiceFillEquipmentId(privilege),
            RollDiceFillEquipmentId(privilege),
        };
        _diceBoundEquipmentConfigIds[diceUniqueId] = binding;
        return binding;
    }

    /// <summary>骰子自身：DressRuleAllSlotEmpty 的可合成 / 特权装备。</summary>
    public static bool IsDiceEquipment(uint equipmentId) =>
        equipmentId is CasualDiceEquipmentId or PrivilegeDiceEquipmentId;

    public bool IsDiceFilledEquipment(GridFightEquipmentState equipment) =>
        equipment.Source == DiceFilledEquipmentSource;

    /// <summary>填充池取骰子同类别（Craftable / Radiant）的普通装备，排除骰子自身与改件。</summary>
    private uint RollDiceFillEquipmentId(bool privilege)
    {
        var diceId = privilege ? PrivilegeDiceEquipmentId : CasualDiceEquipmentId;
        var category = GameData.GridFightEquipmentData.GetValueOrDefault(diceId)?.EquipCategory;
        if (category is null or GridFightEquipCategoryEnum.None) return 0;

        var poolIds = GameData.GridFightEquipmentData.Values
            .Where(row =>
                row.EquipCategory == category &&
                !IsDiceEquipment(row.ID) &&
                row.EquipType != GridFightEquipmentTypeEnum.Implants &&
                row.DressRule != GridFightEquipDressTypeEnum.DressRuleAllSlotEmpty)
            .Select(row => row.ID)
            .ToList();

        return poolIds.Count == 0 ? 0 : poolIds[Random.Shared.Next(poolIds.Count)];
    }
}
