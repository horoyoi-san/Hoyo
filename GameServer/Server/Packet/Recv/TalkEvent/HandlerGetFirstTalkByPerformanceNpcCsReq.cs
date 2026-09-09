using March7thHoney.GameServer.Server.Packet.Send.TalkEvent;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TalkEvent;

[Opcode(CmdIds.GetFirstTalkByPerformanceNpcCsReq)]
public class HandlerGetFirstTalkByPerformanceNpcCsReq : Handler<GetFirstTalkByPerformanceNpcCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetFirstTalkByPerformanceNpcCsReq req)
    {
        await connection.SendPacket(new PacketGetFirstTalkByPerformanceNpcScRsp(req));
    }
}
