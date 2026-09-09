using March7thHoney.GameServer.Server.Packet.Send.Battle;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Battle;

[Opcode(CmdIds.SyncClientResVersionCsReq)]
public class HandlerSyncClientResVersionCsReq : Handler<SyncClientResVersionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SyncClientResVersionCsReq req)
    {
        await connection.SendPacket(new PacketSyncClientResVersionScRsp(req.ClientResVersion));
    }
}
