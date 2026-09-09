using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.TakeOffEquipmentCsReq)]
public class HandlerTakeOffEquipmentCsReq : Handler<TakeOffEquipmentCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeOffEquipmentCsReq req)
    {
        await player.InventoryManager!.UnequipEquipment((int)req.AvatarId);

        await connection.SendPacket(CmdIds.TakeOffEquipmentScRsp);
    }
}
