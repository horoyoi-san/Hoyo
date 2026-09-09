using System.Text.Json;
using March7thHoney.WebServer.Objects;
using Microsoft.AspNetCore.Http;

namespace March7thHoney.WebServer.Handler;

public class UsernameLoginHandler
{
    public IResult HandleShieldLogin(string account, string password, IReadOnlyCollection<string> identityKeys)
    {
        LoginSessionFactory.LoginFailure failure;
        if (!LoginSessionFactory.TryCreateSession(account, password, identityKeys, out var session, out failure))
            return Results.Json(LoginResJson.Error(failure.Retcode, failure.Message));

        return Results.Json(LoginResJson.Success(
            session.Uid,
            session.Username,
            session.Email,
            session.IsEmailVerified,
            session.DispatchToken));
    }

    public IResult HandlePassportLogin(string account, string password, IReadOnlyCollection<string> identityKeys)
    {
        LoginSessionFactory.LoginFailure failure;
        if (!LoginSessionFactory.TryCreateSession(account, password, identityKeys, out var session, out failure))
            return Results.Json(new StatusResult(failure.Retcode, failure.Message));

        return Results.Json(BuildPassportLoginBody(session));
    }

    public IResult HandleLegacyPassportLogin(string account, string password, IReadOnlyCollection<string> identityKeys)
    {
        LoginSessionFactory.LoginFailure failure;
        if (!LoginSessionFactory.TryCreateSession(account, password, identityKeys, out var session, out failure))
            return Results.Text(
                JsonSerializer.Serialize(PassportLoginResJson.Error(failure.Retcode, failure.Message),
                    WebJsonContext.Default.PassportLoginResJson),
                "application/json");

        return Results.Text(
            JsonSerializer.Serialize(BuildPassportLoginBody(session), WebJsonContext.Default.PassportLoginBody),
            "application/json");
    }

    private static PassportLoginBody BuildPassportLoginBody(LoginSessionFactory.LoginSession session)
    {
        var userInfo = new PassportUserInfo(
            session.Uid, session.Uid, session.Username, session.Email, session.IsEmailVerified ? 1 : 0, "**",
            "", "", "", "", "",
            "", "", "1", [], "CN",
            "1", 0, session.Email, string.IsNullOrWhiteSpace(session.Email) ? 0 : 1);

        return new PassportLoginBody(0, "OK", new PassportLoginBodyData(
            "", "", userInfo,
            new PassportToken(1, session.DispatchToken),
            new PassportExtUserInfo("", "0")));
    }
}
