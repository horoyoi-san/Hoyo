using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketConfirmChallengeTierceStageSettleScRsp : BasePacket
{
    public PacketConfirmChallengeTierceStageSettleScRsp(uint retcode = 0) : base(CmdIds.ConfirmChallengeTierceStageSettleScRsp)
    {
        SetData(new ConfirmChallengeTierceStageSettleScRsp { Retcode = retcode });
    }
}
