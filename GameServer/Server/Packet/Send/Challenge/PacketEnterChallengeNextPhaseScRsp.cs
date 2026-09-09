using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Challenge;

public class PacketEnterChallengeNextPhaseScRsp : BasePacket
{
    public PacketEnterChallengeNextPhaseScRsp(PlayerInstance instance) : base(CmdIds.EnterChallengeNextPhaseScRsp)
    {
        var proto = new EnterChallengeNextPhaseScRsp
        {
            Scene = instance.SceneInstance!.ToProto()
        };

        SetData(proto);
    }

    public PacketEnterChallengeNextPhaseScRsp(Retcode code) : base(CmdIds.EnterChallengeNextPhaseScRsp)
    {
        var proto = new EnterChallengeNextPhaseScRsp
        {
            Retcode = (uint)code
        };

        SetData(proto);
    }
}
