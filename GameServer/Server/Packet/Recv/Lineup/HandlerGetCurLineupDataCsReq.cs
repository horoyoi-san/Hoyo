using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lineup;

[Opcode(CmdIds.GetCurLineupDataCsReq)]
public class HandlerGetCurLineupDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetCurLineupDataScRsp(player));
    }
}
