using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

// Sent right after the recharge reward popup; the shop stays blocked until it is answered.
[Opcode(CmdIds.CancelAutoConversionCacheCsReq)]
public class HandlerCancelAutoConversionCacheCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketCancelAutoConversionCacheScRsp());
    }
}
