using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server;

public class Listener : March7thHoneyListener
{
    public static Connection? GetActiveConnection(int uid)
    {
        var con = GetSnapshot().FirstOrDefault(c =>
            (c as Connection)?.Player?.Uid == uid && c.State == SessionStateEnum.ACTIVE) as Connection;
        return con;
    }
}
