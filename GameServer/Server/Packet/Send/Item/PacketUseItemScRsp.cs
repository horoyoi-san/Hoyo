using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketUseItemScRsp : BasePacket
{
    public PacketUseItemScRsp(Retcode retCode, uint itemId, uint count, List<ItemData>? returnItems) : base(
        CmdIds.UseItemScRsp)
    {
        var proto = new UseItemScRsp
        {
            Retcode = (uint)retCode,
            UseItemId = itemId,
            UseItemCount = count
        };

        if (returnItems != null)
        {
            proto.ReturnData = new ItemList();
            foreach (var item in returnItems) proto.ReturnData.ItemList_.Add(item.ToProto());
        }

        SetData(proto);
    }
}
