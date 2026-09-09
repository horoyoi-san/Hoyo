using March7thHoney.GameServer.Server.Packet.Send.Recommend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Recommend;

[Opcode(CmdIds.RelicSmartWearUpdatePlanCsReq)]
public class HandlerRelicSmartWearUpdatePlanCsReq : Handler<RelicSmartWearUpdatePlanCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RelicSmartWearUpdatePlanCsReq req)
    {
        player.AvatarManager!.UpdateRelicPlan(req.RelicPlan);
        await connection.SendPacket(new PacketRelicSmartWearUpdatePlanScRsp(req.RelicPlan));
    }
}
