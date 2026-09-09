using System.Globalization;
using March7thHoney.Configuration;
using March7thHoney.GameServer.Server;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Internationalization;
using March7thHoney.Kcp;
using March7thHoney.Util;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("anno", "Game.Command.Anno.Desc", "Game.Command.Anno.Usage", permission: CommandPermissions.Anno)]
public class CommandAnno : ICommand
{
    private static readonly string[] DurationOptions = ["--duration", "--time", "--for", "-d"];
    private static readonly string[] FrequencyOptions = ["--frequency", "--freq", "--interval", "-f"];

    [CommandDefault]
    public async ValueTask Default(CommandArg arg)
    {
        if (arg.Args.Count == 0)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Anno.Usage"));
            return;
        }

        var cfg = ConfigManager.Config.ServerOption.ServerAnnounce;
        if (!TryParseArgs(arg.Args, cfg, out var content, out var durationSeconds, out var bannerFrequencySeconds,
                out var errorKey))
        {
            await arg.SendMsg(I18NManager.Translate(errorKey));
            return;
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Anno.Usage"));
            return;
        }

        var recipients = arg.IsTargetExplicit && arg.Target != null
            ? [arg.Target]
            : March7thHoneyListener.GetSnapshot().OfType<Connection>();

        var sent = 0;
        foreach (var connection in recipients)
        {
            if (!connection.IsOnline || connection.Player == null) continue;
            await connection.SendPacket(new PacketServerAnnounceNotify(content, durationSeconds, bannerFrequencySeconds));
            sent++;
        }

        await arg.SendMsg(I18NManager.Translate("Game.Command.Anno.Sent",
            sent.ToString(),
            DurationParser.FormatSeconds(durationSeconds),
            DurationParser.FormatSeconds(bannerFrequencySeconds)));
    }

    private static bool TryParseArgs(
        IReadOnlyList<string> tokens,
        ServerAnnounce cfg,
        out string content,
        out long durationSeconds,
        out uint bannerFrequencySeconds,
        out string errorKey)
    {
        durationSeconds = cfg.GetDurationSeconds();
        bannerFrequencySeconds = cfg.GetBannerFrequencySeconds();
        errorKey = "";

        var contentTokens = new List<string>();
        for (var i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];
            if (TryConsumeDurationOption(tokens, ref i, token, DurationOptions, out var durationValue))
            {
                if (!DurationParser.TryParseSeconds(durationValue, out var parsedDuration) ||
                    parsedDuration > DurationParser.MaxDurationSeconds)
                {
                    content = "";
                    errorKey = "Game.Command.Anno.InvalidDuration";
                    return false;
                }

                durationSeconds = Math.Clamp(parsedDuration, 1, DurationParser.MaxDurationSeconds);
                continue;
            }

            if (TryConsumeDurationOption(tokens, ref i, token, FrequencyOptions, out var frequencyValue))
            {
                if (!DurationParser.TryParseSeconds(frequencyValue, out var parsedFrequency) ||
                    parsedFrequency > uint.MaxValue)
                {
                    content = "";
                    errorKey = "Game.Command.Anno.InvalidFrequency";
                    return false;
                }

                bannerFrequencySeconds = (uint)Math.Clamp(parsedFrequency, 1, uint.MaxValue);
                continue;
            }

            contentTokens.Add(token);
        }

        if (TryConsumeLeadingTime(contentTokens, out var positionalDuration))
            durationSeconds = Math.Clamp(positionalDuration, 1, DurationParser.MaxDurationSeconds);

        if (TryConsumeLeadingTime(contentTokens, out var positionalFrequency))
            bannerFrequencySeconds = (uint)Math.Clamp(positionalFrequency, 1, uint.MaxValue);

        content = contentTokens.Count == 0 ? "" : string.Join(" ", contentTokens).Trim();
        return true;
    }

    private static bool TryConsumeLeadingTime(List<string> tokens, out long seconds)
    {
        seconds = 0;
        if (tokens.Count == 0) return false;

        var value = tokens[0];
        var consumed = 1;
        if (IsNumber(value) && tokens.Count > 1 && DurationParser.IsDurationUnit(tokens[1]))
        {
            value += " " + tokens[1];
            consumed = 2;
        }

        if (!DurationParser.TryParseSeconds(value, out seconds)) return false;

        tokens.RemoveRange(0, consumed);
        return true;
    }

    private static bool TryConsumeDurationOption(
        IReadOnlyList<string> tokens,
        ref int index,
        string token,
        IReadOnlyList<string> optionNames,
        out string value)
    {
        value = "";
        foreach (var optionName in optionNames)
        {
            if (token.Equals(optionName, StringComparison.OrdinalIgnoreCase))
            {
                if (index + 1 >= tokens.Count) return true;

                value = tokens[++index];
                ConsumeOptionalUnit(tokens, ref index, ref value);
                return true;
            }

            var inlinePrefix = optionName + "=";
            if (!token.StartsWith(inlinePrefix, StringComparison.OrdinalIgnoreCase)) continue;

            value = token[inlinePrefix.Length..];
            ConsumeOptionalUnit(tokens, ref index, ref value);
            return true;
        }

        return false;
    }

    private static void ConsumeOptionalUnit(IReadOnlyList<string> tokens, ref int index, ref string value)
    {
        if (!IsNumber(value) || index + 1 >= tokens.Count || !DurationParser.IsDurationUnit(tokens[index + 1]))
            return;

        value += " " + tokens[++index];
    }

    private static bool IsNumber(string value)
    {
        return double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out _);
    }
}
