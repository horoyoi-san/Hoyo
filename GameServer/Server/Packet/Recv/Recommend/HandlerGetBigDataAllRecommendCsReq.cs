using March7thHoney.GameServer.Server.Packet.Send.Recommend;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Recommend;

[Opcode(CmdIds.GetBigDataAllRecommendCsReq)]
public class HandlerGetBigDataAllRecommendCsReq : Handler<GetBigDataAllRecommendCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetBigDataAllRecommendCsReq req)
    {
        await connection.SendPacket(new PacketGetBigDataAllRecommendScRsp(req.BigDataRecommendType));
    }
}
