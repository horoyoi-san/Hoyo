using March7thHoney.Command;
using March7thHoney.Database;
using March7thHoney.Database.Account;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Chat;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Command;

public class PlayerCommandSender(PlayerInstance player) : ICommandSender
{
    public PlayerInstance Player = player;

    public async ValueTask SendMsg(string msg)
    {
        await Player.SendPacket(new PacketRevcMsgScNotify(
            (uint)ConfigManager.Config.ServerOption.ServerProfile.Uid,
            (uint)Player.Uid,
            msg.Replace("\n", "    "),
            0,
            Extensions.GetUnixSec()));
    }

    public bool HasPermission(string permission)
    {
        var account = DatabaseHelper.Instance!.GetInstance<AccountData>(Player.Uid)!;
        return account.HasPermission(permission);
    }

    public int GetSender()
    {
        return Player.Uid;
    }

    public string? Language => Player.Language;
}
