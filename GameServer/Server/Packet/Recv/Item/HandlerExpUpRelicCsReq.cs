using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.ExpUpRelicCsReq)]
public class HandlerExpUpRelicCsReq : Handler<ExpUpRelicCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ExpUpRelicCsReq req)
    {
        var left = await player.InventoryManager!.LevelUpRelic((int)req.RelicUniqueId, req.CostData);

        await connection.SendPacket(new PacketExpUpRelicScRsp(left));
    }
}
