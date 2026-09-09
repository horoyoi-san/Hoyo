using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Avatar;

public class PacketAvatarExpUpScRsp : BasePacket
{
    public PacketAvatarExpUpScRsp(List<ItemData> returnItem) : base(CmdIds.AvatarExpUpScRsp)
    {
        var proto = new AvatarExpUpScRsp();
        proto.ReturnItemList.AddRange(returnItem.Select(item => item.ToPileProto()));

        SetData(proto);
    }
}
