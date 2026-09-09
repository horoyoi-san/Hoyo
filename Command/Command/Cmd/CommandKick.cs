using March7thHoney.Internationalization;
using March7thHoney.GameServer.Server;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("kick", "Game.Command.Kick.Desc", "Game.Command.Kick.Usage", permission: CommandPermissions.Kick)]
public class CommandKick : ICommand
{
    [CommandDefault]
    public async ValueTask Kick(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        ConnectionDisconnectHelper.KickByGm(arg.Target);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Kick.PlayerKicked", arg.Target.Player!.Data.Name!));
    }
}
