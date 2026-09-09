using System.Text.Json;
using March7thHoney.Database.Account;
using March7thHoney.Util;
using March7thHoney.WebServer.Objects;
using Microsoft.AspNetCore.Http;

namespace March7thHoney.WebServer.Handler;

public class ComboTokenGranterHandler
{
    private static readonly Logger Logger = new("ComboLoginV2");

    public IResult Handle(int app_id, int channel_id, string data, string device, string sign,
        IReadOnlyCollection<string> identityKeys)
    {
        LoginTokenData? tokenData = null;
        try
        {
            tokenData = JsonSerializer.Deserialize(data ?? "", WebJsonContext.Default.LoginTokenData);
        }
        catch (JsonException)
        {
            // Malformed client payload — treated as missing (handled as null below).
        }
        var res = new ComboTokenResJson();
        if (tokenData == null)
        {
            Logger.Warn($"Failed to deserialize combo login payload. raw_len={data?.Length ?? 0}");
            res.retcode = -202;
            res.message = "Invalid login data";
            return Results.Json(res);
        }

        if (!int.TryParse(tokenData.uid, out var uid))
        {
            Logger.Warn($"Invalid combo login uid. uid={tokenData.uid ?? "<null>"} token_len={tokenData.token?.Length ?? 0}");
            res.retcode = -202;
            res.message = "Invalid login data";
            return Results.Json(res);
        }

        var autoCreateUser = ConfigManager.Config.ServerOption.AutoCreateUser;
        var account = AccountData.GetAccountByUid(uid);
        var trustedExternalComboLogin = false;

        // The OS client validates username/password against the real HoYoverse shield
        // endpoint (not proxied), so only the combo login reaches us, carrying the player's
        // real account uid. When auto-create is enabled, map that real uid to a LOCAL
        // account with a normal local uid (so the real uid is never exposed in-game) and
        // trust the combo login instead of validating a token this server never issued.
        // This branch only runs when no account exists for the incoming uid, so the normal
        // flow on every platform (shield login proxied -> account already exists) is
        // unaffected and keeps using its own uid unchanged.
        if (account == null && autoCreateUser)
        {
            trustedExternalComboLogin = true;
            var externalKey = $"os_{uid}";
            account = AccountData.GetAccountByUserName(externalKey);
            if (account == null)
            {
                try
                {
                    AccountHelper.CreateAccount(externalKey, $"{externalKey}@autocreate.local", null, 0);
                    account = AccountData.GetAccountByUserName(externalKey);
                    Logger.Info($"Combo login mapped external uid={uid} -> local uid={account?.Uid}");
                }
                catch (Exception ex)
                {
                    Logger.Warn($"Combo login auto-create failed. external_uid={uid}: {ex.Message}");
                }
            }
        }

        if (account == null)
        {
            Logger.Warn(
                $"Combo login cache validation failed. uid={uid} token_len={tokenData.token?.Length ?? 0} account_exists=False");
            res.retcode = -201;
            res.message = "Game account cache information error";
            return Results.Json(res);
        }

        var isDispatchToken = account.ValidateDispatchToken(tokenData.token);
        var isComboToken = account.ValidateComboToken(tokenData.token);
        if (!trustedExternalComboLogin && !isDispatchToken && !isComboToken)
        {
            Logger.Warn(
                $"Combo login cache validation failed. uid={uid} token_len={tokenData.token?.Length ?? 0} account_exists=True");
            res.retcode = -201;
            res.message = "Game account cache information error";
            return Results.Json(res);
        }

        if (account.GetBanStatus().IsActive)
            account.AddKnownIdentityKeys(identityKeys);

        if (!LoginSessionFactory.CanAuthenticate(account, identityKeys, out var failure))
        {
            Logger.Warn($"Combo login blocked. uid={uid} retcode={failure.Retcode}");
            res.retcode = failure.Retcode;
            res.message = failure.Message;
            return Results.Json(res);
        }

        account.AddKnownIdentityKeys(identityKeys);
        Logger.Info(
            $"Combo login validated. uid={uid} token_type={(isDispatchToken ? "dispatch" : isComboToken ? "combo" : "trusted")} token_len={tokenData.token?.Length ?? 0}");
        res.message = "OK";
        res.data = new ComboTokenResJson.LoginData(account.Uid.ToString(), account.GenerateComboToken());
        return Results.Json(res);
    }
}

public class LoginTokenData
{
    public string? uid { get; set; }
    public string? token { get; set; }
    public bool guest { get; set; }
}
