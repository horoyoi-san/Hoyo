using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.ChallengePeak;

[Opcode(CmdIds.ReStartChallengePeakCsReq)]
public class HandlerReStartChallengePeakCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var rc = await player.ChallengePeakManager!.Restart();
        await connection.SendPacket(new PacketReStartChallengePeakScRsp(rc));
    }
}
