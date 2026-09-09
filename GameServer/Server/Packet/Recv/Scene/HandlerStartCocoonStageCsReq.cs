using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.StartCocoonStageCsReq)]
public class HandlerStartCocoonStageCsReq : Handler<StartCocoonStageCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, StartCocoonStageCsReq req)
    {
        var battle =
            await player.BattleManager!.StartCocoonStage((int)req.CocoonId, (int)req.Wave,
                (int)req.WorldLevel);
        player.SceneInstance?.OnEnterStage();

        if (battle != null)
            await connection.SendPacket(new PacketStartCocoonStageScRsp(battle, (int)req.CocoonId, (int)req.Wave));
        else
            await connection.SendPacket(new PacketStartCocoonStageScRsp());
    }
}
