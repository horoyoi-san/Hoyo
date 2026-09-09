using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.PromoteAvatarCsReq)]
public class HandlerPromoteAvatarCsReq : Handler<PromoteAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, PromoteAvatarCsReq req)
    {
        await player.InventoryManager!.PromoteAvatar((int)req.BaseAvatarId);

        await connection.SendPacket(CmdIds.PromoteAvatarScRsp);
    }
}
