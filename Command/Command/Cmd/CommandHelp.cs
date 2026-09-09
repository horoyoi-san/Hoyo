using March7thHoney.Internationalization;
using March7thHoney.Util;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("help", "Game.Command.Help.Desc", "Game.Command.Help.Usage", ["h"], permission: CommandPermissions.Help)]
public class CommandHelp : ICommand
{
    [CommandDefault]
    public async ValueTask Help(CommandArg arg)
    {
        var commands = CommandManager.Instance?.CommandInfo;
        if (arg.Args.Count == 1)
        {
            var cmd = arg.Args[0];
            CommandInfoAttribute? command = null;
            if (commands?.TryGetValue(cmd, out var foundCommand) == true)
                command = foundCommand;
            else if (CommandManager.Instance?.CommandAlias.TryGetValue(cmd, out var realCmd) == true &&
                     commands?.TryGetValue(realCmd, out foundCommand) == true)
                command = foundCommand;

            if (command == null)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Help.CommandNotFound"));
                return;
            }

            if (!arg.Sender.HasPermission(command.Permission))
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.NoPermission"));
                return;
            }

            var msg =
                $"/{command.Name} - {I18NManager.Translate(command.Description)}\n\n{I18NManager.Translate(command.Usage)}";
            if (command.Alias.Length > 0)
                msg +=
                    $"\n\n{I18NManager.Translate("Game.Command.Help.CommandAlias")} {command.Alias.ToList().ToArrayString()}";
            if (command.Permission != "")
                msg += $"\n\n{I18NManager.Translate("Game.Command.Help.CommandPermission")} {command.Permission}";

            await arg.SendMsg(msg);
            return;
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.Help.Commands"));
        if (commands == null) return;

        foreach (var command in commands.Values)
        {
            if (!arg.Sender.HasPermission(command.Permission)) continue;

            var msg =
                $"/{command.Name} - {I18NManager.Translate(command.Description)}\n\n{I18NManager.Translate(command.Usage)}";
            if (command.Alias.Length > 0)
                msg +=
                    $"\n\n{I18NManager.Translate("Game.Command.Help.CommandAlias")} {command.Alias.ToList().ToArrayString()}";

            if (command.Permission != "")
                msg += $"\n\n{I18NManager.Translate("Game.Command.Help.CommandPermission")} {command.Permission}";
            await arg.SendMsg(msg);
        }
    }
}
