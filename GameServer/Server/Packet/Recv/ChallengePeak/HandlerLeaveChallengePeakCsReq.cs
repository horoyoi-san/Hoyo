using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Server.Packet.Send.ChallengePeak;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.ChallengePeak;

[Opcode(CmdIds.LeaveChallengePeakCsReq)]
public class HandlerLeaveChallengePeakCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        int? peakGroupId = null;
        // Only run the leave cleanup (heal team, teleport) when actually inside a challenge-type
        // scene — otherwise a client could spam this for a free full heal + teleport.
        if (player.SceneInstance is not null && player.SceneInstance.Excel.PlaneType == PlaneTypeEnum.Challenge)
        {
            // 记下所在王棋 group, 离开后据此刷新总览编队槽位
            if (player.ChallengeManager!.ChallengeInstance?.Data.Peak is { } peak)
                peakGroupId = (int)peak.CurrentPeakGroupId;

            player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupChallenge, []);


            player.ChallengeManager!.ChallengeInstance = null;
            player.ChallengeManager!.ClearInstance();

            // Leave scene
            player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupNone, []);
            // Heal avatars (temproary solution)
            foreach (var avatar in player.LineupManager.GetCurLineup()!.AvatarData!.FormalAvatars)
                avatar.CurrentHp = 10000;

            var leaveEntryId = GameConstants.CHALLENGE_PEAK_ENTRANCE;
            if (player.SceneInstance.LeaveEntryId != 0) leaveEntryId = player.SceneInstance.LeaveEntryId;
            await player.EnterScene(leaveEntryId, 0, true);
        }

        await connection.SendPacket(CmdIds.LeaveChallengePeakScRsp);

        // 离开后回到总览, 补发一次 group 数据让客户端把上次队伍+特性回填进编队槽位; 难度走 group 记忆的默认值
        if (peakGroupId is { } gid)
            await player.SendPacket(new PacketChallengePeakGroupDataUpdateScNotify(
                player.ChallengePeakManager!.GetChallengePeakInfo(gid)));
    }
}
