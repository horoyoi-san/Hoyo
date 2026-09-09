using March7thHoney.Data;
using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("give", "Game.Command.Give.Desc", "Game.Command.Give.Usage", ["g"], permission: CommandPermissions.Give)]
public class CommandGive : ICommand
{
    [CommandDefault]
    public async ValueTask GiveItem(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.BasicArgs.Count == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        GameData.ItemConfigData.TryGetValue(arg.GetInt(0), out var itemData);
        if (itemData == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Give.ItemNotFound"));
            return;
        }

        arg.CharacterArgs.TryGetValue("x", out var str);
        arg.CharacterArgs.TryGetValue("l", out var levelStr);
        arg.CharacterArgs.TryGetValue("r", out var rankStr);
        str ??= "1";
        levelStr ??= "1";
        rankStr ??= "1";
        if (!int.TryParse(str, out var amount) || !int.TryParse(levelStr, out var level) ||
            !int.TryParse(rankStr, out var rank) || amount < 1 || level is < 1 or > 80 || rank is < 1 or > 5)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        await player.InventoryManager!.AddItem(arg.GetInt(0), amount, rank: rank, level: level);

        await arg.SendMsg(I18NManager.Translate("Game.Command.Give.GiveItem", player.Uid.ToString(), amount.ToString(),
            itemData.Name ?? itemData.ID.ToString()));
    }
}
