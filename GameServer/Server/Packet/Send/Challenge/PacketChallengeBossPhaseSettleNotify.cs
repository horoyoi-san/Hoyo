using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketChallengeBossPhaseSettleNotify : BasePacket
{
    public PacketChallengeBossPhaseSettleNotify(ChallengeBossInstance challenge, BattleTargetList? targetLists = null) :
        base(CmdIds
            .ChallengeBossPhaseSettleNotify)
    {
        var proto = new ChallengeBossPhaseSettleNotify
        {
            ChallengeId = (uint)challenge.Config.ID,
            IsWin = challenge.IsWin,
            IsSecondHalf = challenge.Data.Boss!.CurrentStage == 2,
            ChallengeScore = (uint)challenge.Data.Boss!.ScoreStage1,
            ScoreTwo = (uint)challenge.Data.Boss!.ScoreStage2,
            Star = (uint)challenge.Data.Boss!.Stars,
            Phase = (uint)challenge.Data.Boss!.CurrentStage,
            IsReward = true,
            
            PageType = 1
        };

        proto.BattleTargetList.AddRange(targetLists?.BattleTargetList_ ?? []);

        SetData(proto);
    }
}

