using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mission;

public class PacketMissionAcceptScNotify : BasePacket
{
    public PacketMissionAcceptScNotify(int missionId) : this([missionId])
    {
    }

    public PacketMissionAcceptScNotify(List<int> missionIds) : base(CmdIds.MainMissionAcceptNotify)
    {
        var proto = new CPFCAJBHOIB();
        foreach (var missionId in missionIds) proto.FKOABFGMHJI.Add((uint)missionId);

        SetData(proto);
    }
}
