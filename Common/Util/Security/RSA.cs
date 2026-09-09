using System.Security.Cryptography;
using System.Text;

namespace March7thHoney.Util.Security;

public static class RSA
{
    public static (string PublicKeyPem, string PrivateKeyPem) GenerateKeyPair(int keySize = 2048)
    {
        using var rsa = System.Security.Cryptography.RSA.Create(keySize);
        var publicPem = rsa.ExportRSAPublicKeyPem();
        var privatePem = rsa.ExportRSAPrivateKeyPem();
        return (publicPem, privatePem);
    }

    public static byte[] Encrypt(byte[] plainBytes, string publicKeyPem, RSAEncryptionPadding? padding = null)
    {
        ArgumentNullException.ThrowIfNull(plainBytes);
        ArgumentException.ThrowIfNullOrWhiteSpace(publicKeyPem);

        using var rsa = System.Security.Cryptography.RSA.Create();
        rsa.ImportFromPem(publicKeyPem);
        return rsa.Encrypt(plainBytes, padding ?? RSAEncryptionPadding.Pkcs1);
    }

    public static byte[] Decrypt(byte[] cipherBytes, string privateKeyPem, RSAEncryptionPadding? padding = null)
    {
        ArgumentNullException.ThrowIfNull(cipherBytes);
        ArgumentException.ThrowIfNullOrWhiteSpace(privateKeyPem);

        using var rsa = System.Security.Cryptography.RSA.Create();
        rsa.ImportFromPem(privateKeyPem);
        return rsa.Decrypt(cipherBytes, padding ?? RSAEncryptionPadding.Pkcs1);
    }

    public static string EncryptToBase64(string plainText, string publicKeyPem, Encoding? encoding = null, RSAEncryptionPadding? padding = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(plainText);
        encoding ??= Encoding.UTF8;

        var plainBytes = encoding.GetBytes(plainText);
        var cipher = Encrypt(plainBytes, publicKeyPem, padding);
        return Convert.ToBase64String(cipher);
    }

    public static string DecryptFromBase64(string cipherBase64, string privateKeyPem, Encoding? encoding = null, RSAEncryptionPadding? padding = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cipherBase64);
        encoding ??= Encoding.UTF8;

        var cipherBytes = Convert.FromBase64String(cipherBase64);
        var plain = Decrypt(cipherBytes, privateKeyPem, padding);
        return encoding.GetString(plain);
    }

    public static byte[] Sign(byte[] data, string privateKeyPem, HashAlgorithmName? hashAlgorithm = null, RSASignaturePadding? padding = null)
    {
        ArgumentNullException.ThrowIfNull(data);
        ArgumentException.ThrowIfNullOrWhiteSpace(privateKeyPem);

        using var rsa = System.Security.Cryptography.RSA.Create();
        rsa.ImportFromPem(privateKeyPem);
        return rsa.SignData(data, hashAlgorithm ?? HashAlgorithmName.SHA256, padding ?? RSASignaturePadding.Pkcs1);
    }

    public static bool Verify(byte[] data, byte[] signature, string publicKeyPem, HashAlgorithmName? hashAlgorithm = null, RSASignaturePadding? padding = null)
    {
        ArgumentNullException.ThrowIfNull(data);
        ArgumentNullException.ThrowIfNull(signature);
        ArgumentException.ThrowIfNullOrWhiteSpace(publicKeyPem);

        using var rsa = System.Security.Cryptography.RSA.Create();
        rsa.ImportFromPem(publicKeyPem);
        return rsa.VerifyData(data, signature, hashAlgorithm ?? HashAlgorithmName.SHA256, padding ?? RSASignaturePadding.Pkcs1);
    }
}
