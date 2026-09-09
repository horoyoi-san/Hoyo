using March7thHoney.GameServer.Server.Packet.Send.Recommend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Recommend;

[Opcode(CmdIds.RelicSmartWearGetPinRelicCsReq)]
public class HandlerRelicSmartWearGetPinRelicCsReq : Handler<RelicSmartWearGetPinRelicCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RelicSmartWearGetPinRelicCsReq req)
    {
        await connection.SendPacket(new PacketRelicSmartWearGetPinRelicScRsp(req.AvatarId));
    }
}
