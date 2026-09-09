using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mission;

public class PacketFinishCosumeItemMissionScRsp : BasePacket
{
    public PacketFinishCosumeItemMissionScRsp(uint subMissionId) : base(CmdIds.FinishCosumeItemMissionScRsp)
    {
        var proto = new FinishCosumeItemMissionScRsp
        {
            SubMissionId = subMissionId
        };

        SetData(proto);
    }

    public PacketFinishCosumeItemMissionScRsp() : base(CmdIds.FinishCosumeItemMissionScRsp)
    {
        var proto = new FinishCosumeItemMissionScRsp
        {
            Retcode = 1
        };
        SetData(proto);
    }
}
