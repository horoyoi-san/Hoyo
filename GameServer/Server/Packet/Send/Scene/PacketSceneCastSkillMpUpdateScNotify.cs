using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSceneCastSkillMpUpdateScNotify : BasePacket
{
    public PacketSceneCastSkillMpUpdateScNotify(uint castEntityId, int mpCount) : base(
        CmdIds.SceneCastSkillMpUpdateScNotify)
    {
        var proto = new SceneCastSkillMpUpdateScNotify
        {
            CastEntityId = castEntityId,
            Mp = (uint)mpCount
        };

        SetData(proto);
    }
}
