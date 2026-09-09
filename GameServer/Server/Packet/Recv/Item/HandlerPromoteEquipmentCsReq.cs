using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.PromoteEquipmentCsReq)]
public class HandlerPromoteEquipmentCsReq : Handler<PromoteEquipmentCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, PromoteEquipmentCsReq req)
    {
        await player.InventoryManager!.PromoteEquipment((int)req.FANHGFFLIID);

        await connection.SendPacket(CmdIds.PromoteEquipmentScRsp);
    }
}
