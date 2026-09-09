using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Item;

public class PacketExpUpEquipmentScRsp : BasePacket
{
    public PacketExpUpEquipmentScRsp(Retcode retcode, List<ItemData> returnItem) : base(CmdIds.ExpUpEquipmentScRsp)
    {
        var proto = new ExpUpEquipmentScRsp
        {
            Retcode = (uint)retcode
        };
        proto.ReturnItemList.AddRange(returnItem.Select(item => item.ToPileProto()));

        SetData(proto);
    }
}
