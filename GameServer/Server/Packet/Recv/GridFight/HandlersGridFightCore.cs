using March7thHoney.Data.Custom;
using March7thHoney.GameServer.Game.GridFight;
using March7thHoney.GameServer.Game.GridFight.Battle;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.GridFight;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using static March7thHoney.GameServer.Server.Packet.Recv.GridFight.GridFightPacketFactory;

namespace March7thHoney.GameServer.Server.Packet.Recv.GridFight;

[Opcode(CmdIds.GridFightGetDataCsReq)]
public sealed class HandlerGridFightGetDataCsReq : Handler<GridFightGetDataCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightGetDataCsReq request)
    {
        await connection.SendPacket(new PacketGridFightGetDataScRsp(player));
    }
}

[Opcode(CmdIds.GridFightStartGamePlayCsReq)]
public sealed class HandlerGridFightStartGamePlayCsReq : Handler<GridFightStartGamePlayCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightStartGamePlayCsReq request)
    {
        var manager = player.GridFightManager!;
        var success = manager.Start(request.Season, request.DivisionId, request.IsOverlock);
        var response = new GridFightStartGamePlayScRsp
        {
            Retcode = success ? 0 : (uint)Retcode.RetFail,
        };
        if (success) response.CurrentInfo = manager.BuildCurrentInfo();
        await connection.SendPacket(CreatePacket(CmdIds.GridFightStartGamePlayScRsp, response));
    }
}

[Opcode(CmdIds.GridFightResumeGamePlayCsReq)]
public sealed class HandlerGridFightResumeGamePlayCsReq : Handler<GridFightResumeGamePlayCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightResumeGamePlayCsReq request)
    {
        var manager = player.GridFightManager!;
        var success = manager.Session?.UniqueId == request.UniqueId;
        await connection.SendPacket(CreatePacket(CmdIds.GridFightResumeGamePlayScRsp,
            new GridFightResumeGamePlayScRsp
            {
                Retcode = success ? 0 : (uint)Retcode.RetFail,
            }));
    }
}

[Opcode(CmdIds.GridFightQuitSettleCsReq)]
public sealed class HandlerGridFightQuitSettleCsReq : Handler<GridFightQuitSettleCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightQuitSettleCsReq request)
    {
        var manager = player.GridFightManager!;
        var session = manager.Session;
        if (session == null)
        {
            await connection.SendPacket(CreatePacket(CmdIds.GridFightQuitSettleScRsp,
                new GridFightQuitSettleScRsp { Retcode = (uint)Retcode.RetFail }));
            return;
        }

        var settle = manager.BuildSettleNotify(GridFightSettleReason.Quit);
        await connection.SendPacket(CreatePacket(CmdIds.GridFightSyncKeepWinCntNotify,
            new GridFightSyncKeepWinCntNotify { KeepWinCount = session.KeepWinCount }));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightSettleNotify, settle));
        manager.ClearSession();
        await connection.SendPacket(CreatePacket(CmdIds.GridFightQuitSettleScRsp,
            new GridFightQuitSettleScRsp()));
    }
}

[Opcode(CmdIds.GridFightQuitLeaveGamePlayCsReq)]
public sealed class HandlerGridFightQuitLeaveGamePlayCsReq : Handler<GridFightQuitLeaveGamePlayCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightQuitLeaveGamePlayCsReq request)
    {
        await connection.SendPacket(CreatePacket(CmdIds.GridFightQuitLeaveGamePlayScRsp,
            new GridFightQuitLeaveGamePlayScRsp()));
    }
}

