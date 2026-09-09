using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSceneCastSkillCostMpScRsp : BasePacket
{
    public PacketSceneCastSkillCostMpScRsp(int entityId) : base(CmdIds.SceneCastSkillCostMpScRsp)
    {
        var proto = new SceneCastSkillCostMpScRsp
        {
            CastEntityId = (uint)entityId
        };

        SetData(proto);
    }
}
