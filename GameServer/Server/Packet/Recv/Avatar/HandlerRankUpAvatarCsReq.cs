using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Avatar;

[Opcode(CmdIds.RankUpAvatarCsReq)]
public class HandlerRankUpAvatarCsReq : Handler<RankUpAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, RankUpAvatarCsReq req)
    {
        await player.InventoryManager!.RankUpAvatar((int)req.AvatarId, req.CostData);
        await connection.SendPacket(CmdIds.RankUpAvatarScRsp);
    }
}
