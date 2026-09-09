using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketRestartChallengeTierceScRsp : BasePacket
{
    public PacketRestartChallengeTierceScRsp(uint retcode = 0) : base(CmdIds.RestartChallengeTierceScRsp)
    {
        SetData(new RestartChallengeTierceScRsp { Retcode = retcode });
    }
}
