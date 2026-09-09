using System.Numerics;
using System.Text;
using March7thHoney.Command;
using March7thHoney.Data;
using March7thHoney.Internationalization;
using March7thHoney.Program.Program;
using March7thHoney.Util;
using Newtonsoft.Json;

namespace March7thHoney.Program.Handbook;

public static class HandbookGenerator
{
    private static string HandbookDir => Path.Combine(ConfigManager.Config.Path.ConfigPath, "Handbook");

    public static void GenerateAll()
    {
        var config = ConfigManager.Config;
        var directory = new DirectoryInfo(config.Path.ResourcePath + "/TextMap");
        var handbook = new DirectoryInfo(HandbookDir);
        if (!handbook.Exists)
            handbook.Create();
        if (!directory.Exists)
            return;

        Dictionary<BigInteger, string>? sharedFallback = null;

        foreach (var langFile in directory.GetFiles())
        {
            if (langFile.Extension != ".json") continue;
            if (langFile.Name.StartsWith("TextMapMain", StringComparison.OrdinalIgnoreCase)) continue;
            var lang = langFile.Name.Replace("TextMap", "").Replace(".json", "");

            // Check if handbook needs to regenerate
            var handbookPath = Path.Combine(HandbookDir, $"Handbook {lang}.txt");
            if (File.Exists(handbookPath))
            {
                var handbookInfo = new FileInfo(handbookPath);
                if (handbookInfo.LastWriteTime >= GetHandbookSourceLastWriteTime(langFile))
                    continue; // Skip if handbook is newer than its input sources
            }

            Generate(lang, ref sharedFallback);
        }

        Logger.GetByClassName()
            .Info(I18NManager.Translate("Server.ServerInfo.GeneratedItem", I18NManager.Translate("Word.Handbook")));
    }

    public static void Generate(string lang)
    {
        Dictionary<BigInteger, string>? fallback = null;
        Generate(lang, ref fallback);
    }

    private static void Generate(string lang, ref Dictionary<BigInteger, string>? sharedFallback)
    {
        var config = ConfigManager.Config;
        var handbookLang = lang == "CN" ? "CHS" : lang;
        var textMapPath = config.Path.ResourcePath + "/TextMap/TextMap" + lang + ".json";
        var fallbackTextMapPath = config.Path.ResourcePath + "/TextMap/TextMap" + config.ServerOption.FallbackLanguage +
                                  ".json";
        if (!File.Exists(textMapPath))
        {
            Logger.GetByClassName().Error(I18NManager.Translate("Server.ServerInfo.FailedToReadItem", textMapPath,
                I18NManager.Translate("Word.NotFound")));
            return;
        }

        if (!File.Exists(fallbackTextMapPath))
        {
            Logger.GetByClassName().Warn(I18NManager.Translate("Server.ServerInfo.FailedToReadItem",
                fallbackTextMapPath, I18NManager.Translate("Word.NotFound")));
            fallbackTextMapPath = textMapPath;
        }

        var textMap = JsonConvert.DeserializeObject<Dictionary<BigInteger, string>>(File.ReadAllText(textMapPath));
        sharedFallback ??=
            JsonConvert.DeserializeObject<Dictionary<BigInteger, string>>(File.ReadAllText(fallbackTextMapPath));
        var fallbackTextMap = sharedFallback;

        if (textMap == null || fallbackTextMap == null)
        {
            Logger.GetByClassName().Error(I18NManager.Translate("Server.ServerInfo.FailedToReadItem", textMapPath,
                I18NManager.Translate("Word.Error")));
            return;
        }

        var builder = new StringBuilder();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookGeneratedAt",
            DateTime.Now.ToString("yyyy/MM/dd HH:mm")));
        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionCommand"));
        builder.AppendLine();
        GenerateCmd(builder, handbookLang);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionAvatar"));
        builder.AppendLine();
        GenerateAvatar(builder, textMap, fallbackTextMap, lang == config.ServerOption.Language);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionItem"));
        builder.AppendLine();
        GenerateItem(builder, textMap, fallbackTextMap, lang == config.ServerOption.Language);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionStageId"));
        builder.AppendLine();
        GenerateStageId(builder, textMap, fallbackTextMap);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionMainMission"));
        builder.AppendLine();
        GenerateMainMissionId(builder, textMap, fallbackTextMap);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionSubMission"));
        builder.AppendLine();
        GenerateSubMissionId(builder, textMap, fallbackTextMap);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionRogueBuff"));
        builder.AppendLine();
        GenerateRogueBuff(builder, textMap, fallbackTextMap, lang == config.ServerOption.Language);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionRogueMiracle"));
        builder.AppendLine();
        GenerateRogueMiracleDisplay(builder, textMap, fallbackTextMap, lang == config.ServerOption.Language);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang,
            "Server.ServerInfo.HandbookSectionCurrencyWarRole"));
        builder.AppendLine();
        GenerateCurrencyWarRole(builder, textMap, fallbackTextMap);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang,
            "Server.ServerInfo.HandbookSectionCurrencyWarEquipment"));
        builder.AppendLine();
        GenerateCurrencyWarEquipment(builder, textMap, fallbackTextMap);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang,
            "Server.ServerInfo.HandbookSectionCurrencyWarConsumable"));
        builder.AppendLine();
        GenerateCurrencyWarConsumable(builder, textMap, fallbackTextMap);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionCurrencyWarOrb"));
        builder.AppendLine();
        GenerateCurrencyWarOrb(builder, textMap, fallbackTextMap);

