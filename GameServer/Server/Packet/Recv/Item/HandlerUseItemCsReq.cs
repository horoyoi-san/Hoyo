using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.UseItemCsReq)]
public class HandlerUseItemCsReq : Handler<UseItemCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UseItemCsReq req)
    {
        var result =
            await player.InventoryManager!.UseItem((int)req.UseItemId, (int)req.UseItemCount,
                (int)req.BaseAvatarId);

        await connection.SendPacket(new PacketUseItemScRsp(result.Item1, req.UseItemId, req.UseItemCount,
            result.returnItems));
    }
}
