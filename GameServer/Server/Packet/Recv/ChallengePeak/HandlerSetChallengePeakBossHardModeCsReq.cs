using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.ChallengePeak;

[Opcode(CmdIds.SetChallengePeakBossHardModeCsReq)]
public class HandlerSetChallengePeakBossHardModeCsReq : Handler<SetChallengePeakBossHardModeCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetChallengePeakBossHardModeCsReq req)
    {
        player.ChallengePeakManager!.SetBossHard((int)req.PeakGroupId, req.IsHardMode);

        await connection.SendPacket(new PacketSetChallengePeakBossHardModeScRsp(req.PeakGroupId,
            player.ChallengePeakManager.IsBossHard((int)req.PeakGroupId)));
    }
}