#if DEBUG
        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionRogueDiceSurface"));
        builder.AppendLine();
        GenerateRogueDiceSurfaceDisplay(builder, textMap, fallbackTextMap);

        builder.AppendLine();
        builder.AppendLine("#" + I18NManager.TranslateAsCertainLang(handbookLang, "Server.ServerInfo.HandbookSectionRogueDialogue"));
        builder.AppendLine();
        GenerateRogueDialogueDisplay(builder, textMap, fallbackTextMap);
#endif

        builder.AppendLine();
        WriteToFile(lang, builder.ToString());
    }

    public static void GenerateCmd(StringBuilder builder, string lang)
    {
        AppendCommandNotes(builder, lang);

        foreach (var cmd in EntryPoint.CommandManager.CommandInfo.Values
                     .OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase))
        {
            builder.AppendLine("/" + cmd.Name);
            AppendTranslatedBlock(builder, lang, I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookDescriptionLabel"), cmd.Description);
            AppendTranslatedBlock(builder, lang, I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookUsageLabel"), cmd.Usage);

            if (cmd.Alias.Length > 0)
                builder.AppendLine("  " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookAliasesLabel") + ": " + string.Join(", ", cmd.Alias.Select(x => "/" + x)));

            if (!string.IsNullOrWhiteSpace(cmd.Permission))
                builder.AppendLine("  " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookPermissionLabel") + ": " + cmd.Permission);

            builder.AppendLine();
        }
    }

    private static void AppendCommandNotes(StringBuilder builder, string lang)
    {
        builder.AppendLine(I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookCommandNotesTitle"));
        builder.AppendLine("  - " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookCommandNoteTarget"));
        builder.AppendLine("  - " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookCommandNoteQuote"));
        builder.AppendLine("  - " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookCommandNoteCaseInsensitive"));
        builder.AppendLine("  - " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookCommandNoteRequiredOptional"));
        builder.AppendLine("  - " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookCommandNoteOptionStyle"));
        builder.AppendLine("  - " + I18NManager.TranslateAsCertainLang(lang, "Server.ServerInfo.HandbookCommandNoteLongOptionAliases"));
        builder.AppendLine();
    }

    private static void AppendTranslatedBlock(StringBuilder builder, string lang, string label, string key)
    {
        var text = I18NManager.TranslateAsCertainLang(lang == "CN" ? "CHS" : lang, key)
            .Replace("\r\n", "\n")
            .Replace('\r', '\n')
            .Trim();

        builder.AppendLine("  " + label + ":");
        foreach (var line in text.Split('\n'))
        {
            builder.Append("    ");
            builder.AppendLine(line.TrimEnd());
        }
    }

    private static DateTime GetHandbookSourceLastWriteTime(FileInfo langFile)
    {
        var latest = langFile.LastWriteTime;
        latest = GetLatestWriteTime(latest, typeof(CommandInfoAttribute));
        latest = GetLatestWriteTime(latest, typeof(HandbookGenerator));
        return latest;
    }

    private static DateTime GetLatestWriteTime(DateTime latest, Type type)
    {
        var assemblyPath = type.Assembly.Location;
        if (string.IsNullOrWhiteSpace(assemblyPath) || !File.Exists(assemblyPath))
            return latest;

        var assemblyWriteTime = File.GetLastWriteTime(assemblyPath);
        return assemblyWriteTime > latest ? assemblyWriteTime : latest;
    }

    public static void GenerateItem(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback, bool setName)
    {
        foreach (var item in GameData.ItemConfigData.Values)
        {
            var name = map.TryGetValue(item.ItemName.Hash, out var value) ? value :
                fallback.TryGetValue(item.ItemName.Hash, out value) ? value : $"[{item.ItemName.Hash}]";
            builder.AppendLine(item.ID + ": " + name);

            if (setName && name != $"[{item.ItemName.Hash}]") item.Name = name;
        }
    }

    public static void GenerateAvatar(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback, bool setName)
    {
        foreach (var avatar in GameData.AvatarConfigData.Values)
        {
            var resolved = TryGetNameFromTextMap(avatar.AvatarName.Hash, map, fallback, out var name);

            // Legacy AvatarConfig dumps carry old 32-bit name hashes that no longer resolve against the
            // current 64-bit TextMap (e.g. 1001 March 7th -> [-531793651]). The character's inventory item
            // shares the avatar id and keeps a valid name hash, so fall back to it.
            if (!resolved && GameData.ItemConfigData.TryGetValue(avatar.AvatarID, out var item))
                resolved = TryGetNameFromTextMap(item.ItemName.Hash, map, fallback, out name);

            builder.AppendLine(avatar.AvatarID + ": " + name);

            if (setName && resolved) avatar.Name = name;
        }
    }

    public static void GenerateMainMissionId(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var mission in GameData.MainMissionData.Values)
        {
            var name = map.TryGetValue(mission.Name.Hash, out var value) ? value :
                fallback.TryGetValue(mission.Name.Hash, out value) ? value : $"[{mission.Name.Hash}]";
            builder.AppendLine(mission.MainMissionID + ": " + name);
        }
    }

    public static void GenerateSubMissionId(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var mission in GameData.SubMissionData.Values)
        {
            var name = map.TryGetValue(mission.TargetText.Hash, out var value) ? value :
                fallback.TryGetValue(mission.TargetText.Hash, out value) ? value : $"[{mission.TargetText.Hash}]";
            builder.AppendLine(mission.SubMissionID + ": " + name);
        }
    }

    public static void GenerateStageId(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var stage in GameData.StageConfigData.Values)
        {
            var name = map.TryGetValue(stage.StageName.Hash, out var value) ? value :
                fallback.TryGetValue(stage.StageName.Hash, out value) ? value : $"[{stage.StageName.Hash}]";
            builder.AppendLine(stage.StageID + ": " + name);
        }
    }

    public static void GenerateRogueBuff(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback, bool setName)
    {
        foreach (var buff in GameData.RogueMazeBuffData)
        {
            var name = map.TryGetValue(buff.Value.BuffName.Hash, out var value)
                ? value
                : fallback.TryGetValue(buff.Value.BuffName.Hash, out value)
                    ? value
                    : $"[{buff.Value.BuffName.Hash}]";
            builder.AppendLine(buff.Key + ": " + name + " --- Level:" + buff.Value.Lv);

            if (setName && name != $"[{buff.Value.BuffName.Hash}]") buff.Value.Name = name;
        }
    }

    public static void GenerateRogueMiracleDisplay(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback, bool setName)
    {
        foreach (var display in GameData.RogueMiracleData.Values)
        {
            var name = map.TryGetValue(display.MiracleName.Hash, out var value)
                ? value
                : fallback.TryGetValue(display.MiracleName.Hash, out value)
                    ? value
                    : $"[{display.MiracleName.Hash}]";
            builder.AppendLine(display.MiracleID + ": " + name);

            if (setName && name != $"[{display.MiracleName.Hash}]") display.Name = name;
        }
    }

    public static void GenerateCurrencyWarRole(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var display in GameData.GridFightRoleBasicInfoData.Values)
        {
            // get from avatar id
            if (!GameData.AvatarConfigData.TryGetValue((int)display.AvatarID, out var avatar)) continue;
            var name = GetNameFromTextMap(avatar.AvatarName.Hash, map, fallback);

            builder.AppendLine(display.ID + ": " + name);
        }
    }

    public static void GenerateCurrencyWarEquipment(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var display in GameData.GridFightEquipmentData.Values)
        {
            // get from items
            if (!GameData.GridFightItemsData.TryGetValue(display.ID, out var item)) continue;
            var name = GetNameFromTextMap(item.ItemName.Hash, map, fallback);

            builder.AppendLine(display.ID + ": " + name);
        }
    }

    public static void GenerateCurrencyWarConsumable(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var display in GameData.GridFightConsumablesData.Values)
        {
            // get from items
            if (!GameData.GridFightItemsData.TryGetValue(display.ID, out var item)) continue;
            var name = GetNameFromTextMap(item.ItemName.Hash, map, fallback);

            builder.AppendLine(display.ID + ": " + name);
        }
    }

    public static void GenerateCurrencyWarOrb(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var display in GameData.GridFightOrbData.Values)
        {
            var name = GetNameFromTextMap(display.OrbName.Hash, map, fallback);

            builder.AppendLine(display.OrbID + ": " + name);
        }
    }

    public static string GetNameFromTextMap(BigInteger key, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        if (map.TryGetValue(key, out var value)) return value;
        if (fallback.TryGetValue(key, out value)) return value;
        return $"[{key}]";
    }

    // As GetNameFromTextMap, but reports whether the hash actually resolved (vs. an unresolved "[hash]"
    // placeholder) so callers can apply a fallback source instead of persisting a placeholder as a name.
    public static bool TryGetNameFromTextMap(BigInteger key, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback, out string name)
    {
        if (map.TryGetValue(key, out var value) || fallback.TryGetValue(key, out value))
        {
            name = value;
            return true;
        }

        name = $"[{key}]";
        return false;
    }

    public static void WriteToFile(string lang, string content)
    {
        File.WriteAllText(Path.Combine(HandbookDir, $"Handbook {lang}.txt"), content);
    }

#if DEBUG
    public static void GenerateRogueDiceSurfaceDisplay(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var display in GameData.RogueNousDiceSurfaceData.Values)
        {
            var name = map.TryGetValue(display.SurfaceName.Hash, out var value)
                ? value
                : fallback.TryGetValue(display.SurfaceName.Hash, out value)
                    ? value
                    : $"[{display.SurfaceName.Hash}]";
            var desc = map.TryGetValue(display.SurfaceDesc.Hash, out var c) ? c : $"[{display.SurfaceDesc.Hash}]";
            builder.AppendLine(display.SurfaceID + ": " + name + "\n" + "Desc: " + desc);
        }
    }

    public static void GenerateRogueDialogueDisplay(StringBuilder builder, Dictionary<BigInteger, string> map,
        Dictionary<BigInteger, string> fallback)
    {
        foreach (var npc in GameData.RogueNPCData.Values.Where(x => x.RogueNpcConfig != null))
        {
            builder.AppendLine("NpcId: " + npc.RogueNPCID);
            foreach (var dialogue in npc.RogueNpcConfig?.DialogueList ?? [])
            {
                var eventNameHash =
                    GameData.RogueTalkNameConfigData.GetValueOrDefault(dialogue.TalkNameID)?.Name.Hash ??
                    -1;
                var eventName = GetNameFromTextMap(eventNameHash, map, fallback);
                builder.AppendLine($"  Progress: {dialogue.DialogueProgress} | {eventName}");
                builder.AppendLine($"  Type: {npc.RogueNpcConfig!.DialogueType}");
                builder.AppendLine("  Options: ");

                foreach (var option in dialogue.OptionInfo?.OptionList ?? [])
                {
                    var display = GameData.RogueDialogueOptionDisplayData.GetValueOrDefault(option.DisplayID);
                    if (display == null) continue;

                    var optionName = GetNameFromTextMap(display.OptionTitle.Hash, map, fallback);
                    var optionDesc = GetNameFromTextMap(display.OptionDesc.Hash, map, fallback);
                    builder.AppendLine($"    Option: {option.OptionID} - {optionName}");
                    builder.AppendLine($"      {optionDesc}".Replace("#2", option.DescValue.ToString())
                        .Replace("#5", option.DescValue2.ToString()).Replace("#6", option.DescValue3.ToString())
                        .Replace("#7", option.DescValue4.ToString()));
                    if (option.DynamicMap.Count == 0) continue;

                    builder.AppendLine("      Dynamic Value:");
                    foreach (var value in option.DynamicMap)
                    {
                        var dynamic = GameData.RogueDialogueDynamicDisplayData.GetValueOrDefault(value.Value.DisplayID);
                        if (dynamic == null) continue;
                        var dynamicName = GetNameFromTextMap(dynamic.ContentText.Hash, map, fallback);
                        builder.AppendLine($"        Dynamic Id: {value.Key} | {dynamicName}");
                    }
                }
            }
        }
    }
#endif
}
