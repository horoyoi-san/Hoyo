using March7thHoney.Database.Account;
using System.Text.Json;
using March7thHoney.WebServer.Objects;
using Microsoft.AspNetCore.Http;

namespace March7thHoney.WebServer.Handler;

public class TokenLoginHandler
{
    public IResult HandleShieldVerify(string uid, string token, IReadOnlyCollection<string> identityKeys)
    {
        if (!int.TryParse(uid, out var parsedUid))
            return Results.Json(LoginResJson.Error(-201, "Game account cache information error"));

        var account = AccountData.GetAccountByUid(parsedUid);
        if (account == null)
            return Results.Json(LoginResJson.Error(-201, "Game account cache information error"));

        var isDispatchToken = account.ValidateDispatchToken(token);
        var isComboToken = account.ValidateComboToken(token);
        if (!isDispatchToken && !isComboToken)
            return Results.Json(LoginResJson.Error(-201, "Game account cache information error"));

        if (account.GetBanStatus().IsActive)
            account.AddKnownIdentityKeys(identityKeys);

        if (!LoginSessionFactory.CanAuthenticate(account, identityKeys, out var failure))
            return Results.Json(LoginResJson.Error(failure.Retcode, failure.Message));

        account.AddKnownIdentityKeys(identityKeys);
        var dispatchToken = isDispatchToken ? token : account.GenerateDispatchToken();
        var username = account.Username ?? uid;
        return Results.Json(LoginResJson.Success(
            account.Uid.ToString(),
            username,
            account.Email ?? string.Empty,
            account.IsEmailVerified,
            dispatchToken));
    }

    public IResult HandlePassportVerify(string mid, string token, bool refresh,
        IReadOnlyCollection<string> identityKeys)
    {
        if (!int.TryParse(mid, out var uid))
            return BuildJson(PassportLoginResJson.Error(-201, "Account not found"));

        var account = AccountData.GetAccountByUid(uid);
        if (account == null)
            return BuildJson(PassportLoginResJson.Error(-201, "Account not found"));

        var isDispatchToken = account.ValidateDispatchToken(token);
        var isComboToken = account.ValidateComboToken(token);
        if (!isDispatchToken && !isComboToken)
            return BuildJson(PassportLoginResJson.Error(-201, "Game account cache information error"));

        if (account.GetBanStatus().IsActive)
            account.AddKnownIdentityKeys(identityKeys);

        if (!LoginSessionFactory.CanAuthenticate(account, identityKeys, out var failure))
            return BuildJson(PassportLoginResJson.Error(failure.Retcode, failure.Message));

        account.AddKnownIdentityKeys(identityKeys);
        var dispatchToken = refresh || !isDispatchToken ? account.GenerateDispatchToken() : token;
        return BuildJson(PassportLoginResJson.Success(
            account.Uid.ToString(),
            account.Username ?? uid.ToString(),
            account.Email ?? string.Empty,
            account.IsEmailVerified,
            dispatchToken));
    }

    private static IResult BuildJson(PassportLoginResJson payload)
    {
        return Results.Text(JsonSerializer.Serialize(payload, WebJsonContext.Default.PassportLoginResJson),
            "application/json");
    }
}
