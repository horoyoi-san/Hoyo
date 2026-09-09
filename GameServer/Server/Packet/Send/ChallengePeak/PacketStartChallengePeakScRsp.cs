using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;

public class PacketStartChallengePeakScRsp : BasePacket
{
    public PacketStartChallengePeakScRsp(Retcode retcode) : base(CmdIds.StartChallengePeakScRsp)
    {
        var proto = new StartChallengePeakScRsp
        {
            Retcode = (uint)retcode
        };

        SetData(proto);
    }
}
