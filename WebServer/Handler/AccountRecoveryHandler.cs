using System.Net;
using March7thHoney.Database.Account;
using March7thHoney.Util;
using March7thHoney.WebServer.Objects;
using Microsoft.AspNetCore.Http;

namespace March7thHoney.WebServer.Handler;

public class AccountRecoveryHandler
{
    private const string VerificationSentMessage = "If the account exists, a verification email has been sent.";
    private const string ResetSentMessage = "If the account exists, a reset email has been sent.";
    private const string PasswordResetRequiresVerifiedEmailMessage =
        "Please verify your email before requesting a password reset.";

    public async Task<IResult> SendVerificationEmail(SendVerificationEmailReqJson req, HttpRequest request)
    {
        var account = ResolveAccount(req.account, req.username, req.email);
        if (account is { IsEmailVerified: false })
        {
            await SendVerificationEmailForAccount(account, request);
        }

        return Ok(VerificationSentMessage);
    }

    public static async Task<bool> SendVerificationEmailForAccount(AccountData account, HttpRequest request,
        bool markUnverified = false)
    {
        if (string.IsNullOrWhiteSpace(account.Email))
            return false;

        if (markUnverified)
        {
            account.SetEmail(account.Email, false);
            account.ClearLoginTokens();
        }

        var token = account.GenerateEmailVerificationToken();
        return await AccountEmailSender.SendVerificationEmailAsync(account, token, request);
    }

    public IResult VerifyEmail(string? uid, string? token)
    {
        if (!int.TryParse(uid, out var parsedUid) || string.IsNullOrWhiteSpace(token))
            return VerificationPage("Email verification failed", "The verification link is invalid or expired.", 400);

        var account = AccountData.GetAccountByUid(parsedUid);
        if (account == null || !account.ValidateEmailVerificationToken(token))
            return VerificationPage("Email verification failed", "The verification link is invalid or expired.", 400);

        account.MarkEmailVerified();
        return VerificationPage("Email verified", "You can return to the game login screen.");
    }

    public async Task<IResult> ForgotPassword(ForgotPasswordReqJson req, HttpRequest request)
    {
        var username = (req.username ?? req.account ?? string.Empty).Trim();
        var email = (req.email ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(email))
            return Error("Username and email are required");

        var account = AccountData.GetAccountByUserName(username);
        var normalizedEmail = AccountData.NormalizeEmail(email);
        var accountEmailMatches = account != null &&
                                  string.Equals(account.NormalizedEmail ?? AccountData.NormalizeEmail(account.Email),
                                      normalizedEmail, StringComparison.OrdinalIgnoreCase);

        if (accountEmailMatches && !account!.IsEmailVerified)
        {
            account.ClearPasswordResetToken();
            return Error(PasswordResetRequiresVerifiedEmailMessage, -202);
        }

        if (accountEmailMatches)
        {
            var token = account!.GeneratePasswordResetToken();
            await AccountEmailSender.SendPasswordResetEmailAsync(account, token, request);
        }

        return Ok(ResetSentMessage);
    }

    public IResult ResetPassword(ResetPasswordReqJson req)
    {
        if (!int.TryParse(req.uid, out var uid) || string.IsNullOrWhiteSpace(req.token))
            return Error("Invalid or expired reset token");

        var password = req.password ?? string.Empty;
        var confirmation = req.confirm_password ?? req.confirmPassword ?? req.confirm;
        if (!string.IsNullOrEmpty(confirmation) && !string.Equals(password, confirmation, StringComparison.Ordinal))
            return Error("Passwords do not match");

        var account = AccountData.GetAccountByUid(uid);
        if (account != null && !account.IsEmailVerified)
            account.ClearPasswordResetToken();

        if (account == null || !account.IsEmailVerified || !account.ValidatePasswordResetToken(req.token))
            return Error("Invalid or expired reset token");

        try
        {
            AccountHelper.SetPassword(account, password);
            account.ClearPasswordResetToken(false);
            account.ClearLoginTokens();
        }
        catch (Exception ex)
        {
            return Error(ex.Message);
        }

        return Ok("Password updated");
    }

    private static AccountData? ResolveAccount(string? account, string? username, string? email)
    {
        if (!string.IsNullOrWhiteSpace(username))
            return AccountData.GetAccountByUserName(username);

        if (!string.IsNullOrWhiteSpace(email))
            return AccountData.GetAccountByEmail(email);

        if (!string.IsNullOrWhiteSpace(account))
            return AccountData.GetAccountByLoginIdentifier(account);

        return null;
    }

    private static IResult Ok(string message)
    {
        return Results.Json(new StatusResult(0, message));
    }

    private static IResult Error(string message, int retcode = -201)
    {
        return Results.Json(new StatusResult(retcode, message), statusCode: StatusCodes.Status400BadRequest);
    }

    private static IResult VerificationPage(string title, string message, int statusCode = 200)
    {
        var encodedTitle = WebUtility.HtmlEncode(title);
        var encodedMessage = WebUtility.HtmlEncode(message);
        return Results.Text($$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{encodedTitle}}</title>
  <style>
    :root { color-scheme: dark; --ink: #f5f7fb; --muted: #a9b2c4; --surface: #161b26; --line: #303849; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #0d111a; color: var(--ink); font-family: "Inter", "Segoe UI", Arial, sans-serif; }
    main { width: min(100%, 420px); padding: 28px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
    h1 { margin: 0 0 8px; font-size: 24px; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <h1>{{encodedTitle}}</h1>
    <p>{{encodedMessage}}</p>
  </main>
</body>
</html>
""", "text/html; charset=utf-8", null, statusCode);
    }
}
