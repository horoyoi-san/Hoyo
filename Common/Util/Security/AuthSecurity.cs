using System.Security.Cryptography;
using System.Text;

namespace March7thHoney.Util.Security;

public static class AuthSecurity
{
    private const int MinimumIterations = 100000;
    private const int SaltSize = 16;
    private const int HashSize = 32;

    public static string GenerateSessionToken(int byteCount = 32)
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(byteCount));
    }

    public static string HashToken(string token)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(token);

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hash);
    }

    public static bool VerifyToken(string token, string? tokenHash)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(tokenHash))
            return false;

        try
        {
            var providedHash = Convert.FromBase64String(HashToken(token));
            var storedHash = Convert.FromBase64String(tokenHash);
            return providedHash.Length == storedHash.Length &&
                   CryptographicOperations.FixedTimeEquals(providedHash, storedHash);
        }
        catch
        {
            return false;
        }
    }

    public static (string Salt, string Hash, int Iterations) HashPassword(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);

        var iterations = Math.Max(ConfigManager.Config.ServerOption.Auth.PasswordHashIterations, MinimumIterations);
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, HashSize);

        return (Convert.ToBase64String(salt), Convert.ToBase64String(hash), iterations);
    }

    public static bool VerifyPassword(string password, string? saltBase64, string? hashBase64, int iterations)
    {
        if (string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(saltBase64) ||
            string.IsNullOrWhiteSpace(hashBase64))
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(saltBase64);
            var storedHash = Convert.FromBase64String(hashBase64);
            var effectiveIterations = Math.Max(iterations, MinimumIterations);
            var computedHash =
                Rfc2898DeriveBytes.Pbkdf2(password, salt, effectiveIterations, HashAlgorithmName.SHA256,
                    storedHash.Length);

            return CryptographicOperations.FixedTimeEquals(computedHash, storedHash);
        }
        catch
        {
            return false;
        }
    }
}
