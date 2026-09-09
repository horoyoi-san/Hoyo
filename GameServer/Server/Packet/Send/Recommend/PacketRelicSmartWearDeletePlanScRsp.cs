using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Recommend;

public class PacketRelicSmartWearDeletePlanScRsp : BasePacket
{
    public PacketRelicSmartWearDeletePlanScRsp(uint uniqueId)
        : base(CmdIds.RelicSmartWearDeletePlanScRsp)
    {
        var proto = new RelicSmartWearDeletePlanScRsp
        {
            UniqueId = uniqueId
        };

        SetData(proto);
    }
}
