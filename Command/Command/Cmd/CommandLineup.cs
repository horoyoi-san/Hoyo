using March7thHoney.GameServer.Server.Packet.Send.Lineup;
using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("lineup", "Game.Command.Lineup.Desc", "Game.Command.Lineup.Usage", permission: CommandPermissions.Lineup)]
public class CommandLineup : ICommand
{
    [CommandMethod("0 mp")]
    public async ValueTask SetLineupMp(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var count = 2;
        if (arg.Args.Count > 1 && !arg.TryGetInt(0, out count))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        await arg.Target.Player!.LineupManager!.GainMp(count);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Lineup.PlayerGainedMp", count.ToString()));
    }

    [CommandMethod("0 heal")]
    public async ValueTask HealLineup(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var player = arg.Target.Player!;
        foreach (var avatar in player.LineupManager!.GetCurLineup()!.AvatarData!.FormalAvatars)
            avatar.CurrentHp = 10000;
        await player.SendPacket(new PacketSyncLineupNotify(player.LineupManager.GetCurLineup()!));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Lineup.HealedAllAvatars"));
    }
}
