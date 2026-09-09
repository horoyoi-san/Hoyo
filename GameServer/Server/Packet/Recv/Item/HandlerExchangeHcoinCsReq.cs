using March7thHoney.GameServer.Server.Packet.Send.Item;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Item;

[Opcode(CmdIds.ExchangeHcoinCsReq)]
public class HandlerExchangeHcoinCsReq : Handler<ExchangeHcoinCsReq>
{
    private const int SourceItemId = 3; // Mcoin
    private const int TargetItemId = 1; // Hcoin
    private const int ExchangeRate = 1; // 1:1

    protected override async Task OnHandle(Connection connection, PlayerInstance player, ExchangeHcoinCsReq req)
    {
        if (player?.InventoryManager == null) return;

        if (req.Num == 0)
        {
            await connection.SendPacket(new PacketExchangeHcoinScRsp(0, Retcode.RetHcoinExchangeTooMuch));
            return;
        }

        var sourceItem = player.InventoryManager.GetItem(SourceItemId);
        if (sourceItem == null || sourceItem.Count < req.Num)
        {
            await connection.SendPacket(new PacketExchangeHcoinScRsp(req.Num, Retcode.RetItemNotEnough));
            return;
        }

        await player.InventoryManager.RemoveItem(SourceItemId, (int)req.Num, sync: false);
        await player.InventoryManager.AddItem(TargetItemId, (int)req.Num * ExchangeRate, notify: false, sync: false);
        await player.SendPacket(new PacketPlayerSyncScNotify(player.ToProto()));

        await connection.SendPacket(new PacketExchangeHcoinScRsp(req.Num));
    }
}