[Opcode(CmdIds.GridFightHandlePendingActionCsReq)]
public sealed class HandlerGridFightHandlePendingActionCsReq : Handler<GridFightHandlePendingActionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightHandlePendingActionCsReq request)
    {
        var manager = player.GridFightManager!;
        var session = manager.Session;
        if (session != null && request.RecommendEquipmentSelectAction != null)
        {
            var selection = session.SelectRecommendedEquipment(
                request.QueuePosition,
                request.RecommendEquipmentSelectAction.EquipmentId);
            if (selection.Success)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildRecommendationSelectionSync(selection)));
            await SendResponse(connection, request.QueuePosition, selection.Success);
            return;
        }
        if (session != null && request.TraitEffectSelectEnhanceAction != null)
        {
            var activation = session.ActivateSilverWolfHackConsole(
                request.QueuePosition,
                request.TraitEffectSelectEnhanceAction.EnhanceOptionId);
            if (activation.Success)
            {
                if (activation.ShopNeedsRefresh)
                    session.RefreshShop(chargeGold: false);
                if (session.ProcessPendingAutoMerge() is { } followUp)
                    activation = activation with { FollowUpAcquisition = followUp };
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildTraitEnhanceActivationSync(activation)));
            }
            else
            {
                // 失败也下发 FinishPending + 解锁，避免进度卡死
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildTraitEnhanceForceUnlockSync(request.QueuePosition)));
            }
            await SendResponse(connection, request.QueuePosition, activation.Success);
            return;
        }
        if (session != null && request.EliteBranchRerollAction != null)
        {
            var success = session.RerollEncounter(request.QueuePosition);
            if (success)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildEncounterRerollSync()));
            await SendResponse(connection, request.QueuePosition, success);
            return;
        }
        if (session != null && request.EliteBranchSelectAction != null)
        {
            var eliteBranchId = request.EliteBranchSelectAction.EliteBranchId;
            var success = session.SelectEncounter(request.QueuePosition, eliteBranchId);
            if (success)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildEncounterSelectionSync(request.QueuePosition, eliteBranchId)));
            await SendResponse(connection, request.QueuePosition, success);
            return;
        }
        if (session != null && request.InvestmentRerollAction != null)
        {
            var success = session.RerollInvestment(
                request.QueuePosition,
                request.InvestmentRerollAction.AugmentId);
            if (success)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildSync(
                    GridFightUpdateSrcType.KgridFightSrcNone,
                    includePending: true)));
            await SendResponse(connection, request.QueuePosition, success);
            return;
        }
        if (session != null && request.InvestmentSelectAction != null)
        {
            var augmentId = request.InvestmentSelectAction.AugmentId;
            var success = session.SelectInvestment(request.QueuePosition, augmentId);
            if (success)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildInvestmentSelectionSync(request.QueuePosition, augmentId)));
            await SendResponse(connection, request.QueuePosition, success);
            return;
        }
        if (session != null && request.SupplyRerollAction != null)
        {
            var success = session.RerollSupply(request.QueuePosition);
            if (success)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildSync(
                    GridFightUpdateSrcType.KgridFightSrcNone,
                    includePending: true)));
            await SendResponse(connection, request.QueuePosition, success);
            return;
        }
        if (session != null && request.SupplySelectAction != null)
        {
            var indices = request.SupplySelectAction.SelectSupplyIndexes.ToList();
            var selection = session.SelectSupply(request.QueuePosition, indices);
            if (selection.Success)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildSupplySelectionSync(request.QueuePosition, indices[0], selection)));
            await SendResponse(connection, request.QueuePosition, selection.Success);
            return;
        }

        var beforeIds = session?.Roles.Select(role => role.UniqueId).ToHashSet() ?? [];
        var kind = ResolveKind(request);
        var portalId = request.PortalSelectAction?.PortalId ?? 0;
        var pendingHandled = session != null && kind != null &&
                             session.HandlePending(request.QueuePosition, kind.Value, portalId);
        GridFightSessionChange? change = null;
        if (pendingHandled)
        {
            var added = session!.Roles.Where(role => !beforeIds.Contains(role.UniqueId)).ToList();
            change = new GridFightSessionChange(true, added, [], [], []);
        }

        if (pendingHandled && kind == GridFightPendingRequestKind.PortalSelect)
        {
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildPortalSelectionSync(request.QueuePosition, change!)));
        }
        else if (pendingHandled && kind == GridFightPendingRequestKind.RoundBegin &&
                 session!.Phase == GridFightSessionPhase.AwaitingInitialOrb)
        {
            var rewards = session.TakeTalentOrbRewards(GridFightTalentRewardTrigger.PlaneEnter, session.ChapterId);
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildInitialRoundSync(request.QueuePosition, rewards)));
        }
        else if (pendingHandled && kind is GridFightPendingRequestKind.RoundBegin or GridFightPendingRequestKind.ReturnPreparation)
        {
            IReadOnlyList<GridFightTalentOrbReward> rewards = kind == GridFightPendingRequestKind.RoundBegin
                ? session!.TakeTalentOrbRewards(GridFightTalentRewardTrigger.PlaneEnter, session.ChapterId)
                : [];
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                kind == GridFightPendingRequestKind.RoundBegin
                    ? manager.BuildBattleRoundSync(request.QueuePosition, rewards)
                    : manager.BuildPendingAdvanceSync(request.QueuePosition, includeShop: true)));
        }
        else if (pendingHandled)
        {
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildSync(
                GridFightUpdateSrcType.KgridFightSrcNone,
                change,
                includePending: true)));
        }

        await SendResponse(connection, request.QueuePosition, pendingHandled);
    }

    private static Task SendResponse(Connection connection, uint queuePosition, bool success)
    {
        return connection.SendPacket(CreatePacket(CmdIds.GridFightHandlePendingActionScRsp,
            new GridFightHandlePendingActionScRsp
            {
                Retcode = success ? 0 : (uint)Retcode.RetFail,
                QueuePosition = queuePosition,
            }));
    }

    private static GridFightPendingRequestKind? ResolveKind(GridFightHandlePendingActionCsReq request)
    {
        if (request.PortalRerollAction != null) return GridFightPendingRequestKind.PortalReroll;
        if (request.PortalSelectAction != null) return GridFightPendingRequestKind.PortalSelect;
        if (request.RoundBeginAction != null) return GridFightPendingRequestKind.RoundBegin;
        if (request.ReturnPreparationAction != null) return GridFightPendingRequestKind.ReturnPreparation;
        return null;
    }
}

