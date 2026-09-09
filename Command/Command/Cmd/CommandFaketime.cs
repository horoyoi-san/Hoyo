using March7thHoney.Database;
using March7thHoney.GameServer.Server;
using March7thHoney.Internationalization;
using March7thHoney.Util;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("faketime", "Game.Command.Faketime.Desc", "Game.Command.Faketime.Usage",
    permission: CommandPermissions.FakeTime)]
public class CommandFaketime : ICommand
{
    [CommandMethod("off")]
    public async ValueTask Disable(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (player.Data.FakeTimeDate == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Faketime.StatusOff"));
            return;
        }

        player.Data.FakeTimeDate = 0;
        DatabaseHelper.MarkDirty(player.Uid);

        await arg.SendMsg(I18NManager.Translate("Game.Command.Faketime.Off"));
        ConnectionDisconnectHelper.KickByGm(arg.Target);
    }

    [CommandDefault]
    public async ValueTask SetFakeTime(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count == 0)
        {
            await arg.SendMsg(ServerTimeProvider.TryGetDate(player.Data.FakeTimeDate, out var current)
                ? I18NManager.Translate("Game.Command.Faketime.Status", FormatDate(current))
                : I18NManager.Translate("Game.Command.Faketime.StatusOff"));
            return;
        }

        if (!ServerTimeProvider.TryParseDateInput(arg.BasicArgs[0], out var dateStamp) ||
            !ServerTimeProvider.TryGetDate(dateStamp, out var date))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Faketime.Usage"));
            return;
        }

        player.Data.FakeTimeDate = dateStamp;
        DatabaseHelper.MarkDirty(player.Uid);

        await arg.SendMsg(I18NManager.Translate("Game.Command.Faketime.Set", FormatDate(date)));
        ConnectionDisconnectHelper.KickByGm(arg.Target);
    }

    private static string FormatDate(DateTime date)
    {
        return date.ToString("yyyy-MM-dd");
    }
}
