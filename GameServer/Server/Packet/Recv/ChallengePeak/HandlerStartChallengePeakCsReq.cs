using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.ChallengePeak;

[Opcode(CmdIds.StartChallengePeakCsReq)]
public class HandlerStartChallengePeakCsReq : Handler<StartChallengePeakCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, StartChallengePeakCsReq req)
    {
        var rc = await player.ChallengePeakManager!.StartChallenge((int)req.PeakId, req.BossBuffId,
            req.PeakAvatarIdList.Select(x => (int)x).ToList());
        await connection.SendPacket(new PacketStartChallengePeakScRsp(rc));
    }
}
