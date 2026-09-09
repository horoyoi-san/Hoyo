using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Offering;

public class PacketGetOfferingInfoScRsp : BasePacket
{
    public PacketGetOfferingInfoScRsp(List<OfferingTypeData> dataList) : base(CmdIds.GetOfferingInfoScRsp)
    {
        var proto = new GetOfferingInfoScRsp
        {
            OfferingInfoList = { dataList.Select(data => data.ToProto()).ToList() }
        };

        SetData(proto);
    }
}
