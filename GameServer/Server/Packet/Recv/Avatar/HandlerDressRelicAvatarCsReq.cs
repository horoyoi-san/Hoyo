using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.DressRelicAvatarCsReq)]
public class HandlerDressRelicAvatarCsReq : Handler<DressRelicAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DressRelicAvatarCsReq req)
    {
        foreach (var param in req.SwitchList)
            await player.InventoryManager!.EquipRelic((int)req.AvatarId, (int)param.RelicUniqueId,
                (int)param.RelicType);

        await connection.SendPacket(CmdIds.DressRelicAvatarScRsp);
    }
}
