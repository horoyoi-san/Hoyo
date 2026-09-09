using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.ComposeSelectedRelicCsReq)]
public class HandlerComposeSelectedRelicCsReq : Handler<ComposeSelectedRelicCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ComposeSelectedRelicCsReq req)
    {
        var count = Math.Max(1, (int)req.Count);
        if (player.InventoryManager!.Data.RelicItems.Count + count > GameConstants.INVENTORY_MAX_RELIC)
        {
            await connection.SendPacket(
                new PacketComposeSelectedRelicScRsp(req.ComposeId, Retcode.RetRelicExceedLimit));
            return;
        }

        var items = await player.InventoryManager.ComposeRelic(req);
        if (items.Count == 0)
        {
            await connection.SendPacket(new PacketComposeSelectedRelicScRsp(req.ComposeId));
            return;
        }

        await connection.SendPacket(new PacketComposeSelectedRelicScRsp(req.ComposeId, items));
    }
}
