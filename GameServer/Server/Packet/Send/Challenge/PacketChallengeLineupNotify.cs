using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketChallengeLineupNotify : BasePacket
{
    public PacketChallengeLineupNotify(ExtraLineupType type) : base(CmdIds.ChallengeLineupNotify)
    {
        var proto = new ChallengeLineupNotify
        {
            ExtraLineupType = type
        };

        SetData(proto);
    }
}
