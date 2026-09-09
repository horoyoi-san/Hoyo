using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.GetUnlockTeleportCsReq)]
public class HandlerGetUnlockTeleportCsReq : Handler<GetUnlockTeleportCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, GetUnlockTeleportCsReq req)
    {
        await connection.SendPacket(new PacketGetUnlockTeleportScRsp(req));
    }
}
