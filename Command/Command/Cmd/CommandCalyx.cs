using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("calyx", "Game.Command.Calyx.Desc", "Game.Command.Calyx.Usage", permission: CommandPermissions.Calyx)]
public class CommandCalyx : ICommand
{
    [CommandDefault]
    public async ValueTask Default(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var tokens = arg.Raw.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.Usage"));
            return;
        }

        var mode = tokens[0].ToLowerInvariant();
        if (mode == "off")
        {
            player.CalyxOverrideManager!.Disable();
            await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ToggleOff"));
            return;
        }

        if (mode == "on")
        {
            var manager = player.CalyxOverrideManager!;
            if (manager.Data.CachedJson?.BattleConfig == null)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.NoCachedData"));
                return;
            }

            manager.Enable();
            await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ToggleOn"));
            return;
        }

        if (mode == "lineup")
        {
            var manager = player.CalyxOverrideManager!;
            if (!manager.IsActive)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.LineupRequiresActive"));
                return;
            }

            if (tokens.Length == 2 && tokens[1].Equals("reset", StringComparison.OrdinalIgnoreCase))
            {
                manager.ResetLineupOverride();
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.LineupReset"));
                return;
            }

            if (tokens.Length < 2 || tokens[1].Equals("reset", StringComparison.OrdinalIgnoreCase))
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.LineupUsage"));
                return;
            }

            var avatarIds = new List<int>(tokens.Length - 1);
            foreach (var token in tokens.Skip(1))
            {
                if (!int.TryParse(token, out var avatarId) || avatarId <= 0)
                {
                    await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.LineupInvalidAvatar", token));
                    return;
                }

                avatarIds.Add(avatarId);
            }

            if (!manager.TrySetLineupOverride(avatarIds, out var invalidAvatarId))
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.LineupInvalidAvatar",
                    invalidAvatarId.ToString()));
                return;
            }

            await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.LineupSuccess",
                string.Join(' ', avatarIds)));
            return;
        }

        if (mode == "modify")
        {
            var manager = player.CalyxOverrideManager!;
            if (!manager.IsActive)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ModifyRequiresActive"));
                return;
            }

            if (manager.IsCurrentBattleChallengePeak)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ModifyChallengePeakUnsupported"));
                return;
            }

            if (tokens.Length != 4 || !int.TryParse(tokens[1], out var waveIndex) || waveIndex <= 0 ||
                !int.TryParse(tokens[2], out var monsterIndex) || monsterIndex <= 0)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ModifyUsage"));
                return;
            }

            if (!uint.TryParse(tokens[3], out var hp) || hp == 0)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ModifyInvalidHp"));
                return;
            }

            if (!manager.TrySetMonsterHp(waveIndex, monsterIndex, hp, out var monsterId))
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ModifyInvalidPosition",
                    waveIndex.ToString(), monsterIndex.ToString()));
                return;
            }

            await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.ModifySuccess",
                waveIndex.ToString(), monsterIndex.ToString(), monsterId.ToString(), hp.ToString()));
            return;
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.Calyx.InvalidMode", mode));
    }
}
