using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketSellItemScRsp : BasePacket
{
    public PacketSellItemScRsp(List<ItemData> items) : base(CmdIds.SellItemScRsp)
    {
        var proto = new SellItemScRsp
        {
            ReturnItemList = new ItemList
            {
                ItemList_ = { items.Select(x => x.ToProto()) }
            }
        };

        SetData(proto);
    }
}
