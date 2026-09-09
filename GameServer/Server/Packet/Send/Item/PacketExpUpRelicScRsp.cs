using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketExpUpRelicScRsp : BasePacket
{
    public PacketExpUpRelicScRsp(List<ItemData> leftover) : base(CmdIds.ExpUpRelicScRsp)
    {
        var proto = new ExpUpRelicScRsp();

        foreach (var item in leftover) proto.ReturnItemList.Add(item.ToPileProto());

        SetData(proto);
    }
}
