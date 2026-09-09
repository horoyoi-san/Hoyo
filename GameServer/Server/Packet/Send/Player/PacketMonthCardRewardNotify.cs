using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketMonthCardRewardNotify : BasePacket
{
    public PacketMonthCardRewardNotify(List<ItemData> items) : base(CmdIds.MonthCardRewardNotify)
    {
        var proto = new MonthCardRewardNotify
        {
            Reward = new ItemList
            {
                ItemList_ = { items.Select(x => x.ToProto()) }
            }
        };

        SetData(proto);
    }
}
