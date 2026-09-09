using March7thHoney.GameServer.Server;
using March7thHoney.Kcp;
using March7thHoney.Util;
using System.Text;

namespace March7thHoney.Command.Command;

public class CommandArg
{
    public CommandArg(string raw, ICommandSender sender, Connection? con = null, bool isTargetExplicit = false) :
        this(Tokenize(raw), raw, sender, con, isTargetExplicit)
    {
    }

    public CommandArg(IEnumerable<string> args, string raw, ICommandSender sender, Connection? con = null,
        bool isTargetExplicit = false)
    {
        Raw = raw;
        Sender = sender;
        IsTargetExplicit = isTargetExplicit;
        var tokens = args.ToList();
        for (var i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];
            if (!token.StartsWith("--", StringComparison.Ordinal) || token.Length <= 2) continue;

            var option = token[2..];
            var value = "";
            var separator = option.IndexOf('=');
            if (separator >= 0)
            {
                value = option[(separator + 1)..];
                option = option[..separator];
            }
            else if (tokens.Count > i + 1 && !tokens[i + 1].StartsWith('-'))
            {
                value = tokens[i + 1];
            }

            CharacterArgs[NormalizeOptionKey(option)] = value;
        }

        foreach (var arg in tokens)
        {
            if (string.IsNullOrEmpty(arg)) continue;
            var character = arg[0];
            if (!int.TryParse(character.ToString(), out _) && character != '-')
            {
                CharacterArgs[arg[..1]] = arg.Length > 1 ? arg[1..] : "";
                Args.Add(arg);
            }
            else
            {
                BasicArgs.Add(arg);
                Args.Add(arg);
            }
        }

        if (con != null) Target = con;

        CharacterArgs.TryGetValue("@", out var target);
        if (target == null || !int.TryParse(target, out _)) return;
        if (March7thHoneyListener.GetSnapshot()
                .Find(item => (item as Connection)?.Player?.Uid.ToString() == target) is Connection connection)
        {
            Target = connection;
            IsTargetExplicit = true;
        }
    }

    public string Raw { get; }
    public List<string> Args { get; } = [];
    public List<string> BasicArgs { get; } = [];
    public Dictionary<string, string> CharacterArgs { get; } = [];
    public Connection? Target { get; set; }
    public bool IsTargetExplicit { get; }
    public ICommandSender Sender { get; }

    public static List<string> Tokenize(string raw)
    {
        var tokens = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        var quote = '\0';
        var escaped = false;

        foreach (var c in raw)
        {
            if (escaped)
            {
                current.Append(c);
                escaped = false;
                continue;
            }

            if (inQuotes && c == '\\')
            {
                escaped = true;
                continue;
            }

            if (c is '"' or '\'')
            {
                if (inQuotes && c == quote)
                {
                    inQuotes = false;
                    continue;
                }

                if (!inQuotes)
                {
                    inQuotes = true;
                    quote = c;
                    continue;
                }
            }

            if (char.IsWhiteSpace(c) && !inQuotes)
            {
                if (current.Length == 0) continue;
                tokens.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(c);
        }

        if (escaped) current.Append('\\');
        if (current.Length > 0) tokens.Add(current.ToString());

        return tokens;
    }

    private static string NormalizeOptionKey(string key)
    {
        return key.ToLowerInvariant() switch
        {
            "count" or "amount" => "x",
            "level" => "l",
            "rank" or "eidolon" or "superimposition" => "r",
            _ => key
        };
    }

    public int GetInt(int index)
    {
        if (BasicArgs.Count <= index) return 0;
        _ = int.TryParse(BasicArgs[index], out var res);
        return res;
    }

    public bool TryGetInt(int index, out int value)
    {
        value = 0;
        return BasicArgs.Count > index && int.TryParse(BasicArgs[index], out value);
    }

    public async ValueTask SendMsg(string msg)
    {
        await Sender.SendMsg(msg);
    }

    public override string ToString()
    {
        return $"BasicArg: {BasicArgs.ToArrayString()}. CharacterArg: {CharacterArgs.ToJsonString()}.";
    }
}
