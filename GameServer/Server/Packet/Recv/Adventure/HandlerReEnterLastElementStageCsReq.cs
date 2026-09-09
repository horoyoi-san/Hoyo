using March7thHoney.Data;
using March7thHoney.GameServer.Server.Packet.Send.Adventure;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Adventure;

[Opcode(CmdIds.ReEnterLastElementStageCsReq)]
public class HandlerReEnterLastElementStageCsReq : Handler<ReEnterLastElementStageCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ReEnterLastElementStageCsReq req)
    {
        var stageId = (int)req.StageId;

        GameData.FarmElementConfigData.TryGetValue(stageId, out var config);

        var battle = config != null
            ? await player.BattleManager!.StartFarmElementStage(config)
            : null;

        if (battle != null)
        {
            player.SceneInstance?.OnEnterStage();
            await connection.SendPacket(new PacketReEnterLastElementStageScRsp(battle, stageId));
        }
        else
        {
            await connection.SendPacket(new PacketReEnterLastElementStageScRsp());
        }
    }
}
