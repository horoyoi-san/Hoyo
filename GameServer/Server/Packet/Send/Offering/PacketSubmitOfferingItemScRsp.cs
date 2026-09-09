using March7thHoney.Database.Inventory;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Offering;

public class PacketSubmitOfferingItemScRsp : BasePacket
{
    public PacketSubmitOfferingItemScRsp(Retcode ret, OfferingTypeData? data) : base(CmdIds.SubmitOfferingItemScRsp)
    {
        var proto = new SubmitOfferingItemScRsp
        {
            Retcode = (uint)ret
        };

        if (data != null) proto.OfferingInfo = data.ToProto();

        SetData(proto);
    }
}
