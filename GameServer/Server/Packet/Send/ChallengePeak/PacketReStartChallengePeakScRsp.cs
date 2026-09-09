using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;

public class PacketReStartChallengePeakScRsp : BasePacket
{
    public PacketReStartChallengePeakScRsp(Retcode retcode = Retcode.RetSucc) : base(CmdIds.ReStartChallengePeakScRsp)
    {
        SetData(new ReStartChallengePeakScRsp { Retcode = (uint)retcode });
    }
}
