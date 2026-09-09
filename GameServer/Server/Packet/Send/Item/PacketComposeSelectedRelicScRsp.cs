using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketComposeSelectedRelicScRsp : BasePacket
{
    public PacketComposeSelectedRelicScRsp(uint composeId) : base(CmdIds.ComposeSelectedRelicScRsp)
    {
        var proto = new ComposeSelectedRelicScRsp
        {
            ComposeId = composeId,
            Retcode = 1
        };

        SetData(proto);
    }

    public PacketComposeSelectedRelicScRsp(uint composeId, Retcode retcode) : base(CmdIds.ComposeSelectedRelicScRsp)
    {
        var proto = new ComposeSelectedRelicScRsp
        {
            ComposeId = composeId,
            Retcode = (uint)retcode
        };

        SetData(proto);
    }

    public PacketComposeSelectedRelicScRsp(uint composeId, IEnumerable<ItemData> items)
        : base(CmdIds.ComposeSelectedRelicScRsp)
    {
        var proto = new ComposeSelectedRelicScRsp
        {
            ReturnItemList = new ItemList
            {
                ItemList_ = { items.Select(item => item.ToProto()) }
            },
            ComposeId = composeId
        };

        SetData(proto);
    }
}
