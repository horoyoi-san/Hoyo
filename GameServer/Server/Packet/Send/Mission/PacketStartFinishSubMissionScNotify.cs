using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mission;

public class PacketStartFinishSubMissionScNotify : BasePacket
{
    public PacketStartFinishSubMissionScNotify(int missionId) : base(CmdIds.StartFinishSubMissionScNotify)
    {
        var proto = new StartFinishSubMissionScNotify
        {
            SubMissionId = (uint)missionId
        };

        SetData(proto);
    }
}
