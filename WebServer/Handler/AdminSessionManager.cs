using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using March7thHoney.Util;
using March7thHoney.Util.Security;

namespace March7thHoney.WebServer.Handler;

public static class AdminSessionManager
{
    private static readonly ConcurrentDictionary<string, AdminSession> Sessions = [];
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(8);

    public static bool TryCreateSession(string adminKey, out AdminSession session, out string message)
    {
        CleanupExpiredSessions();

        session = default;
        message = "Admin key is invalid";

        var configuredKey = ConfigManager.Config.MuipServer.AdminKey;
        if (string.IsNullOrWhiteSpace(configuredKey) || configuredKey == "None")
        {
            message = "Admin page is not enabled because MuipServer.AdminKey is not configured";
            return false;
        }

        if (!SecureEquals(adminKey, configuredKey))
            return false;

        session = new AdminSession(AuthSecurity.GenerateSessionToken(), DateTimeOffset.UtcNow.Add(SessionLifetime));
        Sessions[session.Token] = session;
        message = "OK";
        return true;
    }

    public static bool IsAuthorized(string? token)
    {
        CleanupExpiredSessions();

        if (string.IsNullOrWhiteSpace(token))
            return false;

        if (!Sessions.TryGetValue(token, out var session))
            return false;

        if (session.ExpiresAt > DateTimeOffset.UtcNow)
            return true;

        Sessions.TryRemove(token, out _);
        return false;
    }

    public static void Revoke(string? token)
    {
        if (!string.IsNullOrWhiteSpace(token))
            Sessions.TryRemove(token, out _);
    }

    private static void CleanupExpiredSessions()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var (token, session) in Sessions)
        {
            if (session.ExpiresAt <= now)
                Sessions.TryRemove(token, out _);
        }
    }

    private static bool SecureEquals(string? provided, string expected)
    {
        if (provided == null)
            return false;

        var providedBytes = Encoding.UTF8.GetBytes(provided);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return providedBytes.Length == expectedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }

    public readonly record struct AdminSession(string Token, DateTimeOffset ExpiresAt);
}
