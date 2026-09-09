using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Avatar;

public class PacketUnlockSkilltreeScRsp : BasePacket
{
    public PacketUnlockSkilltreeScRsp(Retcode retCode) : base(CmdIds.UnlockSkilltreeScRsp)
    {
        var proto = new UnlockSkillTreeScRsp
        {
            Retcode = (uint)retCode
        };

        SetData(proto);
    }

    public PacketUnlockSkilltreeScRsp(uint pointId, uint level) : base(CmdIds.UnlockSkilltreeScRsp)
    {
        var proto = new UnlockSkillTreeScRsp
        {
            PointId = pointId,
            Level = level
        };

        SetData(proto);
    }
}
