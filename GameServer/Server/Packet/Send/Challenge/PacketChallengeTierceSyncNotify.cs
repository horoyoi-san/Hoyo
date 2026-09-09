using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketChallengeTierceSyncNotify : BasePacket
{
    // 4.4: cmdid ChallengeTierceSyncNotify 被改名为 ChallengeTierceSettleNotify(值仍是 8973)。
    // 移植时误置为 None 导致 Tierce 节点结算同步发不出去（"missing cmd id"），客户端无结算界面、退回场景。
    private PacketChallengeTierceSyncNotify(ChallengeTierceSyncNotify proto) : base(CmdIds.ChallengeTierceSyncNotify)
    {
        SetData(proto);
    }

    public static PacketChallengeTierceSyncNotify ForSingleStage(ChallengeTierceInstance inst, ChallengeTierceStageData stageData)
    {
        var single = new ChallengeTierceSyncSingleStage
        {
            IsPassed = true,
            StageData = stageData
        };
        foreach (var t in inst.FinishedTargetList) single.FinishedTargetList.Add(t);

        return new PacketChallengeTierceSyncNotify(new ChallengeTierceSyncNotify
        {
            IANBCDJPDJF = single
        });
    }

    public static PacketChallengeTierceSyncNotify ForAllStage(ChallengeTierceInstance inst)
    {
        var all = new ChallengeTierceSyncAllStage
        {
            ChallengeId = inst.ChallengeId,
            IsPassed = inst.IsPassed,
            EGEHLOPFELK = new ChallengeTierceRecord
            {
                UsedCycleCount = (uint)Math.Max(0, inst.Config.ChallengeCountDown - inst.RoundsLeftPool),
                TotalScore = (uint)inst.GetRecordScore()
            }
        };
        foreach (var t in inst.FinishedTargetList) all.FinishedTargetList.Add(t);
        foreach (var r in inst.ResultList) all.GBMBAHHDONN.Add(r);

        return new PacketChallengeTierceSyncNotify(new ChallengeTierceSyncNotify
        {
            DFNNKENBOEN = all
        });
    }

    public static PacketChallengeTierceSyncNotify ForMedal(uint groupId)
    {
        return new PacketChallengeTierceSyncNotify(new ChallengeTierceSyncNotify
        {
            Medal = new ChallengeTierceMedal
            {
                GroupId = groupId
            }
        });
    }
}
