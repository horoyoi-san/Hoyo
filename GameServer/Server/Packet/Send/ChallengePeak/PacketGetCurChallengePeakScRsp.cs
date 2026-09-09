using March7thHoney.GameServer.Game.Challenge.Instances;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;

public class PacketGetCurChallengePeakScRsp : BasePacket
{
    public PacketGetCurChallengePeakScRsp(PlayerInstance player) : base(CmdIds.GetCurChallengePeakScRsp)
    {
        var proto = new GetCurChallengePeakScRsp();

        if (player.ChallengeManager!.ChallengeInstance is ChallengePeakInstance peak)
        {
            proto.HasPassed = true;
            proto.PeakId = peak.Data.Peak!.CurrentPeakLevelId;
            proto.BossBuffId = peak.Data.Peak!.Buffs.FirstOrDefault(0u);
        }

        SetData(proto);
    }
}
