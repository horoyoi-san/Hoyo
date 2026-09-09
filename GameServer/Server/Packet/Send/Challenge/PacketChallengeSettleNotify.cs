using March7thHoney.GameServer.Game.Challenge.Definitions;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketChallengeSettleNotify : BasePacket
{
    public PacketChallengeSettleNotify(BaseLegacyChallengeInstance challenge) : base(CmdIds.ChallengeSettleNotify)
    {
        var proto = new ChallengeSettleNotify
        {
            ChallengeId = (uint)challenge.Config.ID,
            IsWin = challenge.IsWin,
            ChallengeScore = challenge.GetScore1(),
            ScoreTwo = challenge.GetScore2(),
            Star = challenge.GetStars(),
            Reward = new ItemList()
        };

        SetData(proto);
    }
}