[Opcode(CmdIds.GridFightUpdateEliteBranchSelectCsReq)]
public sealed class HandlerGridFightUpdateEliteBranchSelectCsReq : Handler<GridFightUpdateEliteBranchSelectCsReq>
{
    protected override async Task OnHandle(
        Connection connection,
        PlayerInstance player,
        GridFightUpdateEliteBranchSelectCsReq request)
    {
        var manager = player.GridFightManager!;
        var session = manager.Session;
        var success = session != null && session.UpdateEncounterSelection(request.EliteBranchId);
        if (success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildEncounterSelectionUpdateSync(request.EliteBranchId)));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightUpdateEliteBranchSelectScRsp,
            new GridFightUpdateEliteBranchSelectScRsp
            {
                Retcode = success ? 0 : (uint)Retcode.RetFail,
            }));
    }
}

[Opcode(CmdIds.GridFightGetOrbCsReq)]
public sealed class HandlerGridFightGetOrbCsReq : Handler<GridFightGetOrbCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightGetOrbCsReq request)
    {
        var manager = player.GridFightManager!;
        var session = manager.Session;
        if (session == null)
        {
            await connection.SendPacket(CreatePacket(CmdIds.GridFightGetOrbScRsp,
                new GridFightGetOrbScRsp { Retcode = (uint)Retcode.RetFail }));
            return;
        }

        if (!request.TakeAll && request.OrbUniqueIdList.Count == 0)
        {
            var initialSuccess = session.ClaimInitialOrb();
            if (initialSuccess)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildSync(
                    GridFightUpdateSrcType.KgridFightSrcUseOrb,
                    includeGold: true,
                    includeShop: true,
                    includePending: true)));
            await connection.SendPacket(CreatePacket(CmdIds.GridFightGetOrbScRsp,
                new GridFightGetOrbScRsp { Retcode = initialSuccess ? 0 : (uint)Retcode.RetFail }));
            return;
        }

        var applications = session.OpenOrbs(request.OrbUniqueIdList.ToList(), request.TakeAll);
        foreach (var application in applications)
        {
            await connection.SendPacket(CreatePacket(
                CmdIds.GridFightOpenOrbResultScNotify,
                manager.BuildOpenOrbResult(application)));
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildOrbOpenSync(application)));
        }
        var success = applications.Count > 0;
        await connection.SendPacket(CreatePacket(CmdIds.GridFightGetOrbScRsp,
            new GridFightGetOrbScRsp { Retcode = success ? 0 : (uint)Retcode.RetFail }));
    }
}

