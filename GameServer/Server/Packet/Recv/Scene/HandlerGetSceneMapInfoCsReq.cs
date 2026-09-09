using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.GetSceneMapInfoCsReq)]
public class HandlerGetSceneMapInfoCsReq : Handler<GetSceneMapInfoCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetSceneMapInfoCsReq req)
    {
        await connection.SendPacket(new PacketGetSceneMapInfoScRsp(req, player));
        if (player.MissionManager != null)
            await player.MissionManager.EnsureRunningKillMonsterTargetsVisible();
    }
}
