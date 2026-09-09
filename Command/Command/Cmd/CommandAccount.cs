using March7thHoney.Database;
using March7thHoney.Database.Account;
using March7thHoney.Database.Mail;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server;
using March7thHoney.Internationalization;
using March7thHoney.Util;

namespace March7thHoney.Command.Command.Cmd;

[CommandInfo("account", "Game.Command.Account.Desc", "Game.Command.Account.Usage", permission: CommandPermissions.Account)]
public class CommandAccount : ICommand
{
    [CommandMethod("create")]
    public async ValueTask CreateAccount(CommandArg arg)
    {
        if (arg.Args.Count < 3)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        var account = arg.Args[1];
        var email = arg.Args[2];
        string? password = null;
        var uid = 0;

        for (var i = 3; i < arg.Args.Count; i++)
        {
            var token = arg.Args[i];
            if (token.Equals("--uid", StringComparison.OrdinalIgnoreCase) ||
                token.Equals("-u", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= arg.Args.Count || !int.TryParse(arg.Args[++i], out uid))
                {
                    await arg.SendMsg(I18NManager.Translate("Game.Command.Account.InvalidUid"));
                    return;
                }

                continue;
            }

            if (token.Equals("--password", StringComparison.OrdinalIgnoreCase) ||
                token.Equals("-p", StringComparison.OrdinalIgnoreCase))
            {
                if (i + 1 >= arg.Args.Count)
                {
                    await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
                    return;
                }

                password = arg.Args[++i];
                continue;
            }

            if (password == null)
            {
                password = token;
                continue;
            }

            if (uid == 0 && int.TryParse(token, out uid)) continue;

            await arg.SendMsg(I18NManager.Translate("Game.Command.Notice.InvalidArguments"));
            return;
        }

        if (AccountData.GetAccountByUserName(account) != null)
        {
            await arg.SendMsg(string.Format(I18NManager.Translate("Game.Command.Account.DuplicateAccount"), account));
            return;
        }

        if (AccountData.GetAccountByEmail(email) != null)
        {
            await arg.SendMsg($"Email {email} already exists.");
            return;
        }

        if (uid != 0 && AccountData.GetAccountByUid(uid) != null)
        {
            await arg.SendMsg(string.Format(I18NManager.Translate("Game.Command.Account.DuplicateUID"), uid));
            return;
        }

        try
        {
            AccountHelper.CreateAccount(account, email, password, uid);
            await arg.SendMsg(string.IsNullOrWhiteSpace(password)
                ? $"{I18NManager.Translate("Game.Command.Account.CreateSuccess", account)} Password is not set yet. Use /account setpassword {account} <password> before login."
                : I18NManager.Translate("Game.Command.Account.CreateSuccess", account));
        }
        catch (Exception ex)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.CreateError", ex.Message));
        }
    }

    [CommandMethod("setpassword")]
    public async ValueTask SetPassword(CommandArg arg)
    {
        if (arg.Args.Count < 3)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.SetPasswordUsage"));
            return;
        }

        var accountName = arg.Args[1];
        var password = arg.Args[2];
        var account = ResolveAccount(accountName);
        var canonicalAccount = account == null ? null : AccountData.GetAccountByUid(account.Uid) ?? account;
        if (canonicalAccount == null)
        {
            await arg.SendMsg($"Account {accountName} does not exist.");
            return;
        }

        try
        {
            AccountHelper.SetPassword(canonicalAccount, password);
            await arg.SendMsg($"Password updated for account {accountName}.");
        }
        catch (Exception ex)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.CreateError", ex.Message));
        }
    }

    [CommandMethod("setemail")]
    public async ValueTask SetEmail(CommandArg arg)
    {
        if (arg.Args.Count < 3)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.SetEmailUsage"));
            return;
        }

        var accountKey = arg.Args[1];
        var email = arg.Args[2];
        var verified = arg.Args.Count > 3 && bool.TryParse(arg.Args[3], out var parsed) && parsed;
        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg($"Account {accountKey} does not exist.");
            return;
        }

        try
        {
            AccountHelper.SetEmail(account, email, verified);
            await arg.SendMsg($"Email updated for account {account.Username ?? account.Uid.ToString()}.");
        }
        catch (Exception ex)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.CreateError", ex.Message));
        }
    }

    [CommandMethod("verifyemail")]
    public async ValueTask VerifyEmail(CommandArg arg)
    {
        if (arg.Args.Count < 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.VerifyEmailUsage"));
            return;
        }

        var accountKey = arg.Args[1];
        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg($"Account {accountKey} does not exist.");
            return;
        }

        account.MarkEmailVerified();
        await arg.SendMsg($"Email verified for account {account.Username ?? account.Uid.ToString()}.");
    }

    [CommandMethod("ban")]
    public async ValueTask Ban(CommandArg arg)
    {
        if (arg.Args.Count < 3)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.BanUsage"));
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.BanDurationExamples"));
            return;
        }

        var accountKey = arg.Args[1];
        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg($"Account {accountKey} does not exist.");
            return;
        }

        if (!TryParseBanDuration(arg.Args[2], out var expireAt, out var error))
        {
            await arg.SendMsg(error);
            return;
        }

        var reason = string.Join(" ", arg.Args.Skip(3)).Trim();
        account.AddKnownIdentityKeys(GetActiveConnectionIdentityKeys(account.Uid));
        account.Ban(reason, expireAt);
        var banStatus = account.GetBanStatus();
        ConnectionDisconnectHelper.KickBanned(Listener.GetActiveConnection(account.Uid), banStatus);

        await arg.SendMsg(
            $"Account {account.Username ?? account.Uid.ToString()} banned. {banStatus.FormatLoginMessage()}");
    }

    [CommandMethod("unban")]
    public async ValueTask Unban(CommandArg arg)
    {
        if (arg.Args.Count < 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.UnbanUsage"));
            return;
        }

        var accountKey = arg.Args[1];
        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg($"Account {accountKey} does not exist.");
            return;
        }

        account.ClearBan();
        await arg.SendMsg($"Account {account.Username ?? account.Uid.ToString()} unbanned.");
    }

    [CommandMethod("baninfo")]
    public async ValueTask BanInfo(CommandArg arg)
    {
        if (arg.Args.Count < 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.BanInfoUsage"));
            return;
        }

        var accountKey = arg.Args[1];
        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg($"Account {accountKey} does not exist.");
            return;
        }

        var banStatus = account.GetBanStatus();
        await arg.SendMsg(banStatus.IsActive
            ? banStatus.FormatLoginMessage()
            : $"Account {account.Username ?? account.Uid.ToString()} is not banned.");
    }

    [CommandMethod("setrole")]
    public async ValueTask SetRole(CommandArg arg)
    {
        await SetRoleInternal(arg);
    }

    [CommandMethod("role")]
    public async ValueTask Role(CommandArg arg)
    {
        await SetRoleInternal(arg);
    }

    [CommandMethod("roles")]
    public async ValueTask Roles(CommandArg arg)
    {
        await arg.SendMsg("Available roles: " + string.Join(", ", GetConfiguredRoles().Keys));
    }

    [CommandMethod("reset")]
    public async ValueTask Reset(CommandArg arg)
    {
        var accountKey = arg.Args.Count > 1 ? arg.Args[1] : arg.Sender.GetSender().ToString();
        if (string.IsNullOrWhiteSpace(accountKey) || accountKey == "0")
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.ResetUsage"));
            return;
        }

        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.AccountNotFound", accountKey));
            return;
        }

        if (DatabaseHelper.Instance == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.CreateError", "Database is not initialized"));
            return;
        }

        var displayName = account.Username ?? account.Uid.ToString();
        var isSelfReset = account.Uid == arg.Sender.GetSender();
        if (isSelfReset) await arg.SendMsg(I18NManager.Translate("Game.Command.Account.ResetStarted", displayName));

        await PlayerResetHelper.ResetGameplayAsync(account.Uid);

        if (!isSelfReset)
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.ResetSuccess", displayName));
    }

    [CommandMethod("delete")]
    public async ValueTask Delete(CommandArg arg)
    {
        await DeleteInternal(arg);
    }

    [CommandMethod("remove")]
    public async ValueTask Remove(CommandArg arg)
    {
        await DeleteInternal(arg);
    }

    private static async ValueTask DeleteInternal(CommandArg arg)
    {
        if (arg.Args.Count < 2)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.DeleteUsage"));
            return;
        }

        var accountKey = arg.Args[1];
        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.AccountNotFound", accountKey));
            return;
        }

        if (arg.Args.Count < 3 || !string.Equals(arg.Args[2], "confirm", StringComparison.OrdinalIgnoreCase))
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.DeleteRequiresConfirm",
                account.Username ?? account.Uid.ToString()));
            return;
        }

        if (DatabaseHelper.Instance == null)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.CreateError", "Database is not initialized"));
            return;
        }

        var displayName = account.Username ?? account.Uid.ToString();
        var isSelfDelete = account.Uid == arg.Sender.GetSender();
        if (isSelfDelete) await arg.SendMsg(I18NManager.Translate("Game.Command.Account.DeleteStarted", displayName));

        var activeConnection = Listener.GetActiveConnection(account.Uid);
        if (activeConnection != null)
            ConnectionDisconnectHelper.KickByGm(activeConnection);

        DatabaseHelper.Instance.DeleteUidData(account.Uid);

        if (!isSelfDelete)
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.DeleteSuccess", displayName));
    }

    private static async ValueTask SetRoleInternal(CommandArg arg)
    {
        if (arg.Args.Count < 3)
        {
            await arg.SendMsg(I18NManager.Translate("Game.Command.Account.RoleUsage"));
            return;
        }

        var accountKey = arg.Args[1];
        var account = ResolveAccount(accountKey);
        if (account == null)
        {
            await arg.SendMsg($"Account {accountKey} does not exist.");
            return;
        }

        if (!TryNormalizeRole(arg.Args[2], out var role))
        {
            await arg.SendMsg($"Unknown role {arg.Args[2]}. Available roles: {string.Join(", ", GetConfiguredRoles().Keys)}");
            return;
        }

        var permissions = account.SetRole(role);
        await arg.SendMsg(
            $"Role for {account.Username ?? account.Uid.ToString()} updated to {role}. Permissions synced: {permissions}.");
    }

    private static IReadOnlyCollection<string> GetActiveConnectionIdentityKeys(int uid)
    {
        var activeConnection = Listener.GetActiveConnection(uid);
        return activeConnection == null
            ? []
            : AccountBanHelper.BuildIdentityKeys([], activeConnection.RemoteEndPoint.Address.ToString());
    }

    private static bool TryParseBanDuration(string value, out long expireAt, out string error)
    {
        expireAt = 0;
        error = string.Empty;

        value = value.Trim();
        if (value.Equals("permanent", StringComparison.OrdinalIgnoreCase) ||
            value.Equals("perm", StringComparison.OrdinalIgnoreCase) ||
            value.Equals("forever", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var suffixStart = 0;
        while (suffixStart < value.Length && char.IsDigit(value[suffixStart]))
            suffixStart++;

        if (suffixStart == 0 || suffixStart == value.Length)
        {
            error = "Ban duration must be permanent or a value like 30m, 2h, 7d, or 1w.";
            return false;
        }

        if (!long.TryParse(value[..suffixStart], out var amount) || amount <= 0)
        {
            error = "Ban duration must be greater than zero.";
            return false;
        }

        var suffix = value[suffixStart..].ToLowerInvariant();
        var seconds = suffix switch
        {
            "s" or "sec" or "secs" or "second" or "seconds" => amount,
            "m" or "min" or "mins" or "minute" or "minutes" => amount * 60,
            "h" or "hr" or "hrs" or "hour" or "hours" => amount * 60 * 60,
            "d" or "day" or "days" => amount * 60 * 60 * 24,
            "w" or "week" or "weeks" => amount * 60 * 60 * 24 * 7,
            _ => 0
        };

        if (seconds <= 0)
        {
            error = "Unknown ban duration unit. Use s, m, h, d, or w.";
            return false;
        }

        expireAt = Extensions.GetUnixSec() + seconds;
        return true;
    }

    private static AccountData? ResolveAccount(string accountKey)
    {
        if (int.TryParse(accountKey, out var uid))
            return AccountData.GetAccountByUid(uid);

        var account = AccountData.GetAccountByLoginIdentifier(accountKey);
        return account == null ? null : AccountData.GetAccountByUid(account.Uid) ?? account;
    }

    private static bool TryNormalizeRole(string role, out string normalizedRole)
    {
        foreach (var configuredRole in GetConfiguredRoles().Keys)
        {
            if (!string.Equals(configuredRole, role, StringComparison.OrdinalIgnoreCase)) continue;

            normalizedRole = configuredRole;
            return true;
        }

        normalizedRole = "";
        return false;
    }

    private static IReadOnlyDictionary<string, HashSet<string>> GetConfiguredRoles()
    {
        return ConfigManager.Config.ServerOption.PermissionRoles ?? CommandRoles.DefaultRoles();
    }
}
