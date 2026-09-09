using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.RelicReforgeConfirmCsReq)]
public class HandlerRelicReforgeConfirmCsReq : Handler<RelicReforgeConfirmCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RelicReforgeConfirmCsReq req)
    {
        await player.AvatarManager!.ConfirmReforgeRelic((int)req.RelicUniqueId, req.IsCancel);
        await connection.SendPacket(CmdIds.RelicReforgeConfirmScRsp);
    }
}
