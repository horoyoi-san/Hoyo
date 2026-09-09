using March7thHoney.GameServer.Server.Packet.Send.TalkEvent;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.TalkEvent;

[Opcode(CmdIds.FinishFirstTalkByPerformanceNpcCsReq)]
public class HandlerFinishFirstTalkByPerformanceNpcCsReq : Handler<FinishFirstTalkByPerformanceNpcCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishFirstTalkByPerformanceNpcCsReq req)
    {
        await connection.SendPacket(new PacketFinishFirstTalkByPerformanceNpcScRsp(req.PerformanceId));
    }
}