using March7thHoney.Data;
using March7thHoney.Enums.GridFight;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.GridFight;

public sealed partial class GridFightManager
{
    public GridFightGameTraitInfo BuildGameTraitInfo()
    {
        var result = new GridFightGameTraitInfo();
        var session = Session;
        if (session == null) return result;
        var activeRoles = session.Roles
            .Where(role => role.Position is >= 1 and <= 13)
            .OrderBy(role => role.Position)
            .ToList();
        foreach (var group in activeRoles
                     .SelectMany(role => session.ResolveRoleTraitIds(role)
                         .Select(traitId => (TraitId: traitId, Role: role)))
                     .GroupBy(entry => entry.TraitId)
                     .OrderBy(group => group.Key))
        {
            var members = group.Select(entry => entry.Role).Distinct().ToList();
            var memberCount = (uint)members.Count + session.ResolveTraitExtraMemberCount(group.Key, activeRoles);
            var trait = new GridGameTraitInfo
            {
                TraitId = group.Key,
                Layer = Battle.GridFightBattleProtoBuilder.ResolveTraitLayer(group.Key, memberCount),
            };
            trait.MemberRoleUniqueIdList.Add(members.Select(role => role.UniqueId));
            if (trait.Layer > 0 && GameData.GridFightTraitBasicInfoData.TryGetValue(group.Key, out var config))
                trait.TraitEffectList.Add(config.TraitEffectList.Select(effectId =>
                    new GridFightTraitEffectInfo { EffectId = effectId }));
            result.GridFightTraitInfo.Add(trait);
        }
        foreach (var entry in session.RoleSwitchEntries)
        {
            var switchEntry = new GridFightRoleSwitchEntry
            {
                CurrentRoleId = entry.CurrentRoleId,
            };
            switchEntry.RoleIdList.Add(entry.RoleIdList);
            result.RoleSwitchList.Add(switchEntry);
        }
        return result;
    }

