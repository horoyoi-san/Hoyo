using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.SetChallengeTierceLineupCsReq)]
public class HandlerSetChallengeTierceLineupCsReq : Handler<SetChallengeTierceLineupCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetChallengeTierceLineupCsReq req)
    {
        player.ChallengeTierceManager!.PersistEditorLineups(req.ChallengeId, req.StageInfoList);
        await connection.SendPacket(new PacketSetChallengeTierceLineupScRsp());
    }
}
