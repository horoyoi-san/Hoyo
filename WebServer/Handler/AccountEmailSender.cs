using System.Net;
using MailKit.Net.Smtp;
using MailKit.Security;
using March7thHoney.Database.Account;
using March7thHoney.Util;
using Microsoft.AspNetCore.Http;
using MimeKit;

namespace March7thHoney.WebServer.Handler;

internal static class AccountEmailSender
{
    private static readonly Logger Logger = new("AccountEmail");

    public static async Task<bool> SendVerificationEmailAsync(AccountData account, string token, HttpRequest request)
    {
        var auth = ConfigManager.Config.ServerOption.Auth;
        var link = BuildLink(request, "/account/email/verify",
            ("uid", account.Uid.ToString()),
            ("token", token));

        var minutes = Math.Max(auth.EmailVerificationTokenExpireMinutes, 1);
        var subject = FormatTemplate(auth.Email.VerificationSubject, account, link, minutes);
        var body = FormatTemplate(auth.Email.VerificationBody, account, link, minutes);
        var htmlBody = BuildHtmlBody(EmailTemplateKind.Verification, account, link, minutes);
        return await SendAsync(account.Email, subject, body, htmlBody);
    }

    public static async Task<bool> SendPasswordResetEmailAsync(AccountData account, string token, HttpRequest request)
    {
        var auth = ConfigManager.Config.ServerOption.Auth;
        var link = BuildLink(request, "/login-platform/reset-password.html",
            ("uid", account.Uid.ToString()),
            ("token", token));

        var minutes = Math.Max(auth.PasswordResetTokenExpireMinutes, 1);
        var subject = FormatTemplate(auth.Email.PasswordResetSubject, account, link, minutes);
        var body = FormatTemplate(auth.Email.PasswordResetBody, account, link, minutes);
        var htmlBody = BuildHtmlBody(EmailTemplateKind.PasswordReset, account, link, minutes);
        return await SendAsync(account.Email, subject, body, htmlBody);
    }

    private static async Task<bool> SendAsync(string? to, string subject, string plainBody, string htmlBody)
    {
        var email = ConfigManager.Config.ServerOption.Auth.Email;
        var smtp = email.Smtp;

        if (!email.Enabled)
        {
            Logger.Warn("Email sending is disabled. Configure ServerOption.Auth.Email to send verification and reset emails.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(to) ||
            string.IsNullOrWhiteSpace(smtp.Host) ||
            string.IsNullOrWhiteSpace(smtp.FromAddress))
        {
            Logger.Warn("Email sending is not configured completely. Host, FromAddress, and recipient are required.");
            return false;
        }

        if (!string.IsNullOrWhiteSpace(smtp.Username) && string.IsNullOrWhiteSpace(smtp.Password))
        {
            Logger.Warn("Email sending is not configured completely. SMTP password is required when SMTP username is set.");
            return false;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(smtp.FromName, smtp.FromAddress));
            message.To.Add(MailboxAddress.Parse(to));
            message.Subject = subject;
            message.Body = new BodyBuilder
            {
                TextBody = plainBody,
                HtmlBody = htmlBody
            }.ToMessageBody();

            using var client = new SmtpClient();
            var secureSocketOptions = ResolveSecureSocketOptions(smtp.Port, smtp.EnableSsl);
            await client.ConnectAsync(smtp.Host, smtp.Port, secureSocketOptions);

            if (!string.IsNullOrWhiteSpace(smtp.Username))
                await client.AuthenticateAsync(smtp.Username, smtp.Password);

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            return true;
        }
        catch (Exception ex)
        {
            Logger.Warn($"Failed to send email to {to}: {ex.Message}");
            return false;
        }
    }

    private static SecureSocketOptions ResolveSecureSocketOptions(int port, bool enableSsl)
    {
        if (!enableSsl)
            return SecureSocketOptions.None;

        return port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
    }

    private static string BuildLink(HttpRequest request, string path, params (string Key, string Value)[] query)
    {
        var configuredBase = ConfigManager.Config.ServerOption.Auth.Email.PublicBaseUrl;
        var baseUrl = !string.IsNullOrWhiteSpace(configuredBase)
            ? configuredBase.TrimEnd('/')
            : $"{request.Scheme}://{request.Host}{request.PathBase}".TrimEnd('/');

        var queryString = string.Join("&",
            query.Select(item => $"{Uri.EscapeDataString(item.Key)}={Uri.EscapeDataString(item.Value)}"));
        return $"{baseUrl}{path}?{queryString}";
    }

    private static string FormatTemplate(string template, AccountData account, string link, int minutes)
    {
        return template
            .Replace("{username}", account.Username ?? account.Uid.ToString(), StringComparison.Ordinal)
            .Replace("{email}", account.Email ?? string.Empty, StringComparison.Ordinal)
            .Replace("{uid}", account.Uid.ToString(), StringComparison.Ordinal)
            .Replace("{serverName}", ConfigManager.Config.GameServer.GameServerName, StringComparison.Ordinal)
            .Replace("{link}", link, StringComparison.Ordinal)
            .Replace("{minutes}", minutes.ToString(), StringComparison.Ordinal);
    }

