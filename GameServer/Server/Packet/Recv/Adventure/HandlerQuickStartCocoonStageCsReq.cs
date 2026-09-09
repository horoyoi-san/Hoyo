using March7thHoney.GameServer.Server.Packet.Send.Adventure;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Adventure;

[Opcode(CmdIds.QuickStartCocoonStageCsReq)]
public class HandlerQuickStartCocoonStageCsReq : Handler<QuickStartCocoonStageCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, QuickStartCocoonStageCsReq req)
    {
        // Different proto sets may use either Wave or IHIAFPLIPEK for challenge times.
        var wave = (int)(req.Wave > 0 ? req.Wave : 1);
        if (wave <= 0) wave = 1;

        var battle =
            await player.BattleManager!.StartCocoonStage((int)req.CocoonId, wave,
                (int)req.WorldLevel);

        if (battle != null)
        {
            player.SceneInstance?.OnEnterStage();
            await connection.SendPacket(new PacketQuickStartCocoonStageScRsp(battle, (int)req.CocoonId, wave));
        }
        else
            await connection.SendPacket(new PacketQuickStartCocoonStageScRsp());
    }
}

