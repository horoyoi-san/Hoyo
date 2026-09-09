using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.DestroyItemCsReq)]
public class HandlerDestroyItemCsReq : Handler<DestroyItemCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DestroyItemCsReq req)
    {
        await player.InventoryManager!.RemoveItem((int)req.ItemId, (int)req.ItemCount);
        await connection.SendPacket(CmdIds.DestroyItemScRsp);
    }
}