    private static string BuildHtmlBody(EmailTemplateKind kind, AccountData account, string link, int minutes)
    {
        var serverName = string.IsNullOrWhiteSpace(ConfigManager.Config.GameServer.GameServerName)
            ? "March7thHoney"
            : ConfigManager.Config.GameServer.GameServerName.Trim();
        var username = account.Username ?? account.Uid.ToString();
        var logoMarkup = BuildLogoMarkup(ConfigManager.Config.ServerOption.Auth.Email.LogoUrl, serverName);

        var title = kind == EmailTemplateKind.Verification ? "Email verification" : "Password reset";
        var actionText = kind == EmailTemplateKind.Verification ? "Verify email" : "Reset password";
        var preheader = kind == EmailTemplateKind.Verification
            ? $"Finish verifying your {serverName} account."
            : $"Reset the password for your {serverName} account.";
        var lead = kind == EmailTemplateKind.Verification
            ? $"You are adding email security verification for {serverName}. Use the button below to finish verifying this account."
            : $"We received a request to reset the password for your {serverName} account. Use the button below to choose a new password.";
        var deadline = kind == EmailTemplateKind.Verification
            ? $"Please complete the account verification process in {minutes} minutes."
            : $"Please complete the password reset process in {minutes} minutes.";
        var safetyNote = kind == EmailTemplateKind.Verification
            ? "If you did not create or update this account, you can safely ignore this email."
            : "If you did not request this, no change will be made unless this link is opened.";

        var encodedTitle = WebUtility.HtmlEncode(title);
        var encodedPreheader = WebUtility.HtmlEncode(preheader);
        var encodedLead = WebUtility.HtmlEncode(lead);
        var encodedDeadline = WebUtility.HtmlEncode(deadline);
        var encodedSafetyNote = WebUtility.HtmlEncode(safetyNote);
        var encodedServerName = WebUtility.HtmlEncode(serverName);
        var encodedUsername = WebUtility.HtmlEncode(username);
        var encodedActionText = WebUtility.HtmlEncode(actionText);
        var encodedLink = WebUtility.HtmlEncode(link);

        return $$"""
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>{{encodedTitle}}</title>
</head>
<body style="margin:0; padding:0; background:#f5f6f8; color:#1f2328; font-family:Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">{{encodedPreheader}}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; margin:0; padding:0; background:#f5f6f8;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; max-width:640px; background:#ffffff; border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:42px 42px 22px 42px;">
              {{logoMarkup}}
            </td>
          </tr>
          <tr>
            <td style="padding:0 42px 8px 42px;">
              <p style="margin:0; font-size:22px; line-height:1.35; font-weight:700; color:#111827;">Hi!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 42px 0 42px;">
              <p style="margin:0; font-size:17px; line-height:1.65; color:#111827;">{{encodedLead}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 42px 0 42px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid #e6e8ec; background:#fafafa;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 5px 0; font-size:12px; line-height:1.4; color:#7a7f89; text-transform:uppercase; letter-spacing:0.08em;">Account</p>
                    <p style="margin:0; font-size:15px; line-height:1.5; color:#111827;">{{encodedUsername}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="left" style="padding:28px 42px 0 42px;">
              <a href="{{encodedLink}}" style="display:inline-block; min-width:168px; padding:14px 22px; background:#111827; color:#ffffff; font-size:15px; line-height:1.2; font-weight:700; text-align:center; text-decoration:none;">{{encodedActionText}}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 42px 0 42px;">
              <p style="margin:0; font-size:17px; line-height:1.65; color:#111827;">{{encodedDeadline}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 42px 0 42px;">
              <p style="margin:0; font-size:14px; line-height:1.65; color:#6b7280;">{{encodedSafetyNote}}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 42px 0 42px;">
              <p style="margin:0; font-size:12px; line-height:1.6; color:#8b909a;">If the button does not work, copy and paste this link into your browser:<br><a href="{{encodedLink}}" style="color:#2563eb; word-break:break-all; text-decoration:none;">{{encodedLink}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 42px 42px 42px;">
              <p style="margin:0 0 10px 0; font-size:17px; line-height:1.5; color:#111827;">{{encodedServerName}}</p>
              <p style="margin:0; font-size:17px; line-height:1.5; font-weight:700; color:#777d87;">This is an automated email. Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""";
    }

    private static string BuildLogoMarkup(string logoUrl, string serverName)
    {
        if (!string.IsNullOrWhiteSpace(logoUrl))
        {
            var encodedLogoUrl = WebUtility.HtmlEncode(logoUrl.Trim());
            var encodedAlt = WebUtility.HtmlEncode(serverName);
            return $"""<img src="{encodedLogoUrl}" width="220" alt="{encodedAlt}" style="display:block; width:220px; max-width:70%; height:auto; border:0;">""";
        }

        return $"""<div style="font-size:28px; line-height:1.2; font-weight:800; letter-spacing:0; color:#111827;">{WebUtility.HtmlEncode(serverName)}</div>""";
    }

    private enum EmailTemplateKind
    {
        Verification,
        PasswordReset
    }
}
