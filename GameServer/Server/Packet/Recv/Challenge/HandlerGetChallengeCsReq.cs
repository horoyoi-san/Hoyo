using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.GetChallengeCsReq)]
public class HandlerGetChallengeCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetChallengeScRsp(player));
    }
}
