using March7thHoney.GameServer.Game.GridFight;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.GridFight;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using static March7thHoney.GameServer.Server.Packet.Recv.GridFight.GridFightPacketFactory;

namespace March7thHoney.GameServer.Server.Packet.Recv.GridFight;

[Opcode(CmdIds.GridFightEquipDressCsReq)]
public sealed class HandlerGridFightEquipDressCsReq : Handler<GridFightEquipDressCsReq>
{
    protected override async Task OnHandle(
        Connection connection,
        PlayerInstance player,
        GridFightEquipDressCsReq request)
    {
        var manager = player.GridFightManager!;
        var result = manager.Session?.DressEquipment(request.RoleUniqueId, request.EquipmentUniqueId) ??
                     GridFightEquipDressResult.Failed;
        if (result.Success)
        {
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildEquipDressSync(result)));
            if (result.MaxActiveRolesChanged)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildPopulationLimitNotify()));
        }
        await connection.SendPacket(CreatePacket(CmdIds.GridFightEquipDressScRsp,
            new GridFightEquipDressScRsp
            {
                Retcode = result.Success ? 0 : (uint)Retcode.RetFail,
            }));
    }
}

[Opcode(CmdIds.GridFightEquipCraftCsReq)]
public sealed class HandlerGridFightEquipCraftCsReq : Handler<GridFightEquipCraftCsReq>
{
    protected override async Task OnHandle(
        Connection connection,
        PlayerInstance player,
        GridFightEquipCraftCsReq request)
    {
        var manager = player.GridFightManager!;
        var result = manager.Session?.CraftEquipment(
                         request.TargetEquipmentId,
                         request.MaterialUniqueIdList.ToList()) ??
                     GridFightEquipCraftResult.Failed;
        if (result.Success)
        {
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildEquipCraftSync(result)));
            // 人口变化时再推一次人口上限（MaxActiveRoleCount），配合进局预解锁的后台格立即生效
            if (result.MaxActiveRolesChanged)
                await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                    manager.BuildPopulationLimitNotify()));
        }
        await connection.SendPacket(CreatePacket(CmdIds.GridFightEquipCraftScRsp,
            new GridFightEquipCraftScRsp
            {
                Retcode = result.Success ? 0 : (uint)Retcode.RetFail,
            }));
    }
}

[Opcode(CmdIds.GridFightUseConsumableCsReq)]
public sealed class HandlerGridFightUseConsumableCsReq : Handler<GridFightUseConsumableCsReq>
{
    protected override async Task OnHandle(
        Connection connection,
        PlayerInstance player,
        GridFightUseConsumableCsReq request)
    {
        var manager = player.GridFightManager!;
        var target = request.Target;
        var roleUniqueId = target?.RemoveTarget?.RoleUniqueId ??
                           target?.RollTarget?.RoleUniqueId ??
                           target?.CopyTarget?.RoleUniqueId ??
                           target?.RecommendTarget?.RoleUniqueId ?? 0;
        var equipmentUniqueId = target?.RollTarget?.EquipmentUniqueId ??
                                target?.UpgradeTarget?.EquipmentUniqueId ?? 0;
        var result = manager.Session?.UseConsumable(
                         request.GroupId,
                         request.ItemId,
                         roleUniqueId,
                         equipmentUniqueId) ??
                     GridFightConsumableUseResult.Failed;
        if (result.Success)
            await connection.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
                manager.BuildConsumableUseSync(result)));
        await connection.SendPacket(CreatePacket(CmdIds.GridFightUseConsumableScRsp,
            new GridFightUseConsumableScRsp
            {
                Retcode = result.Success ? 0 : (uint)Retcode.RetFail,
            }));
    }
}
