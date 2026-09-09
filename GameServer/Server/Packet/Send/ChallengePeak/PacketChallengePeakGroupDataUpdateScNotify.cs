using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;

public class PacketChallengePeakGroupDataUpdateScNotify : BasePacket
{
    public PacketChallengePeakGroupDataUpdateScNotify(Proto.ChallengePeakGroup info) : base(
        CmdIds.ChallengePeakGroupDataUpdateScNotify)
    {
        var proto = new ChallengePeakGroupDataUpdateScNotify
        {
            ChallengePeakGroup = info
        };

        SetData(proto);
    }
}
