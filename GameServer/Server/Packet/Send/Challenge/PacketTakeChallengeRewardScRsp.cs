using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketTakeChallengeRewardScRsp : BasePacket
{
    public PacketTakeChallengeRewardScRsp(int groupId, List<TakenChallengeRewardInfo>? rewardInfos,
        ItemList? tierceReward) : base(
        CmdIds.TakeChallengeRewardScRsp)
    {
        var proto = new TakeChallengeRewardScRsp();

        if (rewardInfos != null)
        {
            proto.GroupId = (uint)groupId;
            proto.OAKNHADPLJD = tierceReward;

            foreach (var rewardInfo in rewardInfos) proto.TakenRewardList.Add(rewardInfo);
        }
        else
        {
            proto.Retcode = 1;
        }

        SetData(proto);
    }
}
