using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.SceneEnterStageCsReq)]
public class HandlerSceneEnterStageCsReq : Handler<SceneEnterStageCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SceneEnterStageCsReq req)
    {
        await player.BattleManager!.StartStage((int)req.EventId);
    }
}
