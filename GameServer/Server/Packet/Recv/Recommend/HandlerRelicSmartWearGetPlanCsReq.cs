using March7thHoney.GameServer.Server.Packet.Send.Recommend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Recommend;

[Opcode(CmdIds.RelicSmartWearGetPlanCsReq)]
public class HandlerRelicSmartWearGetPlanCsReq : Handler<RelicSmartWearGetPlanCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RelicSmartWearGetPlanCsReq req)
    {
        var relicPlan = player.AvatarManager!.GetRelicPlan((int)req.AvatarId);
        await connection.SendPacket(new PacketRelicSmartWearGetPlanScRsp(req.AvatarId, relicPlan));
    }
}
