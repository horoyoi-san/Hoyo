using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.StartChallengeTierceCsReq)]
public class HandlerStartChallengeTierceCsReq : Handler<StartChallengeTierceCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, StartChallengeTierceCsReq req)
    {
        bool ok;
        if (req.IsSingleStage)
            ok = await player.ChallengeTierceManager!.StartSingleStage(req.ChallengeId, req.StageIndex);
        else
            ok = await player.ChallengeTierceManager!.StartChallenge(req.ChallengeId, req.StageInfoList);

        if (!ok)
        {
            await connection.SendPacket(new PacketStartChallengeTierceScRsp((uint)Retcode.RetChallengeNotExist));
            return;
        }

        await connection.SendPacket(new PacketStartChallengeTierceScRsp(player,
            player.ChallengeTierceManager!.CurrentInstance!));
    }
}
