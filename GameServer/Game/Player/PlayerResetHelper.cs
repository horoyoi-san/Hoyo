using March7thHoney.Database;
using March7thHoney.Database.Account;
using March7thHoney.Database.Mail;
using March7thHoney.GameServer.Server;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Player;

// Shared "reset gameplay" routine used by the admin console, the /account reset
// command and the launcher self-reset endpoint. Wipes a uid's gameplay data and
// re-initialises a fresh trailblazer at the configured starting level; the
// account and credentials are kept. The player is kicked first if online.
public static class PlayerResetHelper
{
    /// <summary>Resets the given uid's gameplay data. Returns whether the player was online.</summary>
    /// <param name="uid">Account to wipe.</param>
    /// <param name="enableMission">
    ///     Per-player mission-system override to stamp onto the fresh save (null keeps the server default).
    ///     /mission start passes true so the rebuilt account bootstraps the story chain and gets the story
    ///     starting lineup even on a server running with ServerOption.EnableMission off.
    /// </param>
    public static async Task<bool> ResetGameplayAsync(int uid, bool? enableMission = null)
    {
        if (DatabaseHelper.Instance == null) return false;

        var connection = Listener.GetActiveConnection(uid);
        var wasOnline = connection != null;
        if (connection != null)
            await ConnectionDisconnectHelper.KickByGmAsync(connection);

        DatabaseHelper.Instance.DeleteUidGameplayData(uid);

        var fresh = new PlayerInstance(uid) { PendingMissionEnabledOverride = enableMission };
        // Construction no longer self-initialises (the old ctor did init+seed via Task.Wait);
        // drive the awaited bootstrap explicitly so the reset trailblazer gets its starting roster.
        await fresh.InitializeAsync();
        fresh.Data.Level = ConfigManager.Config.ServerOption.StartTrailblazerLevel;
        fresh.Data.Exp = 0;
        fresh.OnLevelChange();

        var account = AccountData.GetAccountByUid(uid);
        MailHelper.SendWelcomeMail(uid, account?.Username ?? uid.ToString());

        DatabaseHelper.MarkDirty(uid);
        DatabaseHelper.Instance.SaveUidData(uid);

        return wasOnline;
    }
}
