using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Lineup;

[Opcode(CmdIds.ChangeLineupLeaderCsReq)]
public class HandlerChangeLineupLeaderCsReq : Handler<ChangeLineupLeaderCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, ChangeLineupLeaderCsReq req)
    {
        if (player.LineupManager!.GetCurLineup() == null)
        {
            await connection.SendPacket(new PacketChangeLineupLeaderScRsp());
            return;
        }

        var lineup = player.LineupManager!.GetCurLineup()!;
        if (lineup.BaseAvatars?.Count <= (int)req.Slot)
        {
            await connection.SendPacket(new PacketChangeLineupLeaderScRsp());
            return;
        }

        var leaderAvatarId = lineup.BaseAvatars![(int)req.Slot].BaseAvatarId;
        lineup.LeaderAvatarId = leaderAvatarId;
        await player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.TeamLeaderChange);
        await player.SceneInstance!.OnChangeLeader(leaderAvatarId);

        await connection.SendPacket(new PacketChangeLineupLeaderScRsp(req.Slot));
    }
}
