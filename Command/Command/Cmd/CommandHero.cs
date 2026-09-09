using March7thHoney.Enums.Avatar;
using March7thHoney.Internationalization;
using March7thHoney.Proto;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("hero", "Game.Command.Hero.Desc", "Game.Command.Hero.Usage", permission: CommandPermissions.Hero)]
public class CommandHero : ICommand
{
    [CommandMethod("0 gender")]
    public async ValueTask ChangeGender(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count < 1)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!arg.TryGetInt(0, out var genderId) || genderId is not 1 and not 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Hero.GenderNotSpecified"));
            return;
        }

        var player = arg.Target!.Player!;
        await player.SetHeroGender((Gender)genderId);

        await arg.SendMsg(I18NManager.Translate("Game.Command.Hero.GenderChanged"));
    }

    [CommandMethod("0 type")]
    public async ValueTask ChangeType(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count < 1)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!arg.TryGetInt(0, out var pathId) || !Enum.IsDefined(typeof(MultiPathAvatarTypeEnum), pathId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Hero.HeroTypeNotSpecified"));
            return;
        }

        var gender = (MultiPathAvatarTypeEnum)pathId;
        var player = arg.Target!.Player!;
        await player.ChangeAvatarPathType(8001, gender);

        await arg.SendMsg(I18NManager.Translate("Game.Command.Hero.HeroTypeChanged"));
    }
}
