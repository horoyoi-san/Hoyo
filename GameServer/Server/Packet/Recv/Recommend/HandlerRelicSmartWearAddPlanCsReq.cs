using March7thHoney.GameServer.Server.Packet.Send.Recommend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Recommend;

[Opcode(CmdIds.RelicSmartWearAddPlanCsReq)]
public class HandlerRelicSmartWearAddPlanCsReq : Handler<RelicSmartWearAddPlanCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RelicSmartWearAddPlanCsReq req)
    {
        var plan = player.AvatarManager!.AddRelicPlan(req.RelicPlan);
        await connection.SendPacket(new PacketRelicSmartWearAddPlanScRsp(plan));
    }
}
