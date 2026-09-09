using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.EnterChallengeNextPhaseCsReq)]
public class HandlerEnterChallengeNextPhaseCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        if (player.ChallengeManager?.ChallengeInstance is not ChallengeBossInstance boss)
        {
            await connection.SendPacket(new PacketEnterChallengeNextPhaseScRsp(Retcode.RetChallengeNotDoing));
            return;
        }

        await boss.NextPhase();
        await connection.SendPacket(new PacketEnterChallengeNextPhaseScRsp(player));
    }
}
