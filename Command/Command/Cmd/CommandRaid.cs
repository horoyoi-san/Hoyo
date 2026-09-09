using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("raid", "Game.Command.Raid.Desc", "Game.Command.Raid.Usage", permission: CommandPermissions.Raid)]
public class CommandRaid : ICommand
{
    [CommandMethod("0 leave")]
    public async ValueTask Leave(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        await arg.Target.Player!.RaidManager!.LeaveRaid(false);

        await arg.SendMsg(I18NManager.Translate("Game.Command.Raid.Leaved"));
    }

    [CommandMethod("0 reset")]
    public async ValueTask Reset(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count < 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!int.TryParse(arg.BasicArgs[0], out var raidId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
            return;
        }

        if (!int.TryParse(arg.BasicArgs[1], out var level))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Mission.InvalidMissionId"));
            return;
        }

        await arg.Target.Player!.RaidManager!.ClearRaid(raidId, level);

        await arg.SendMsg(I18NManager.Translate("Game.Command.Raid.Leaved"));
    }
}
