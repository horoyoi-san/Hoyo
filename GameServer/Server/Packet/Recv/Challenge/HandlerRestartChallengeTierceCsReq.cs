using March7thHoney.GameServer.Server.Packet.Send.Challenge;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.RestartChallengeTierceCsReq)]
public class HandlerRestartChallengeTierceCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var ok = await player.ChallengeTierceManager!.Restart();
        await connection.SendPacket(new PacketRestartChallengeTierceScRsp(
            ok ? 0u : (uint)Retcode.RetChallengeNotExist));

        if (ok && player.SceneInstance != null)
            await connection.SendPacket(new PacketEnterSceneByServerScNotify(player.SceneInstance));
    }
}
