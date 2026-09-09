using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.RelicReforgeCsReq)]
public class HandlerRelicReforgeCsReq : Handler<RelicReforgeCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RelicReforgeCsReq req)
    {
        await player.AvatarManager!.ReforgeRelic((int)req.RelicUniqueId);
        await connection.SendPacket(CmdIds.RelicReforgeScRsp);
    }
}
