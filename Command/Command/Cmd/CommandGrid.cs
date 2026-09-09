using March7thHoney.GameServer.Game.GridFight;
using March7thHoney.GameServer.Server.Packet.Send.GridFight;
using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("grid", "Game.Command.Grid.Desc", "Game.Command.Grid.Usage", permission: CommandPermissions.Grid)]
public sealed class CommandGrid : ICommand
{
    [CommandMethod("0 gold")]
    public async ValueTask UpdateGold(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var manager = player.GridFightManager;
        if (manager == null || manager.Session is not { } session)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.NotInGame"));
            return;
        }

        if (!arg.TryGetInt(0, out var delta))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        session.AdjustGold(delta);
        await player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildGoldSync()));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.UpdateGold", delta.ToString()));
    }

    [CommandMethod("0 role")]
    public async ValueTask AddRole(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var manager = player.GridFightManager;
        if (manager == null || manager.Session is not { } session)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.NotInGame"));
            return;
        }

        if (!arg.TryGetInt(0, out var roleId) || !arg.TryGetInt(1, out var roleStar))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!session.TryAddRole((uint)roleId, (uint)Math.Max(1, roleStar), out var acquisition))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.InvalidRole"));
            return;
        }

        await player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
            manager.BuildRoleAcquisitionSync(acquisition)));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.AddedRole"));
    }

    [CommandMethod("0 equip")]
    public async ValueTask AddEquipment(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var manager = player.GridFightManager;
        if (manager == null || manager.Session is not { } session)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.NotInGame"));
            return;
        }

        if (!arg.TryGetInt(0, out var equipmentId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!session.TryAddEquipment((uint)equipmentId, out var equipment))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.InvalidEquipment"));
            return;
        }

        await player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
            manager.BuildEquipmentAddedSync(equipment)));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.AddEquipment", equipmentId.ToString()));
    }

    [CommandMethod("0 orb")]
    public async ValueTask AddOrb(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var manager = player.GridFightManager;
        if (manager == null || manager.Session is not { } session)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.NotInGame"));
            return;
        }

        if (!arg.TryGetInt(0, out var orbItemId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!session.TryAddOrb((uint)orbItemId, out var orb))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.InvalidOrb"));
            return;
        }

        await player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(manager.BuildOrbAddedSync(orb)));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.AddOrb", orbItemId.ToString()));
    }

    [CommandMethod("0 consumable")]
    public async ValueTask AddConsumable(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var manager = player.GridFightManager;
        if (manager == null || manager.Session is not { } session)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.NotInGame"));
            return;
        }

        if (!arg.TryGetInt(0, out var consumableId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!session.TryAddConsumable((uint)consumableId, out var change))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.InvalidConsumable"));
            return;
        }

        await player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
            manager.BuildConsumableSync(change)));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.AddConsumable", consumableId.ToString()));
    }

    [CommandMethod("0 section")]
    public async ValueTask SetSection(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var manager = player.GridFightManager;
        if (manager == null || manager.Session is not { } session)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Grid.NotInGame"));
            return;
        }

        if (!arg.TryGetInt(0, out var chapterId) || !arg.TryGetInt(1, out var sectionId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        var chapter = (uint)Math.Max(1, chapterId);
        var section = (uint)Math.Max(1, sectionId);
        if (!session.TryMoveToSection(chapter, section, out var finishedPendingPosition))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        await player.SendPacket(new PacketGridFightSyncUpdateResultScNotify(
            manager.BuildSectionMoveSync(finishedPendingPosition)));
        await arg.SendMsg(I18NManager.Translate(
            "Game.Command.Grid.EnterSection",
            chapter.ToString(),
            section.ToString()));
    }
}
