using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Recommend;

public class PacketRelicSmartWearGetPlanScRsp : BasePacket
{
    public PacketRelicSmartWearGetPlanScRsp(uint avatarId, List<RelicSmartWearPlan> relicPlan)
        : base(CmdIds.RelicSmartWearGetPlanScRsp)
    {
        var proto = new RelicSmartWearGetPlanScRsp
        {
            AvatarId = avatarId,
            RelicPlanList = { relicPlan }
        };

        SetData(proto);
    }
}