[Opcode(CmdIds.GridFightBuyGoodsCsReq)]
public sealed class HandlerGridFightBuyGoodsCsReq : Handler<GridFightBuyGoodsCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightBuyGoodsCsReq request)
    {
        var manager = player.GridFightManager!;
        var indices = request.BuyAll
            ? manager.Session?.Shop.Where(slot => !slot.SoldOut).Select(slot => slot.Index).ToList() ?? []
            : request.GoodsIndexList.ToList();
        if (manager.Session?.IsSpecialGoodsPurchase(indices) == true)
        {
            var purchases = manager.Session.BuySpecialGoods(indices);
            if (purchases.Count > 0)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildSpecialGoodsSync(purchases)));
            var specialResponse = new GridFightBuyGoodsScRsp
            {
                Retcode = purchases.Count > 0 ? 0 : (uint)Retcode.RetFail,
            };
            specialResponse.GoodsIndexList.Add(indices);
            await connection.SendPacket(CreatePacket(CmdIds.GridFightBuyGoodsScRsp, specialResponse));
            return;
        }
        var acquisition = manager.Session?.BuyGoods(indices) ?? GridFightRoleAcquisitionResult.Failed;
        if (acquisition.Success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildBuyGoodsSync(indices, acquisition)));
        var response = new GridFightBuyGoodsScRsp { Retcode = acquisition.Success ? 0 : (uint)Retcode.RetFail };
        response.GoodsIndexList.Add(indices);
        await connection.SendPacket(CreatePacket(CmdIds.GridFightBuyGoodsScRsp, response));
    }
}

[Opcode(CmdIds.GridFightUseHackOptionCsReq)]
public sealed class HandlerGridFightUseHackOptionCsReq : Handler<GridFightUseHackOptionCsReq>
{
    protected override async Task OnHandle(
        Connection connection,
        PlayerInstance player,
        GridFightUseHackOptionCsReq request)
    {
        var manager = player.GridFightManager!;
        var result = manager.Session?.UseHackOption(request.OptionId, request.EnemyHpPercent) ??
                     GridFightHackOptionResult.Failed;
        if (result.Success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildHackOptionSync(result)));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightUseHackOptionScRsp,
            new GridFightUseHackOptionScRsp
            {
                Retcode = result.Success ? 0 : (uint)Retcode.RetFail,
            }));
    }
}

[Opcode(CmdIds.GridFightRefreshShopCsReq)]
public sealed class HandlerGridFightRefreshShopCsReq : Handler<GridFightRefreshShopCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightRefreshShopCsReq request)
    {
        var manager = player.GridFightManager!;
        var success = manager.Session?.RefreshShop(true) == true;
        if (success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildRefreshShopSync()));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightRefreshShopScRsp,
            new GridFightRefreshShopScRsp { Retcode = success ? 0 : (uint)Retcode.RetFail }));
    }
}

[Opcode(CmdIds.GridFightRecycleRoleCsReq)]
public sealed class HandlerGridFightRecycleRoleCsReq : Handler<GridFightRecycleRoleCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightRecycleRoleCsReq request)
    {
        var manager = player.GridFightManager!;
        var change = manager.Session?.RecycleRole(request.UniqueId) ?? GridFightSessionChange.Failed;
        if (change.Success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildSync(
                GridFightUpdateSrcType.KgridFightSrcRecycleRole,
                change,
                includeGold: true)));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightRecycleRoleScRsp,
            new GridFightRecycleRoleScRsp { Retcode = change.Success ? 0 : (uint)Retcode.RetFail }));
    }
}

