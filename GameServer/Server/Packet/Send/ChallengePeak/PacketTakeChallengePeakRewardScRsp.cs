using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;

public class PacketTakeChallengePeakRewardScRsp : BasePacket
{
    public PacketTakeChallengePeakRewardScRsp(uint peakGroupId, List<ChallengePeakRewardGroup>? rewardGroups) : base(
        CmdIds.TakeChallengePeakRewardScRsp)
    {
        var proto = new TakeChallengePeakRewardScRsp
        {
            PeakGroupId = peakGroupId
        };

        if (rewardGroups == null)
            proto.Retcode = 1;
        else
            proto.PeakRewardGroupList.AddRange(rewardGroups);

        SetData(proto);
    }
}
