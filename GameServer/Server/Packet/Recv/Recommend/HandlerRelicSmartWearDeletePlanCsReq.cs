using March7thHoney.GameServer.Server.Packet.Send.Recommend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Recommend;

[Opcode(CmdIds.RelicSmartWearDeletePlanCsReq)]
public class HandlerRelicSmartWearDeletePlanCsReq : Handler<RelicSmartWearDeletePlanCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RelicSmartWearDeletePlanCsReq req)
    {
        player.AvatarManager!.DeleteRelicPlan((int)req.UniqueId);
        await connection.SendPacket(new PacketRelicSmartWearDeletePlanScRsp(req.UniqueId));
    }
}
