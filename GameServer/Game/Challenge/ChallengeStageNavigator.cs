using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Challenge;

/// <summary>
///     Shared "enter a challenge node" sequence for challenge types whose stage-entry flow is a
///     plain switch-lineup / enter-scene / set-leave-entry / snapshot-start-state block with no
///     extra per-type side effects in between (currently: Tierce's Start/Next/Single-stage entry).
///     Do not force-fit challenge types whose entry flow has extra steps interleaved between these
///     four (e.g. boss group loading, failure rollback) — see ChallengeManager/ChallengePeakManager,
///     which keep their own entry sequences because they genuinely differ in shape.
/// </summary>
public static class ChallengeStageNavigator
{
    public readonly record struct StageEntryResult(Position StartPos, Position StartRot, int SavedMp);

    /// <summary>
    ///     Switches to the given extra lineup, enters the stage scene, wires up the leave-entry id,
    ///     and snapshots the resulting position/rotation/mp for the caller's instance to persist.
    /// </summary>
    public static async ValueTask<StageEntryResult> EnterStage(PlayerInstance player, ExtraLineupType lineupType,
        int entranceId, int leaveEntryId, bool sendPacket)
    {
        await player.LineupManager!.SetExtraLineup(lineupType, sendPacket);
        await player.EnterScene(entranceId, 0, sendPacket);

        if (player.SceneInstance != null)
            player.SceneInstance.LeaveEntryId = leaveEntryId;

        return new StageEntryResult(
            player.Data.Pos!,
            player.Data.Rot!,
            player.LineupManager.GetCurLineup()?.Mp ?? 0);
    }
}
