using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Mission;

public class PacketUpdateTrackMainMissionIdScRsp : BasePacket
{
    public PacketUpdateTrackMainMissionIdScRsp(int prev, int cur) : base(CmdIds.UpdateTrackMainMissionScRsp)
    {
        var proto = new UpdateTrackMainMissionScRsp
        {
            PrevTrackMissionId = (uint)prev,
            TrackMissionId = (uint)cur
        };

        SetData(proto);
    }
}
