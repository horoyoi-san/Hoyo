using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.GetCurChallengeCsReq)]
public class HandlerGetCurChallengeCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        // Send packet first
        await connection.SendPacket(await PacketGetCurChallengeScRsp.CreateAsync(player));

        // Update data
        if (player.ChallengeManager!.ChallengeInstance != null)
            player.ChallengeManager.ChallengeInstance.OnUpdate();
    }
}
