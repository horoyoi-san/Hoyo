using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketGetChallengeTierceControllerScRsp : BasePacket
{
    public PacketGetChallengeTierceControllerScRsp() : base(CmdIds.GetChallengeTierceControllerScRsp)
    {
        SetData(new GetChallengeTierceControllerScRsp());
    }
}
