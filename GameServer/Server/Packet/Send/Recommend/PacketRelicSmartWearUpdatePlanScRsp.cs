using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Recommend;

public class PacketRelicSmartWearUpdatePlanScRsp : BasePacket
{
    public PacketRelicSmartWearUpdatePlanScRsp(RelicSmartWearPlan relicPlan)
        : base(CmdIds.RelicSmartWearUpdatePlanScRsp)
    {
        var proto = new RelicSmartWearUpdatePlanScRsp
        {
            RelicPlan = relicPlan
        };

        SetData(proto);
    }
}
