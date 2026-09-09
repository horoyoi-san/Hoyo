using March7thHoney.GameServer.Server.Packet.Send.Expedition;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Expedition;

[Opcode(CmdIds.GetExpeditionDataCsReq)]
public class HandlerGetExpeditionDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetExpeditionDataScRsp(player));
    }
}
