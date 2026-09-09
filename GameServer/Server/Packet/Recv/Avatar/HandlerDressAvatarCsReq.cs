using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.DressAvatarCsReq)]
public class HandlerDressAvatarCsReq : Handler<DressAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DressAvatarCsReq req)
    {
        await player.InventoryManager!.EquipAvatar((int)req.AvatarId, (int)req.EquipmentUniqueId);

        await connection.SendPacket(CmdIds.DressAvatarScRsp);
    }
}
