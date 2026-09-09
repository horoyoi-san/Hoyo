using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Recommend;

public class PacketRelicSmartWearAddPlanScRsp : BasePacket
{
    public PacketRelicSmartWearAddPlanScRsp(RelicSmartWearPlan addPlan) : base(CmdIds.RelicSmartWearAddPlanScRsp)
    {
        var proto = new RelicSmartWearAddPlanScRsp
        {
            RelicPlan = addPlan
        };

        SetData(proto);
    }
}
