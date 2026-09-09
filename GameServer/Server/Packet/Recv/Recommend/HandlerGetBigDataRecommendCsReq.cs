using March7thHoney.GameServer.Server.Packet.Send.Recommend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Recommend;

[Opcode(CmdIds.GetBigDataRecommendCsReq)]
public class HandlerGetBigDataRecommendCsReq : Handler<GetBigDataRecommendCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetBigDataRecommendCsReq req)
    {
        await connection.SendPacket(new PacketGetBigDataRecommendScRsp(req.EquipAvatar, req.BigDataRecommendType));
    }
}