    public GridFightSyncUpdateResultScNotify BuildEquipDressSync(GridFightEquipDressResult dress)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !dress.Success) return notify;
        if (dress.AutoCrafted)
        {
            var craftResult = new GridFightSyncResultData
            {
                UpdateSource = GridFightUpdateSrcType.KgridFightSrcCraftEquip,
            };
            AppendEquipmentChanges(craftResult, dress.RemovedEquipments, dress.AddedEquipments);
            if (dress.MaxActiveRolesChanged)
                AppendPopulationLimitSync(craftResult);
            notify.ResultList.Add(craftResult);
        }

        var dressResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcDressEquip,
        };
        // 非合成穿装也下发装备增删（骰子填充 / 卸下销毁）
        if (!dress.AutoCrafted)
            AppendEquipmentChanges(dressResult, dress.RemovedEquipments, dress.AddedEquipments);
        foreach (var role in dress.UpdatedRoles.Distinct())
            dressResult.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
        if (!dress.AutoCrafted && dress.MaxActiveRolesChanged)
            AppendPopulationLimitSync(dressResult);
        notify.ResultList.Add(dressResult);
        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcDressEquip);
        notify.ResultList.Add(new GridFightSyncResultData());
        return notify;
    }

    /// <summary>战斗结束后立刻把骰子重随结果推给客户端（不等待下次点开战）。</summary>
    public void AppendDiceEquipmentRefreshSync(GridFightSyncUpdateResultScNotify notify)
    {
        if (Session == null) return;
        var diceRoles = Session.Roles
            .Where(role => Session.GetEquippedEquipment(role).Any(item => GridFightSession.IsDiceEquipment(item.EquipmentId)))
            .ToList();
        if (diceRoles.Count == 0) return;

        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcDressEquip,
        };
        var temps = Session.Equipments.Where(item => Session.IsDiceFilledEquipment(item)).ToList();
        if (temps.Count > 0)
            AppendEquipmentChanges(result, [], temps);
        foreach (var role in diceRoles)
            result.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
        notify.ResultList.Add(result);
    }

    private static bool IsPopulationEquipment(uint equipmentId) =>
        GameData.GridFightEquipmentData.GetValueOrDefault(equipmentId)?.EquipFunc ==
        GridFightEquipFuncTypeEnum.AvatarMaxNumberAdd;

    public GridFightSyncUpdateResultScNotify BuildEquipCraftSync(GridFightEquipCraftResult craft)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !craft.Success || craft.AddedEquipment == null) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcCraftEquip,
        };
        AppendEquipmentChanges(result, craft.RemovedEquipments, [craft.AddedEquipment]);
        // 合成出人口装备时上限会变，立刻刷新后台席位
        if (craft.MaxActiveRolesChanged || IsPopulationEquipment(craft.AddedEquipment.EquipmentId))
            AppendPopulationLimitSync(result);
        notify.ResultList.Add(result);
        notify.ResultList.Add(new GridFightSyncResultData());
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildConsumableUseSync(GridFightConsumableUseResult use)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !use.Success) return notify;
        var result = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcUseConsumable,
        };
        result.EffectParamList.Add(use.ItemId);
        AppendConsumableChange(result, use.InventoryChange);
        AppendEquipmentChanges(result, use.RemovedEquipments, use.AddedEquipments);
        foreach (var role in use.UpdatedRoles.Distinct())
            result.UpdateDynamicList.Add(new GridFightSyncData { UpdateRoleInfo = BuildRole(role) });
        if (use.MaxActiveRolesChanged)
            AppendPopulationLimitSync(result);
        if (use.RoleAcquisition is { Success: true } acquisition)
            AppendAcquiredRoles(result, acquisition);
        if (use.RecommendationStarted && BuildPendingAction() is { } pending)
        {
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                LockInfo = new GridFightLockInfo
                {
                    LockType = GridFightLockType.Gameplay,
                    LockReason = GridFightLockReason.PendingAction,
                },
            });
            result.UpdateDynamicList.Add(new GridFightSyncData { PendingAction = pending });
        }
        notify.ResultList.Add(result);

        if (use.RoleAcquisition is { Success: true } roleAcquisition)
        {
            AppendRoleMergeResults(
                notify,
                GridFightUpdateSrcType.KgridFightSrcCopyRole,
                [use.ItemId],
                roleAcquisition);
        }
        AppendRoleDerivedStateResult(notify, GridFightUpdateSrcType.KgridFightSrcUseConsumable);
        if (use.RoleAcquisition is { Success: true } finalizedAcquisition)
            AppendUnlockEffects(notify, finalizedAcquisition);
        notify.ResultList.Add(new GridFightSyncResultData());
        return notify;
    }

    public GridFightSyncUpdateResultScNotify BuildRecommendationSelectionSync(
        GridFightRecommendEquipmentSelectionResult selection)
    {
        var notify = new GridFightSyncUpdateResultScNotify();
        if (Session == null || !selection.Success || selection.Equipment == null) return notify;
        var addResult = new GridFightSyncResultData
        {
            UpdateSource = GridFightUpdateSrcType.KgridFightSrcUseConsumable,
        };
        addResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            AddGameItemInfo = BuildEquipmentItems([selection.Equipment]),
        });
        notify.ResultList.Add(addResult);

        var finishResult = new GridFightSyncResultData();
        finishResult.UpdateDynamicList.Add(new GridFightSyncData
        {
            FinishPendingActionPos = selection.FinishedQueuePosition,
        });
        finishResult.UpdateDynamicList.Add(new GridFightSyncData { LockInfo = new GridFightLockInfo() });
        notify.ResultList.Add(finishResult);
        notify.ResultList.Add(new GridFightSyncResultData());
        return notify;
    }

    private static GridFightGameItemSyncInfo BuildEquipmentItems(
        IEnumerable<GridFightEquipmentState> equipments)
    {
        var items = new GridFightGameItemSyncInfo();
        items.GridFightEquipmentList.Add(equipments.Select(BuildEquipment));
        return items;
    }

    private static void AppendEquipmentChanges(
        GridFightSyncResultData result,
        IReadOnlyList<GridFightEquipmentState> removed,
        IReadOnlyList<GridFightEquipmentState> added)
    {
        foreach (var equipment in removed)
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                RemoveGameItemInfo = BuildEquipmentItems([equipment]),
            });
        if (added.Count > 0)
            result.UpdateDynamicList.Add(new GridFightSyncData
            {
                AddGameItemInfo = BuildEquipmentItems(added),
            });
    }

    private static void AppendConsumableChange(
        GridFightSyncResultData result,
        GridFightConsumableInventoryChange? change)
    {
        if (change == null) return;
        var items = new GridFightGameItemSyncInfo();
        items.UpdateGridFightConsumableList.Add(new GridFightConsumableUpdateInfo
        {
            GroupId = change.GroupId,
            ItemId = change.ItemId,
            ItemStackCount = -1,
            Num = change.RemainingCount,
        });
        result.UpdateDynamicList.Add(change.Removed
            ? new GridFightSyncData { RemoveGameItemInfo = items }
            : new GridFightSyncData { UpdateGameItemInfo = items });
    }
}
