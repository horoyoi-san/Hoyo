using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Avatar;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("remove", "Game.Command.Remove.Desc", "Game.Command.Remove.Usage", ["rm"], permission: CommandPermissions.Remove)]
public class CommandRemove : ICommand
{
    [CommandMethod("0 avatar")]
    public async ValueTask RemoveAvatar(CommandArg arg)
    {
        await RemoveCharacter(arg);
    }

    [CommandMethod("0 character")]
    public async ValueTask RemoveCharacter(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.Args.Count < 2 || !int.TryParse(arg.Args[1], out var avatarId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        var baseAvatarId = GameData.MultiplePathAvatarConfigData.TryGetValue(avatarId, out var multiPathAvatar)
            ? multiPathAvatar.BaseAvatarID
            : avatarId;
        var avatar = player.AvatarManager!.Data.FormalAvatars
            .FirstOrDefault(x => x.BaseAvatarId == baseAvatarId);
        if (avatar == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.NotFound",
                I18NManager.Translate("Word.Avatar"), avatarId.ToString()));
            return;
        }

        if (IsDryRun(arg))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.DryRun",
                "1", I18NManager.Translate("Word.Avatar")));
            return;
        }

        if (!HasConfirmation(arg))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.RequiresConfirm"));
            return;
        }

        UnequipAvatarItems(player.InventoryManager!.Data.EquipmentItems, player.InventoryManager.Data.RelicItems, avatar);
        player.AvatarManager.Data.FormalAvatars.Remove(avatar);
        player.AvatarManager.Data.AssistAvatars.RemoveAll(x => x == avatar.BaseAvatarId || x == avatar.AvatarId);
        player.AvatarManager.Data.DisplayAvatars.RemoveAll(x => x == avatar.BaseAvatarId || x == avatar.AvatarId);

        foreach (var lineup in player.LineupManager!.Data.Lineups.Values)
            lineup.BaseAvatars?.RemoveAll(x => x.BaseAvatarId == avatar.BaseAvatarId);

        await player.SendPacket(new PacketPlayerSyncScNotify(player.AvatarManager.Data.FormalAvatars));
        if (player.LineupManager.GetCurLineup() != null)
            await player.SendPacket(new PacketSyncLineupNotify(player.LineupManager.GetCurLineup()!));

        DatabaseHelper.MarkDirty(player.Uid);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.Success",
            "1", I18NManager.Translate("Word.Avatar")));
    }

    [CommandMethod("0 equipment")]
    public async ValueTask RemoveEquipment(CommandArg arg)
    {
        await RemoveLightcone(arg);
    }

    [CommandMethod("0 lightcone")]
    public async ValueTask RemoveLightcone(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.Args.Count < 2 || !int.TryParse(arg.Args[1], out var id))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        var equipment = player.InventoryManager!.Data.EquipmentItems.Where(x => x.UniqueId == id).ToList();
        if (equipment.Count == 0)
            equipment = player.InventoryManager.Data.EquipmentItems.Where(x => x.ItemId == id).ToList();

        if (equipment.Count == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.NotFound",
                I18NManager.Translate("Word.Equipment"), id.ToString()));
            return;
        }

        if (IsDryRun(arg))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.DryRun",
                equipment.Count.ToString(), I18NManager.Translate("Word.Equipment")));
            return;
        }

        if (!HasConfirmation(arg))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.RequiresConfirm"));
            return;
        }

        var changedAvatars = new List<BaseAvatarInfo>();
        foreach (var item in equipment)
        {
            foreach (var avatar in player.AvatarManager!.Data.FormalAvatars)
            foreach (var path in avatar.PathInfos.Values)
            {
                if (path.EquipId != item.UniqueId) continue;
                path.EquipId = 0;
                if (!changedAvatars.Contains(avatar)) changedAvatars.Add(avatar);
            }

            item.EquipAvatar = 0;
        }

        await player.InventoryManager.RemoveItems(equipment.Select(x => (x.ItemId, 1, x.UniqueId)).ToList());
        if (changedAvatars.Count > 0)
            await player.SendPacket(new PacketPlayerSyncScNotify(changedAvatars));

        DatabaseHelper.MarkDirty(player.Uid);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Remove.Success",
            equipment.Count.ToString(), I18NManager.Translate("Word.Equipment")));
    }

    private static bool HasConfirmation(CommandArg arg)
    {
        return arg.Args.Any(x => x.Equals("confirm", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsDryRun(CommandArg arg)
    {
        return arg.Args.Any(x => x.Equals("--dry-run", StringComparison.OrdinalIgnoreCase) ||
                                 x.Equals("dry-run", StringComparison.OrdinalIgnoreCase));
    }

    private static void UnequipAvatarItems(
        List<ItemData> equipmentItems,
        List<ItemData> relicItems,
        FormalAvatarInfo avatar)
    {
        foreach (var path in avatar.PathInfos.Values)
        {
            if (path.EquipId != 0)
            {
                var equipment = equipmentItems.FirstOrDefault(x => x.UniqueId == path.EquipId);
                if (equipment != null) equipment.EquipAvatar = 0;
                path.EquipId = 0;
            }

            foreach (var relicId in path.Relic.Values)
            {
                var relic = relicItems.FirstOrDefault(x => x.UniqueId == relicId);
                if (relic != null) relic.EquipAvatar = 0;
            }

            path.Relic.Clear();
        }
    }
}
