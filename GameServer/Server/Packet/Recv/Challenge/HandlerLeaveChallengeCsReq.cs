using March7thHoney.Enums.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Challenge;

[Opcode(CmdIds.LeaveChallengeCsReq)]
public class HandlerLeaveChallengeCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        // Only run the leave cleanup (force-quit battle, heal team, teleport) when actually inside a
        // challenge-type scene — otherwise a client could spam this for a free full heal + teleport.
        if (player.SceneInstance is not null && player.SceneInstance.Excel.PlaneType == PlaneTypeEnum.Challenge)
        {
            // As of 1.5.0, the server now has to handle the player leaving battle too
            await player.ForceQuitBattle();

            // Reset lineup
            player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupChallenge, []);
            player.LineupManager.SetExtraLineup(ExtraLineupType.LineupChallenge2, []);


            player.ChallengeManager!.ChallengeInstance = null;
            player.ChallengeManager!.ClearInstance();

            // Leave scene
            player.LineupManager.SetExtraLineup(ExtraLineupType.LineupNone, []);
            // Heal avatars (temproary solution)
            foreach (var avatar in player.LineupManager.GetCurLineup()!.AvatarData!.FormalAvatars)
                avatar.CurrentHp = 10000;

            var leaveEntryId = GameConstants.CHALLENGE_ENTRANCE;
            if (player.SceneInstance.LeaveEntryId != 0) leaveEntryId = player.SceneInstance.LeaveEntryId;
            await player.EnterScene(leaveEntryId, 0, true);
        }

        await connection.SendPacket(CmdIds.LeaveChallengeScRsp);
    }
}
