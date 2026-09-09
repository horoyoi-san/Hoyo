using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.ActiveFarmElementCsReq)]
public class HandlerActivateFarmElementCsReq : Handler<ActiveFarmElementCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ActiveFarmElementCsReq req)
    {
        player.ActiveFarmElementEntityId = req.EntityId;
        player.FarmElementReturnPos = player.Data.Pos;
        player.FarmElementReturnRot = player.Data.Rot;

        await connection.SendPacket(new PacketActivateFarmElementScRsp(req.EntityId, req.WorldLevel));
    }
}
