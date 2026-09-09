using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Offering;

public class PacketOfferingInfoScNotify : BasePacket
{
    public PacketOfferingInfoScNotify(OfferingTypeData data) : base(CmdIds.OfferingInfoScNotify)
    {
        var proto = new OfferingInfoScNotify
        {
            OfferingInfo = data.ToProto()
        };

        SetData(proto);
    }
}
