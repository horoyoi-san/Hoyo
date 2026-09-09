using March7thHoney.Database;
using March7thHoney.GameServer.Game.Calyx;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Internationalization;
using March7thHoney.Util;
using System.Text;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("json", "Game.Command.Json.Desc", "Game.Command.Json.Usage", permission: CommandPermissions.Json)]
public class CommandJson : ICommand
{
    private static readonly string[] JsonDirectoryRelativePaths =
    [
        "Config/Json"
    ];

    private static List<DirectoryInfo> GetJsonDirectories(bool createIfMissing = false)
    {
        var dirs = new List<DirectoryInfo>(JsonDirectoryRelativePaths.Length);
        foreach (var relativePath in JsonDirectoryRelativePaths)
        {
            var dir = new DirectoryInfo(Path.GetFullPath(relativePath));
            if (createIfMissing && !dir.Exists && relativePath.Equals("Config/Json", StringComparison.OrdinalIgnoreCase))
                dir.Create();
            dirs.Add(dir);
        }

        return dirs;
    }

    [CommandDefault]
    public async ValueTask Import(CommandArg arg)
    {
        var player = arg.Target?.Player;
        if (player == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        var input = arg.Args.Count > 0 && !string.IsNullOrEmpty(arg.Args[0])? arg.Args[0] : null;
        if (string.IsNullOrWhiteSpace(input))
        {
            await ShowFileList(arg);
            return;
        }

        if (input.Equals("clear", StringComparison.OrdinalIgnoreCase))
        {
            var (changedAvatars, removedItems) = await FreesrShared.ClearRelicAndEquipment(player);
            if (changedAvatars.Count > 0)
                await player.SendPacket(new PacketPlayerSyncScNotify(changedAvatars));
            if (removedItems.Count > 0)
                await player.SendPacket(new PacketPlayerSyncScNotify(removedItems));

            DatabaseHelper.MarkDirty(player.Uid);
            await arg.SendMsg(I18NManager.Translate("Game.Command.Json.ClearInventory"));
            return;
        }

        if (input.Equals("export", StringComparison.OrdinalIgnoreCase))
        {
            bool geshihua = false;
            string outputFileName = $"freesr-data_{player.Data.Name}_{player.Data.Uid}_{DateTime.Now:yyMMddHHmmss}.json";
            if (arg.Args.Count == 2)
            {
                bool bushigeshihua = bool.TryParse(arg.Args[1], out geshihua);
                if (!bushigeshihua)
                {
                    outputFileName = arg.Args[1] + ".json";
                    geshihua = true;
                }
            }
            else if (arg.Args.Count == 3)
            {
                outputFileName = arg.Args[1] + ".json";
                bool bushigeshihua = bool.TryParse(arg.Args[2], out geshihua);
                if (!bushigeshihua)
                {
                    geshihua = true;
                }
            }

            string outputjson = await FreesrShared.ExportPlayerDataAsync(player.Uid, geshihua);
            var dir = GetJsonDirectories(createIfMissing: true)[0];
            string combinedPath = Path.Combine(dir.FullName, outputFileName);
            await File.WriteAllTextAsync(combinedPath, outputjson, Encoding.UTF8);

            await arg.SendMsg(I18NManager.Translate("Game.Command.Json.ExportSuccess", outputFileName));
            return;
        }

        var selectedPath = ResolveInputPath(input, out var pathError);
        if (selectedPath == null)
        {
            if (!string.IsNullOrWhiteSpace(pathError))
                await arg.SendMsg(pathError);
            return;
        }

        if (!File.Exists(selectedPath))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Json.FileNotFound", selectedPath));
            return;
        }

        string json = string.Empty;
        try
        {
            json = await File.ReadAllTextAsync(selectedPath);
        }
        catch (Exception e)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Json.ReadOrParseFailed", e.Message));
            return;
        }

        await FreesrShared.ImportJson(json, player, async (msg) =>
        {
            if (msg[0] == "Game.Command.Json.ImportSummary")
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Json.ImportSummary", Path.GetFileName(selectedPath),
                    msg[1], msg[2], msg[3], msg[4], msg[5]));
            } else
            {
                await arg.SendMsg(I18NManager.Translate(msg[0], msg.Skip(1).ToArray()));
            }
        });
    }

    private static string? ResolveInputPath(string input, out string? error)
    {
        error = null;
        input = input.Trim();
        if (input.Length >= 2 && input.StartsWith('"') && input.EndsWith('"'))
            input = input[1..^1];

        if (int.TryParse(input, out var choice))
        {
            var files = GetJsonFiles().OrderBy(f => f.LastWriteTimeUtc).ToList();
            if (files.Count == 0)
            {
                error = I18NManager.Translate("Game.Command.Json.NoFileFoundWithHint");
                return null;
            }

            if (choice < 1 || choice > files.Count)
            {
                error = I18NManager.Translate("Game.Command.Json.InvalidChoice", files.Count.ToString());
                return null;
            }

            return files[choice - 1].FullName;
        }

        var looksLikePath = input.Contains('/') || input.Contains('\\') || Path.IsPathRooted(input);
        if (looksLikePath)
            return Path.GetFullPath(input);

        // Treat as filename under configured json directories.
        var jsonDirs = GetJsonDirectories(createIfMissing: true);
        var fileName = input.EndsWith(".json", StringComparison.OrdinalIgnoreCase) ? input : input + ".json";
        foreach (var jsonDir in jsonDirs)
        {
            var candidate = Path.Combine(jsonDir.FullName, input);
            if (File.Exists(candidate)) return candidate;
            candidate = Path.Combine(jsonDir.FullName, fileName);
            if (File.Exists(candidate)) return candidate;
        }

        // Fallback to primary directory.
        return Path.Combine(jsonDirs[0].FullName, fileName);
    }

    private static List<FileInfo> GetJsonFiles()
    {
        var dirs = GetJsonDirectories(createIfMissing: true);
        try
        {
            return dirs
                .Where(x => x.Exists)
                .SelectMany(x => x.GetFiles("*.json", SearchOption.TopDirectoryOnly))
                .DistinctBy(x => x.FullName)
                .ToList();
        }
        catch
        {
            return [];
        }
    }

    private static async ValueTask ShowFileList(CommandArg arg)
    {
        var files = GetJsonFiles().OrderBy(f => f.LastWriteTimeUtc).ToList();
        if (files.Count == 0)
        {
            var searched = GetJsonDirectories(createIfMissing: true).Select(x => x.FullName).ToList();
            await arg.SendMsg(I18NManager.Translate("Game.Command.Json.NoFileFound"));
            if (searched.Count > 0)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Json.SearchedDirectories"));
                foreach (var s in searched)
                    await arg.SendMsg(I18NManager.Translate("Game.Command.Json.SearchedDirectoryItem", s));
            }
            return;
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.Json.FoundFiles"));
        for (var i = 0; i < files.Count; i++)
            await arg.SendMsg(I18NManager.Translate("Game.Command.Json.FileListItem", (i + 1).ToString(), files[i].Name));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Json.UsageSelectHint"));
    }

}