[Opcode(CmdIds.GridFightBuyExpCsReq)]
public sealed class HandlerGridFightBuyExpCsReq : Handler<GridFightBuyExpCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightBuyExpCsReq request)
    {
        var manager = player.GridFightManager!;
        var session = manager.Session;
        var previousLevel = session?.PlayerLevel ?? 0;
        var success = session?.BuyExp() == true;
        if (success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildSync(
                GridFightUpdateSrcType.KgridFightSrcBuyExp,
                includeGold: true,
                includeShop: true,
                includeLevel: true,
                levelChanged: session!.PlayerLevel != previousLevel)));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightBuyExpScRsp,
            new GridFightBuyExpScRsp { Retcode = success ? 0 : (uint)Retcode.RetFail }));
    }
}

[Opcode(CmdIds.GridFightUpdatePosCsReq)]
public sealed class HandlerGridFightUpdatePosCsReq : Handler<GridFightUpdatePosCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightUpdatePosCsReq request)
    {
        var manager = player.GridFightManager!;
        var updates = request.PosInfoList.Select(info => (info.UniqueId, info.Pos)).ToList();
        var change = manager.Session?.UpdatePositions(updates) ?? GridFightSessionChange.Failed;
        if (change.Success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildPositionSync(change)));
        var response = new GridFightUpdatePosScRsp { Retcode = change.Success ? 0 : (uint)Retcode.RetFail };
        response.PosInfoList.Add(request.PosInfoList);
        await connection.SendPacket(CreatePacket(CmdIds.GridFightUpdatePosScRsp, response));
    }
}

[Opcode(CmdIds.GridFightUseForgeCsReq)]
public sealed class HandlerGridFightUseForgeCsReq : Handler<GridFightUseForgeCsReq>
{
    protected override async Task OnHandle(
        Connection connection,
        PlayerInstance player,
        GridFightUseForgeCsReq request)
    {
        var manager = player.GridFightManager!;
        var result = manager.Session?.UseForge(request.UniqueId, request.ForgeTargetIndex) ??
                     GridFightForgeUseResult.Failed;
        if (result.Success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildForgeUseSync(result)));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightUseForgeScRsp,
            new GridFightUseForgeScRsp { Retcode = result.Success ? 0 : (uint)Retcode.RetFail }));
    }
}

[Opcode(CmdIds.GridFightEnterBattleStageCsReq)]
public sealed class HandlerGridFightEnterBattleStageCsReq : Handler<GridFightEnterBattleStageCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightEnterBattleStageCsReq request)
    {
        var manager = player.GridFightManager!;
        var session = manager.Session;
        if (session == null || !session.EnterBattle())
        {
            await connection.SendPacket(new PacketGridFightEnterBattleStageScRsp(null));
            return;
        }
        var battle = GridFightBattleModule.StartBattle(player, session, manager.Catalog);
        if (battle == null)
        {
            session.AbortBattleStart();
            await connection.SendPacket(new PacketGridFightEnterBattleStageScRsp(null));
            return;
        }
        await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildSync(
            GridFightUpdateSrcType.KgridFightSrcEnterNode)));
        await connection.SendPacket(new PacketGridFightEnterBattleStageScRsp(battle.ToProto()));
    }
}

[Opcode(CmdIds.GridFightBackToPrepareCsReq)]
public sealed class HandlerGridFightBackToPrepareCsReq : Handler<GridFightBackToPrepareCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GridFightBackToPrepareCsReq request)
    {
        var success = player.GridFightManager!.Session?.BackToPrepare() == true;
        if (success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                player.GridFightManager.BuildPreparationSync()));
    }
}

internal static class GridFightPacketFactory
{
    public static BasePacket CreatePacket(int cmdId, Google.Protobuf.IMessage data)
    {
        var packet = new BasePacket((ushort)cmdId);
        packet.SetData(data);
        return packet;
    }
}
