using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.SellItemCsReq)]
public class HandlerSellItemCsReq : Handler<SellItemCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SellItemCsReq req)
    {
        var items = await player.InventoryManager!.SellItem(req.CostData, req.HNLKAEBKKBL);
        await connection.SendPacket(new PacketSellItemScRsp(items));
    }
}
