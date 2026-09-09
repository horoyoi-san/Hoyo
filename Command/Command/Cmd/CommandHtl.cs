using System.Globalization;
using System.Text;
using March7thHoney.Internationalization;
using March7thHoney.Kcp;
using March7thHoney.Util;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("htl", "Game.Command.Htl.Desc", "Game.Command.Htl.Usage", permission: CommandPermissions.Htl)]
public class CommandHtl : ICommand
{
    [CommandDefault]
    public async ValueTask Htl(CommandArg arg)
    {
        if (arg.Target == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.PlayerNotFound"));
            return;
        }

        if (arg.Args.Count == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Usage"));
            return;
        }

        var luaRoot = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "Lua"));
        var subCommand = arg.Args[0].ToLowerInvariant();

        if (subCommand is "help" or "?")
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Usage"));
            return;
        }

        if (subCommand == "reload")
        {
            if (arg.Args.Count > 1)
            {
                var reloadTarget = arg.Args[1];
                if (!TryResolveLuaScript(luaRoot, reloadTarget, out var reloadRelativePath, out var reloadFilePath))
                {
                    await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.ScriptNotFound", reloadTarget.Replace("\\", "/")));
                    return;
                }

                await SendScript(arg, luaRoot, reloadRelativePath, reloadFilePath, "enable", null, forceRefresh: true);
                return;
            }

            await SendInline(arg, luaRoot,
                "local HTL = _G.HoyoToonLua\n" +
                "if HTL ~= nil and HTL.ReloadAll ~= nil then\n" +
                "    HTL.ReloadAll({ notify = false, popup = false })\n" +
                "end\n",
                "reload");
            return;
        }

        if (subCommand == "popup")
        {
            if (arg.Args.Count < 2)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Usage"));
                return;
            }

            var message = string.Join(" ", arg.Args.Skip(1));
            await SendInline(arg, luaRoot,
                "local HTL = _G.HoyoToonLua\n" +
                "if HTL ~= nil then HTL.Popup(" + ToLuaString(message) + ", { color = \"blue\" }) end\n",
                "popup",
                minimalBoot: true);
            return;
        }

        if (subCommand == "hotkey")
        {
            await HandleHotkey(arg, luaRoot);
            return;
        }

        if (TryBuildDirectWrite(arg.Args, out var directLua, out var directLabel))
        {
            await SendInline(arg, luaRoot, directLua, directLabel);
            return;
        }

        if (subCommand == "all")
        {
            var action = arg.Args.Count > 1 ? NormalizeAction(arg.Args[1]) : "toggle";
            if (action == null)
            {
                await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Usage"));
                return;
            }

            await SendAllAction(arg, luaRoot, action);
            return;
        }

        var normalizedAction = NormalizeAction(subCommand);
        if (normalizedAction == null || arg.Args.Count < 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Usage"));
            return;
        }

        var target = arg.Args[1];
        if (target.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            await SendAllAction(arg, luaRoot, normalizedAction);
            return;
        }

        if (!TryResolveLuaScript(luaRoot, target, out var relativePath, out var filePath))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.ScriptNotFound", target.Replace("\\", "/")));
            return;
        }

        await SendScript(arg, luaRoot, relativePath, filePath, normalizedAction, null);
    }

    private static async ValueTask HandleHotkey(CommandArg arg, string luaRoot)
    {
        if (arg.Args.Count < 3)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Usage"));
            return;
        }

        var target = arg.Args[1];
        var key = arg.Args[2];

        if (target.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            await SendInline(arg, luaRoot,
                "local HTL = _G.HoyoToonLua\n" +
                "if HTL ~= nil then\n" +
                "    HTL.BindAllToggle(" + ToLuaString(key) + ", { notify = false, pressNotify = false })\n" +
                "end\n",
                "hotkey all " + key);
            return;
        }

        if (!TryResolveLuaScript(luaRoot, target, out var relativePath, out var filePath))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.ScriptNotFound", target.Replace("\\", "/")));
            return;
        }

        await SendScript(arg, luaRoot, relativePath, filePath, "enable", key);
    }

    private static async ValueTask SendAllAction(CommandArg arg, string luaRoot, string action)
    {
        await SendInline(arg, luaRoot,
            "local HTL = _G.HoyoToonLua\n" +
            "if HTL ~= nil then\n" +
            "    HTL.RunAll(" + ToLuaString(action) + ", { notify = false, popup = false })\n" +
            "end\n",
            "all " + action);
    }

    private static async ValueTask SendScript(CommandArg arg, string luaRoot, string relativePath, string filePath,
        string action, string? toggleKey, bool forceRefresh = false)
    {
        try
        {
            var bundledText = Encoding.UTF8.GetString(await HoyoToonLuaPayloadBuilder.BuildScriptAsync(luaRoot, relativePath));
            var fileInfo = new FileInfo(filePath);
            var scriptToken = string.Join("|",
                relativePath.Replace("\\", "/"),
                fileInfo.Length.ToString(CultureInfo.InvariantCulture),
                fileInfo.LastWriteTimeUtc.Ticks.ToString(CultureInfo.InvariantCulture));

            var prefix = new StringBuilder();
            prefix.Append("_G.HoyoToonLua_QUIET_BOOT = true").AppendLine();
            prefix.Append("_G.HoyoToonLua_ACTION = ").Append(ToLuaString(action)).AppendLine();
            prefix.Append("_G.HoyoToonLua_COMMAND = true").AppendLine();
            prefix.Append("_G.HoyoToonLua_SCRIPT_ID = ").Append(ToLuaString(relativePath.Replace("\\", "/"))).AppendLine();
            prefix.Append("_G.HoyoToonLua_SCRIPT_TOKEN = ").Append(ToLuaString(scriptToken)).AppendLine();
            if (forceRefresh)
                prefix.Append("_G.HoyoToonLua_FORCE_REFRESH = true").AppendLine();
            if (!string.IsNullOrWhiteSpace(toggleKey))
                prefix.Append("_G.HoyoToonLua_TOGGLE_KEY = ").Append(ToLuaString(toggleKey)).AppendLine();

            var suffix = "\n_G.HoyoToonLua_ACTION = nil\n_G.HoyoToonLua_TOGGLE_KEY = nil\n_G.HoyoToonLua_FORCE_REFRESH = nil\n_G.HoyoToonLua_SCRIPT_ID = nil\n_G.HoyoToonLua_SCRIPT_TOKEN = nil\n_G.HoyoToonLua_QUIET_BOOT = nil\n";
            await arg.Target!.SendPacket(new HandshakePacket(Encoding.UTF8.GetBytes(prefix + bundledText + suffix)));
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Sent", filePath.Replace("\\", "/")));
        }
        catch (IOException)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.ReadError", relativePath.Replace("\\", "/")));
        }
    }

    private static async ValueTask SendInline(CommandArg arg, string luaRoot, string lua, string label,
        bool minimalBoot = false)
    {
        var fileBytes = await HoyoToonLuaPayloadBuilder.BuildInlineAsync(luaRoot, "Auto/Htl/inline.lua",
            "--#hoyotoonlua\n" + lua, minimalBoot);
        await arg.Target!.SendPacket(new HandshakePacket(fileBytes));
        await arg.SendMsg(I18NManager.Translate("Game.Command.Htl.Sent", label));
    }

    private static bool TryBuildDirectWrite(IReadOnlyList<string> args, out string lua, out string label)
    {
        lua = "";
        label = "";
        var command = args[0].ToLowerInvariant();

        switch (command)
        {
            case "skill":
            case "setskill":
                return TryBuildParamWrite(args, "HTL.SetSkill", "skill", out lua, out label);
            case "simpleskill":
            case "simple":
            case "setsimpleskill":
                return TryBuildParamWrite(args, "HTL.SetSimpleSkill", "simple skill", out lua, out label);
            case "spneed":
            case "setspneed":
            case "skillspneed":
            case "setskillspneed":
                return TryBuildSkillNeedWrite(args, "HTL.SetSPNeed", "SP need", out lua, out label);
            case "spbase":
            case "setspbase":
            case "skillspbase":
            case "setskillspbase":
                return TryBuildSkillNeedWrite(args, "HTL.SetSPBase", "SP base", out lua, out label);
            case "bpneed":
            case "setbpneed":
            case "skillbpneed":
            case "setskillbpneed":
                return TryBuildSkillNeedWrite(args, "HTL.SetBPNeed", "BP need", out lua, out label);
            case "bpadd":
            case "setbpadd":
            case "skillbpadd":
            case "setskillbpadd":
                return TryBuildSkillNeedWrite(args, "HTL.SetBPAdd", "BP add", out lua, out label);
            case "avatarspneed":
            case "setavatarspneed":
            case "characterspneed":
            case "setcharacterspneed":
                return TryBuildAvatarSPNeedWrite(args, out lua, out label);
            case "memosprite":
            case "servant":
            case "setmemosprite":
                return TryBuildParamWrite(args, "HTL.SetMemosprite", "memosprite", out lua, out label);
            case "talent":
            case "tree":
            case "settalent":
                return TryBuildParamWrite(args, "HTL.SetTalent", "talent", out lua, out label);
            case "talentstat":
            case "tracestat":
            case "settalentstat":
                return TryBuildTalentStatWrite(args, out lua, out label);
            case "con":
            case "rank":
            case "setcon":
                if (args.Count != 5) return false;
                label = "con " + args[1] + " " + args[2];
                lua = BuildLuaCall("HTL.SetCon", label, args[1], args[2], args[3], args[4]);
                return true;
            case "stat":
            case "promotion":
            case "setstat":
                if (args.Count != 5) return false;
                label = "stat " + args[1] + " " + args[2] + " " + args[3];
                lua = BuildLuaCall("HTL.SetStat", label, args[1], args[2], args[3], args[4]);
                return true;
            default:
                return false;
        }
    }

    private static bool TryBuildParamWrite(IReadOnlyList<string> args, string functionName, string kind,
        out string lua, out string label)
    {
        lua = "";
        label = "";

        if (args.Count != 5 && args.Count != 6) return false;

        label = kind + " " + args[1] + " " + args[2] + " " + args[3];
        lua = args.Count == 5
            ? BuildLuaCall(functionName, label, args[1], args[2], args[3], args[4])
            : BuildLuaCall(functionName, label, args[1], args[2], args[3], args[4], args[5]);
        return true;
    }

    private static bool TryBuildAvatarSPNeedWrite(IReadOnlyList<string> args, out string lua, out string label)
    {
        lua = "";
        label = "";

        if (args.Count != 3 && args.Count != 4) return false;

        label = "avatar SP need " + args[1];
        lua = args.Count == 3
            ? BuildLuaCall("HTL.SetAvatarSPNeed", label, args[1], args[2])
            : BuildLuaCall("HTL.SetAvatarSPNeed", label, args[1], args[2], args[3]);
        return true;
    }

    private static bool TryBuildSkillNeedWrite(IReadOnlyList<string> args, string functionName, string kind,
        out string lua, out string label)
    {
        lua = "";
        label = "";

        if (args.Count != 5 && args.Count != 6) return false;

        label = kind + " " + args[1] + " " + args[2] + " " + args[3];
        lua = args.Count == 5
            ? BuildLuaCall(functionName, label, args[1], args[2], args[3], args[4])
            : BuildLuaCall(functionName, label, args[1], args[2], args[3], args[4], args[5]);
        return true;
    }

    private static bool TryBuildTalentStatWrite(IReadOnlyList<string> args, out string lua, out string label)
    {
        lua = "";
        label = "";

        if (args.Count != 5 && args.Count != 6) return false;

        label = "talent stat " + args[1] + " " + args[2] + " " + args[3];
        lua = args.Count == 5
            ? BuildLuaCall("HTL.SetTalentStat", label, args[1], args[2], args[3], args[4])
            : BuildLuaCall("HTL.SetTalentStat", label, args[1], args[2], args[3], args[4], args[5]);
        return true;
    }

    private static string BuildLuaCall(string functionName, string label, params string[] values)
    {
        var callArgs = string.Join(", ", values.Select(ToLuaAtom));
        return "local HTL = _G.HoyoToonLua\n" +
               "if HTL ~= nil then\n" +
               "    " + functionName + "(" + callArgs + ", { notify = false, popup = false })\n" +
               "end\n";
    }

    private static string? NormalizeAction(string action)
    {
        return action.ToLowerInvariant() switch
        {
            "run" or "enable" or "resume" or "on" => "enable",
            "disable" or "pause" or "restore" or "off" => "pause",
            "toggle" => "toggle",
            _ => null
        };
    }

    private static bool TryResolveLuaScript(string luaRoot, string script, out string relativePath, out string filePath)
    {
        foreach (var candidate in BuildScriptCandidates(script))
        {
            try
            {
                var resolved = HoyoToonLuaPayloadBuilder.ResolveLuaPath(luaRoot, candidate);
                if (!File.Exists(resolved)) continue;

                relativePath = candidate;
                filePath = resolved;
                return true;
            }
            catch (IOException)
            {
                continue;
            }
        }

        relativePath = "";
        filePath = "";
        return false;
    }

    private static IEnumerable<string> BuildScriptCandidates(string script)
    {
        var normalized = script.Replace("\\", "/", StringComparison.Ordinal).TrimStart('/');
        if (string.IsNullOrWhiteSpace(normalized)) yield break;

        foreach (var candidate in ExpandScriptCandidate(normalized))
            yield return candidate;

        var fileName = normalized.EndsWith(".lua", StringComparison.OrdinalIgnoreCase)
            ? normalized
            : normalized + ".lua";

        foreach (var prefix in new[] { "Avatar/Characters/", "Characters/", "Auto/" })
            foreach (var candidate in ExpandScriptCandidate(prefix + fileName))
                yield return candidate;
    }

    private static IEnumerable<string> ExpandScriptCandidate(string script)
    {
        yield return script;
        if (!script.EndsWith(".lua", StringComparison.OrdinalIgnoreCase))
            yield return script + ".lua";
    }

    private static string ToLuaAtom(string value)
    {
        if (bool.TryParse(value, out var boolValue)) return boolValue ? "true" : "false";
        if (double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number))
            return number.ToString("R", CultureInfo.InvariantCulture);

        return ToLuaString(value);
    }

    private static string ToLuaString(string value)
    {
        return "\"" + value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal)
            .Replace("\r", "\\r", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal) + "\"";
    }
}
