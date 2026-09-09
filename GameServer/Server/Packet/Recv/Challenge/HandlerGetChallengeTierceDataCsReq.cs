using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.GetChallengeTierceDataCsReq)]
public class HandlerGetChallengeTierceDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetChallengeTierceDataScRsp(player));
    }
}
