using March7thHoney.Util;
using March7thHoney.Util.Security;
using System.Security.Cryptography;

namespace March7thHoney.WebServer.Handler;

public static class LoginCryptoHelper
{
    private static readonly Logger Logger = new("LoginCrypto");
    private static string SecurityDir => Path.Combine(ConfigManager.Config.Path.ConfigPath, "Security");
    private static string PrivateKeyPath => Path.Combine(SecurityDir, "LoginRsaPrivateKey.pem");

    public static (string account, string password) TryDecryptCredentials(string? account, string? password, bool decryptRequested)
    {
        var rawAccount = account ?? string.Empty;
        var rawPassword = password ?? string.Empty;
        if (!decryptRequested)
            return (rawAccount, rawPassword);

        var privatePem = LoadPrivateKey();
        var hasPrivateKey = !string.IsNullOrWhiteSpace(privatePem);
        if (!hasPrivateKey)
        {
            Logger.Warn(
                $"RSA login decrypt was requested but no private key was found. Expected file: {PrivateKeyPath}");
            return (rawAccount, rawPassword);
        }

        privatePem = NormalizePem(privatePem);
        var accountResult = TryDecrypt(rawAccount, privatePem);
        var passwordResult = TryDecrypt(rawPassword, privatePem);

        return (accountResult.Value, passwordResult.Value);
    }

    public static (string account, string password, bool decryptFailed) TryDecryptCredentialsStrict(
        string? account, string? password, bool decryptRequested)
    {
        var rawAccount = account ?? string.Empty;
        var rawPassword = password ?? string.Empty;
        if (!decryptRequested)
            return (rawAccount, rawPassword, false);

        var privatePem = LoadPrivateKey();
        if (string.IsNullOrWhiteSpace(privatePem))
            return (rawAccount, rawPassword, true);

        privatePem = NormalizePem(privatePem);
        var accountResult = TryDecrypt(rawAccount, privatePem);
        var passwordResult = TryDecrypt(rawPassword, privatePem);
        var shouldDecryptAccount = LooksLikeBase64(rawAccount);
        var shouldDecryptPassword = LooksLikeBase64(rawPassword);
        var accountFailed = shouldDecryptAccount && !accountResult.Succeeded;
        var passwordFailed = shouldDecryptPassword && !passwordResult.Succeeded;

        return (accountResult.Value, passwordResult.Value, accountFailed || passwordFailed);
    }

    private static DecryptResult TryDecrypt(string raw, string privatePem)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new DecryptResult(raw, false);
        if (!LooksLikeBase64(raw)) return new DecryptResult(raw, false);

        var paddings = new[]
        {
            RSAEncryptionPadding.Pkcs1,
            RSAEncryptionPadding.OaepSHA1,
            RSAEncryptionPadding.OaepSHA256
        };

        foreach (var padding in paddings)
        {
            try
            {
                return new DecryptResult(
                    March7thHoney.Util.Security.RSA.DecryptFromBase64(raw, privatePem, null, padding), true);
            }
            catch (Exception e)
            {
                Logger.Debug($"RSA login decrypt with {padding.Mode} failed, fallback next. len={raw.Length}", e);
            }
        }

        Logger.Debug($"RSA login decrypt failed for all paddings, fallback plaintext. len={raw.Length}");
        return new DecryptResult(raw, false);
    }

    private static bool LooksLikeBase64(string value)
    {
        if (value.Length < 16 || value.Length % 4 != 0) return false;
        return Convert.TryFromBase64String(value, new Span<byte>(new byte[value.Length]), out _);
    }

    private static string NormalizePem(string pem)
    {
        var normalized = pem.Replace("\\n", "\n").Trim();

        // Accept raw base64 key material in config and wrap it as PEM.
        if (!normalized.Contains("BEGIN", StringComparison.OrdinalIgnoreCase))
        {
            normalized = "-----BEGIN RSA PRIVATE KEY-----\n" + normalized + "\n-----END RSA PRIVATE KEY-----";
        }

        return normalized;
    }

    private static string LoadPrivateKey()
    {
        try
        {
            if (File.Exists(PrivateKeyPath))
                return File.ReadAllText(PrivateKeyPath).Trim();
        }
        catch (Exception e)
        {
            Logger.Debug($"Load private key from file failed: {PrivateKeyPath}", e);
        }

        return ConfigManager.Config.WebSecurity.RsaPrivateKeyPem;
    }

    private readonly record struct DecryptResult(string Value, bool Succeeded);
}
