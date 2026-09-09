using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.StartNextChallengeTierceCsReq)]
public class HandlerStartChallengeTierceNextStageCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var ok = await player.ChallengeTierceManager!.NextStage();
        if (!ok)
        {
            await connection.SendPacket(new PacketStartChallengeTierceNextStageScRsp((uint)Retcode.RetChallengeNotExist));
            return;
        }
        await connection.SendPacket(new PacketStartChallengeTierceNextStageScRsp(player,
            player.ChallengeTierceManager!.CurrentInstance!));
    }
}
