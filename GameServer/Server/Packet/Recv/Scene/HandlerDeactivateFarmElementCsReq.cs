using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.DeactivateFarmElementCsReq)]
public class HandlerDeactivateFarmElementCsReq : Handler<DeactivateFarmElementCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DeactivateFarmElementCsReq req)
    {
        if (player.ActiveFarmElementEntityId == req.EntityId)
        {
            player.ActiveFarmElementEntityId = 0;
            player.FarmElementReturnPos = null;
            player.FarmElementReturnRot = null;
        }

        await connection.SendPacket(new PacketDeactivateFarmElementScRsp(req.EntityId));
    }
}
