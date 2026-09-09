using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketRechargeSuccNotify : BasePacket
{
    public PacketRechargeSuccNotify(string productId, List<ItemData> items, long monthCardOutDateTime)
        : base(CmdIds.RechargeSuccNotify)
    {
        // Which of the two strings the client reads as the product id is not settled, so fill both.
        var proto = new RechargeSuccNotify
        {
            ProductId = productId,
            PriceTier = productId,
            MonthCardOutDateTime = (ulong)Math.Max(monthCardOutDateTime, 0),
            ItemList = new ItemList
            {
                ItemList_ = { items.Select(x => x.ToProto()) }
            }
        };

        SetData(proto);
    }
}
