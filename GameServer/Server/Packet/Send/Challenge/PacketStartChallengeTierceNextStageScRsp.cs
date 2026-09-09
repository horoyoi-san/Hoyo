using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketStartChallengeTierceNextStageScRsp : BasePacket
{
    public PacketStartChallengeTierceNextStageScRsp(uint retcode) : base(CmdIds.StartChallengeTierceNextStageScRsp)
    {
        SetData(new StartNextChallengeTierceScRsp { Retcode = retcode });
    }

    public PacketStartChallengeTierceNextStageScRsp(PlayerInstance player, ChallengeTierceInstance inst)
        : base(CmdIds.StartChallengeTierceNextStageScRsp)
    {
        var info = new ChallengeTierceChallengeInfo
        {
            ChallengeId = inst.ChallengeId,
            StageIndex = inst.CurStageIndex,
            IsSingleStage = inst.IsSingleStage
        };

        foreach (var type in new[] { ExtraLineupType.LineupChallenge, ExtraLineupType.LineupChallenge2, ExtraLineupType.LineupChallenge3 })
        {
            var lineup = player.LineupManager!.GetExtraLineup(type);
            if (lineup != null) info.LineupList.Add(lineup.ToProto());
        }

        SetData(new StartNextChallengeTierceScRsp
        {
            ChallengeTierceInfo = info,
            Scene = player.SceneInstance!.ToProto(),
            Retcode = 0
        });
    }
}
