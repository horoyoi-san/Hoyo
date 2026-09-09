using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.SceneCastSkillCsReq)]
public class HandlerSceneCastSkillCsReq : Handler<SceneCastSkillCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SceneCastSkillCsReq req)
    {
        var res = await player.SceneSkillManager!.OnCast(req);

        await connection.SendPacket(new PacketSceneCastSkillScRsp(res.RetCode, req.CastEntityId, res.Instance,
            res.TriggerBattleInfos ?? []));
        if (res.Instance != null) await player.SceneInstance!.OnEnterStage();
    }
}
