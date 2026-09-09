using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("clear", "Game.Command.Clear.Desc", "Game.Command.Clear.Usage", permission: CommandPermissions.Clear)]
public class CommandClear : ICommand
{
    [CommandMethod("equipment")]
    public async ValueTask ClearEquipment(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var removeList = arg.Target.Player!.InventoryManager!.Data.EquipmentItems.Where(x => x.EquipAvatar == 0)
            .ToList();

        await arg.Target.Player!.InventoryManager!.RemoveItems(removeList.Select(x => (x.ItemId, x.Count, x.UniqueId))
            .ToList());

        await arg.SendMsg(I18NManager.Translate("Game.Command.Clear.ClearEquipment", removeList.Count.ToString()));
    }

    [CommandMethod("relic")]
    public async ValueTask ClearRelic(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var removeList = arg.Target.Player!.InventoryManager!.Data.RelicItems.Where(x => x.EquipAvatar == 0).ToList();

        await arg.Target.Player!.InventoryManager!.RemoveItems(removeList.Select(x => (x.ItemId, x.Count, x.UniqueId))
            .ToList());

        await arg.SendMsg(I18NManager.Translate("Game.Command.Clear.ClearRelic", removeList.Count.ToString()));
    }
}
