using March7thHoney.GameServer.Server.Packet.Send.Expedition;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Expedition;

[Opcode(CmdIds.AcceptMultipleExpeditionCsReq)]
public class HandlerAcceptMultipleExpeditionCsReq : Handler<AcceptMultipleExpeditionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, AcceptMultipleExpeditionCsReq req)
    {
        var accepted = player.ExpeditionManager!.AcceptMultipleExpedition(req.Expedition);

        await connection.SendPacket(new PacketAcceptMultipleExpeditionScRsp(player, accepted));
    }
}
