using JNFDGPDHENJ = March7thHoney.Proto.PlayerSqueezedScNotify.Types.AAFEHKFADDH.Types.JNFDGPDHENJ;
using March7thHoney.Database.Account;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server;

public static class ConnectionDisconnectHelper
{
    private static readonly Logger Logger = new("GameServer");
    private static readonly TimeSpan SendTimeout = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan StopTimeout = TimeSpan.FromSeconds(1);

    public static void KickByGm(Connection? connection)
    {
        _ = Task.Run(() => KickByGmAsync(connection));
    }

    public static Task KickByGmAsync(Connection? connection)
    {
        return DisconnectAsync(connection,
            new PacketPlayerSqueezedScNotify((JNFDGPDHENJ)5));
    }

    public static void KickBanned(Connection? connection, AccountBanStatus banStatus)
    {
        _ = Task.Run(() => KickBannedAsync(connection, banStatus));
    }

    public static Task KickBannedAsync(Connection? connection, AccountBanStatus banStatus)
    {
        return DisconnectAsync(connection, new PacketPlayerSqueezedScNotify(
            (JNFDGPDHENJ)1,
            AccountBanHelper.ToBlackInfo(banStatus)));
    }

    private static async Task DisconnectAsync(Connection? connection, BasePacket packet)
    {
        if (connection == null)
            return;

        try
        {
            var sendTask = connection.SendPacket(packet);
            var completedTask = await Task.WhenAny(sendTask, Task.Delay(SendTimeout));
            if (completedTask == sendTask)
                await sendTask;
            else
                Logger.Warn($"Timed out sending disconnect packet to {connection.RemoteEndPoint}.");
        }
        catch (Exception ex)
        {
            Logger.Warn($"Failed to send disconnect packet to {connection.RemoteEndPoint}.", ex);
        }
        finally
        {
            await StopWithTimeout(connection);
        }
    }

    private static async Task StopWithTimeout(Connection connection)
    {
        try
        {
            var stopTask = Task.Run(connection.Stop);
            var completedTask = await Task.WhenAny(stopTask, Task.Delay(StopTimeout));
            if (completedTask == stopTask)
                await stopTask;
            else
                Logger.Warn($"Timed out stopping connection {connection.RemoteEndPoint}.");
        }
        catch (Exception ex)
        {
            Logger.Warn($"Failed to stop connection {connection.RemoteEndPoint}.", ex);
        }
    }
}
