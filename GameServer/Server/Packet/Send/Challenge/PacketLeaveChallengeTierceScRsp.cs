using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketLeaveChallengeTierceScRsp : BasePacket
{
    public PacketLeaveChallengeTierceScRsp(uint retcode = 0) : base(CmdIds.LeaveChallengeTierceScRsp)
    {
        SetData(new LeaveChallengeTierceScRsp { Retcode = retcode });
    }
}
