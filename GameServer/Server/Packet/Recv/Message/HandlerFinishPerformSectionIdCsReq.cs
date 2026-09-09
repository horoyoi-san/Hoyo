using March7thHoney.GameServer.Server.Packet.Send.Message;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Message;

[Opcode(CmdIds.FinishPerformSectionIdCsReq)]
public class HandlerFinishPerformSectionIdCsReq : Handler<FinishPerformSectionIdCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, FinishPerformSectionIdCsReq req)
    {
        await connection.SendPacket(new PacketFinishPerformSectionIdScRsp());
    }
}
