using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketGetChallengeTierceDataScRsp : BasePacket
{
    public PacketGetChallengeTierceDataScRsp(PlayerInstance player) : base(CmdIds.GetChallengeTierceDataScRsp)
    {
        var proto = new GetChallengeTierceDataScRsp();
        if (player.ChallengeTierceManager != null)
            proto.ChallengeInfoList.AddRange(player.ChallengeTierceManager.BuildHistorySnapshots());
        SetData(proto);
    }
}
