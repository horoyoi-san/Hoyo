using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.RankUpEquipmentCsReq)]
public class HandlerRankUpEquipmentCsReq : Handler<RankUpEquipmentCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RankUpEquipmentCsReq req)
    {
        var retcode = await player.InventoryManager!.RankUpEquipment((int)req.EquipmentUniqueId, req.CostData);
        await connection.SendPacket(new PacketRankUpEquipmentScRsp(retcode));
    }
}
