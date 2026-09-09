using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.Database;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Mission;

[Opcode(CmdIds.UpdateTrackMainMissionCsReq)]
public class HandlerUpdateTrackMainMissionIdCsReq : Handler<UpdateTrackMainMissionCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UpdateTrackMainMissionCsReq req)
    {
        var missionData = player.MissionManager!.Data;
        var prev = missionData.TrackingMainMissionId;
        // The client sends 0/1 as the "auto-select" sentinel, in either of the two request fields.
        var requested = req.TrackMissionId > 1 ? (int)req.TrackMissionId : (int)req.JFONDEBDIOO;
        missionData.TrackingMainMissionId = player.MissionManager.ResolveTrackingMainMissionId(requested);
        DatabaseHelper.MarkDirty(player.Uid);

        await connection.SendPacket(new PacketUpdateTrackMainMissionIdScRsp(prev,
            missionData.TrackingMainMissionId));
    }
}
