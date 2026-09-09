using March7thHoney.Data;
using March7thHoney.Data.Custom;
using March7thHoney.Internationalization;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("debug", "Game.Command.Debug.Desc", "Game.Command.Debug.Usage", permission: CommandPermissions.Debug)]
public class CommandDebug : ICommand
{
    [CommandMethod("0 specific")]
    public async ValueTask SpecificNextStage(CommandArg arg)
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

        if (!int.TryParse(arg.BasicArgs[0], out var stageId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!GameData.StageConfigData.TryGetValue(stageId, out var stage))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Debug.InvalidStageId"));
            return;
        }

        player.BattleManager!.NextBattleStageConfig = stage;
        await arg.SendMsg(I18NManager.Translate("Game.Command.Debug.SetStageId"));
    }

    [CommandMethod("0 monster")]
    public async ValueTask AddMonster(CommandArg arg)
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

        if (!int.TryParse(arg.BasicArgs[0], out var monsterId))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (!GameData.MonsterConfigData.TryGetValue(monsterId, out _))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Debug.InvalidStageId"));
            return;
        }

        player.BattleManager!.NextBattleMonsterIds.Add(monsterId);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Debug.SetStageId"));
    }

    [CommandMethod("0 customP")]
    public async ValueTask AddCustomPacket(CommandArg arg)
    {
        var conn = arg.Target;
        if (conn == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.Args.Count < 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        var packetFilePath = arg.Args[1];
        // Load custom packet queue from file
        if (!File.Exists(packetFilePath))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Debug.CustomPacketFileNotFound"));
            return;
        }

        var fileContent = await File.ReadAllTextAsync(packetFilePath);
        var customPacketQueue =
            System.Text.Json.JsonSerializer.Deserialize(fileContent, CustomPacketJsonContext.Default.CustomPacketQueueConfig);

        if (customPacketQueue == null || customPacketQueue.Queue.Count == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Debug.CustomPacketFileInvalid"));
            return;
        }

        conn.CustomPacketQueue.Clear();
        conn.CustomPacketQueue.AddRange(customPacketQueue.Queue);
        await arg.SendMsg(I18NManager.Translate("Game.Command.Debug.CustomPacketFileLoaded"));
    }
}
