using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.StarPerformanceRelayCsReq)]
public class HandlerStarPerformanceRelayCsReq : Handler<StarPerformanceRelayCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, StarPerformanceRelayCsReq req)
    {
        await connection.SendPacket(CmdIds.StarPerformanceRelayScRsp);
    }
}
