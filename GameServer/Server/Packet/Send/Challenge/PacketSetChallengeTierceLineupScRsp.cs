using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketSetChallengeTierceLineupScRsp : BasePacket
{
    public PacketSetChallengeTierceLineupScRsp(uint retcode = 0) : base(CmdIds.SetChallengeTierceLineupScRsp)
    {
        SetData(new SetChallengeTierceLineupScRsp { Retcode = retcode });
    }
}
