using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.SceneCastSkillCostMpCsReq)]
public class HandlerSceneCastSkillCostMpCsReq : Handler<SceneCastSkillCostMpCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SceneCastSkillCostMpCsReq req)
    {
        await player.LineupManager!.CostMp(1, req.CastEntityId);
        await connection.SendPacket(new PacketSceneCastSkillCostMpScRsp((int)req.CastEntityId));
    }
}
