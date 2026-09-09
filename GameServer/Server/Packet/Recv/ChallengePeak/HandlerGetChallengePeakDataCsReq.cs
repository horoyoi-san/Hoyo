using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.ChallengePeak;

[Opcode(CmdIds.GetChallengePeakDataCsReq)]
public class HandlerGetChallengePeakDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetChallengePeakDataScRsp(player));
    }
}
