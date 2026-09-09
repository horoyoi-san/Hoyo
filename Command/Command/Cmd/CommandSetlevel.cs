using March7thHoney.Data;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("setlevel", "Game.Command.Setlevel.Desc", "Game.Command.Setlevel.Usage", ["level"], permission: CommandPermissions.SetLevel)]
public class CommandSetlevel : ICommand
{
    [CommandDefault]
    public async ValueTask SetLevel(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (!arg.TryGetInt(0, out var level) || level is < 1 or > 70)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        var player = arg.Target.Player!;
        player.Data.Level = level;
        player.OnLevelChange();
        player.Data.Exp = GameData.GetPlayerExpRequired(level);
        await player.SendPacket(new PacketPlayerSyncScNotify(player.ToProto()));

        await arg.SendMsg(I18NManager.Translate("Game.Command.Setlevel.SetlevelSuccess"));
    }
}
