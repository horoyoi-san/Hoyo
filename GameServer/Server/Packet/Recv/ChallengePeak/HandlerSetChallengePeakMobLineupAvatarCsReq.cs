using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.ChallengePeak;

[Opcode(CmdIds.SetChallengePeakMobLineupAvatarCsReq)]
public class HandlerSetChallengePeakMobLineupAvatarCsReq : Handler<SetChallengePeakMobLineupAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetChallengePeakMobLineupAvatarCsReq req)
    {
        await player.ChallengePeakManager!.SetLineupAvatars((int)req.PeakGroupId, req.LineupList.ToList());

        await connection.SendPacket(CmdIds.SetChallengePeakMobLineupAvatarScRsp);
    }
}
