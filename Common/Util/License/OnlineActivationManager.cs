using System.Buffers.Binary;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using March7thHoney.Internationalization;

namespace March7thHoney.Util.License;

// Startup online activation gate with interactive authorization.
//
// First run (no saved token): the server requests a device code from cyrene-web,
// prints the verification URL + user code (and opens the browser), then polls
// until the operator signs in and approves. The returned launcher token is saved
// to Config/activation.token. Every run then calls /api/server/activate, which
// binds the token to this machine's HWID and returns an ECDSA P-256 signature we
// verify with the embedded public key — so a forged/MITM'd response is useless.
// This is a deterrent gate, not an unbreakable lock.
public static class OnlineActivationManager
{
    private static readonly Logger Logger = new("Activation");

    private const string BaseUrl = "https://cyrene.hoyotoon.com";
    private const string ActivateEndpoint = BaseUrl + "/api/server/activate";
    private const string DeviceCodeEndpoint = BaseUrl + "/api/launcher/device/code";
    private const string DeviceTokenEndpoint = BaseUrl + "/api/launcher/device/token";
    private const string HelpUrl = "discord.gg/CyreneEchoes";

    // ECDSA P-256 public key (SubjectPublicKeyInfo DER, base64); pairs with cyrene.hoyotoon.com ACTIVATION_SIGN_SK.
    private const string SignPublicKeyB64 =
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE0B8BahOmnSrpcrz64ReTq75XAiTrrs+PrHBtQp7ImtYnnj/Pvkly2EEbeqTLml9eq238gUwUOcfuIOHw78wujg==";

    private static readonly byte[] Magic = "M7HACT01"u8.ToArray();

    public static async Task<bool> ValidateAsync(string version)
    {
        try
        {
            // Launcher-managed: CyreneLauncher injects its login token (and device id) via env; use them directly, never the browser flow.
            var launcherMode = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("M7H_LAUNCHER_MODE"));
            var deviceIdOverride = Environment.GetEnvironmentVariable("M7H_DEVICE_ID");

            var hwid = (launcherMode && !string.IsNullOrWhiteSpace(deviceIdOverride)
                ? deviceIdOverride.Trim()
                : HardwareIdManager.GetHwid()).ToLowerInvariant();
            Logger.Info(I18NManager.Translate("Server.ServerInfo.LicenseCurrentHwid", hwid));

            var token = ReadToken();

            if (launcherMode)
            {
                var ok = !string.IsNullOrWhiteSpace(token) && await ActivateAsync(token, hwid, version) == ActivateResult.Ok;
                if (!ok) Logger.Error(I18NManager.Translate("Server.ServerInfo.ActivationLauncherRelogin"));
                return ok;
            }

            if (string.IsNullOrWhiteSpace(token))
            {
                token = await AuthorizeDeviceAsync(hwid, version);
                if (string.IsNullOrWhiteSpace(token)) return false; // already logged
                SaveToken(token);
            }

            var result = await ActivateAsync(token, hwid, version);

            // A stale/revoked token: drop it and re-run the interactive flow once.
            if (result == ActivateResult.TokenInvalid)
            {
                DeleteToken();
                token = await AuthorizeDeviceAsync(hwid, version);
                if (string.IsNullOrWhiteSpace(token)) return false;
                SaveToken(token);
                result = await ActivateAsync(token, hwid, version);
            }

            return result == ActivateResult.Ok;
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }

    private enum ActivateResult { Ok, TokenInvalid, Error }

    private static async Task<ActivateResult> ActivateAsync(string token, string hwid, string version)
    {
        var nonce = RandomNumberGenerator.GetBytes(24);
        var nonceHex = Convert.ToHexStringLower(nonce);

        Logger.Info(I18NManager.Translate("Server.ServerInfo.ActivationContacting"));
        var body = JsonSerializer.Serialize(
            new ActivationRequest { Hwid = hwid, Nonce = nonceHex, Version = version },
            ActivationJsonContext.Default.ActivationRequest);
        var (status, payload) = await PostJsonAsync(ActivateEndpoint, body, token);

        if (status is 401 or 403)
        {
            Fail($"HTTP {status}: {Truncate(payload)}");
            return ActivateResult.TokenInvalid;
        }

        if (status != 200 || string.IsNullOrEmpty(payload))
        {
            Fail($"HTTP {status}: {Truncate(payload)}");
            return ActivateResult.Error;
        }

        ActivationResponse? resp;
        try
        {
            resp = JsonSerializer.Deserialize(payload, ActivationJsonContext.Default.ActivationResponse);
        }
        catch
        {
            Fail("malformed response");
            return ActivateResult.Error;
        }

        if (resp?.Sig is null || resp.Hwid is null || resp.Nonce is null)
        {
            Fail("incomplete response");
            return ActivateResult.Error;
        }

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (!string.Equals(resp.Hwid, hwid, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(resp.Nonce, nonceHex, StringComparison.OrdinalIgnoreCase)
            || resp.Exp <= now)
        {
            Fail("challenge mismatch");
            return ActivateResult.Error;
        }

        if (!VerifySignature(hwid, nonce, resp.Exp, resp.Sig))
        {
            Fail("signature mismatch");
            return ActivateResult.Error;
        }

        var expLocal = DateTimeOffset.FromUnixTimeSeconds(resp.Exp).ToLocalTime();
        Logger.Info(I18NManager.Translate("Server.ServerInfo.ActivationSuccess",
            expLocal.ToString("yyyy-MM-dd HH:mm:ss")));
        return ActivateResult.Ok;
    }

    // Interactive device-authorization flow. Returns a launcher token or null.
    private static async Task<string?> AuthorizeDeviceAsync(string hwid, string version)
    {
        Logger.Warn(I18NManager.Translate("Server.ServerInfo.ActivationDeviceAuthRequired"));

        var reqBody = JsonSerializer.Serialize(new DeviceCodeRequest
        {
            DeviceId = hwid,
            Version = version,
            Os = RuntimeInformation.OSDescription,
            Hostname = Environment.MachineName
        }, ActivationJsonContext.Default.DeviceCodeRequest);

        var (status, payload) = await PostJsonAsync(DeviceCodeEndpoint, reqBody, null);
        if (status != 200 || string.IsNullOrEmpty(payload))
        {
            Fail($"device/code HTTP {status}: {Truncate(payload)}");
            return null;
        }

        DeviceCodeResponse? dc;
        try
        {
            dc = JsonSerializer.Deserialize(payload, ActivationJsonContext.Default.DeviceCodeResponse);
        }
        catch
        {
            Fail("malformed device/code response");
            return null;
        }

        if (dc?.DeviceCode is null || dc.UserCode is null || dc.VerificationUri is null)
        {
            Fail("incomplete device/code response");
            return null;
        }

        Logger.Warn(I18NManager.Translate("Server.ServerInfo.ActivationDeviceAuthOpen", dc.VerificationUri));
        Logger.Warn(I18NManager.Translate("Server.ServerInfo.ActivationDeviceAuthCode", dc.UserCode));
        TryOpenBrowser(dc.VerificationUri);

        var interval = Math.Clamp(dc.Interval <= 0 ? 5 : dc.Interval, 2, 30);
        var deadline = DateTime.UtcNow.AddSeconds(dc.ExpiresIn <= 0 ? 600 : dc.ExpiresIn);
        var tokenBody = JsonSerializer.Serialize(new DeviceTokenRequest { DeviceCode = dc.DeviceCode },
            ActivationJsonContext.Default.DeviceTokenRequest);

        Logger.Info(I18NManager.Translate("Server.ServerInfo.ActivationDeviceAuthWaiting"));
        while (DateTime.UtcNow < deadline)
        {
            await Task.Delay(TimeSpan.FromSeconds(interval));

            var (s, p) = await PostJsonAsync(DeviceTokenEndpoint, tokenBody, null);
            DeviceTokenResponse? tr = null;
            if (!string.IsNullOrEmpty(p))
            {
                try { tr = JsonSerializer.Deserialize(p, ActivationJsonContext.Default.DeviceTokenResponse); }
                catch { /* treat as transient */ }
            }

            if (s == 200 && !string.IsNullOrWhiteSpace(tr?.Token))
            {
                Logger.Info(I18NManager.Translate("Server.ServerInfo.ActivationDeviceAuthGranted"));
                return tr!.Token;
            }

            var err = tr?.Error;
            if (err is "authorization_pending" or "slow_down" || s == 429)
                continue; // keep polling

            if (err is "access_denied")
            {
                Fail(I18NManager.Translate("Server.ServerInfo.ActivationDeviceAuthDenied"));
                return null;
            }

            if (err is "expired_token")
                break;

            // account_banned / account_pending / other hard errors
            if (s is 403)
            {
                Fail($"device/token HTTP {s}: {err}");
                return null;
            }
        }

        Fail(I18NManager.Translate("Server.ServerInfo.ActivationDeviceAuthTimeout"));
        return null;
    }

    private static bool Fail(string reason)
    {
        Logger.Error(I18NManager.Translate("Server.ServerInfo.ActivationFailed", reason));
        Logger.Error(I18NManager.Translate("Server.ServerInfo.LicenseInvalid", HelpUrl));
        return false;
    }

    private static string TokenPath => ConfigManager.Config.Path.ConfigPath + "/activation.token";

    // Token source: env M7H_ACTIVATION_TOKEN first, then Config/activation.token.
    private static string? ReadToken()
    {
        var env = Environment.GetEnvironmentVariable("M7H_ACTIVATION_TOKEN");
        if (!string.IsNullOrWhiteSpace(env)) return env.Trim();
        try
        {
            if (File.Exists(TokenPath))
            {
                var token = File.ReadAllText(TokenPath).Trim();
                if (!string.IsNullOrWhiteSpace(token)) return token;
            }
        }
        catch
        {
            // ignore — treated as missing token
        }

        return null;
    }

    private static void SaveToken(string token)
    {
        try
        {
            Directory.CreateDirectory(ConfigManager.Config.Path.ConfigPath);
            File.WriteAllText(TokenPath, token.Trim());
        }
        catch
        {
            // non-fatal: a non-persisted token just means re-authorizing next start
        }
    }

    private static void DeleteToken()
    {
        try
        {
            if (File.Exists(TokenPath)) File.Delete(TokenPath);
        }
        catch
        {
            // ignore
        }
    }

    private static void TryOpenBrowser(string url)
    {
        try
        {
            Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
        }
        catch
        {
            // headless host or no browser: the URL is already logged for manual use
        }
    }

    // Retry transient failures (network errors / 5xx) with backoff; a definitive HTTP response (2xx/4xx) returns immediately.
    private static async Task<(int, string?)> PostJsonAsync(string url, string json, string? bearer)
    {
        const int maxAttempts = 4;
        var lastErr = "network error";
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
                if (!string.IsNullOrEmpty(bearer))
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearer);
                using var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await client.PostAsync(url, content);
                var text = await response.Content.ReadAsStringAsync();
                var status = (int)response.StatusCode;
                if (status >= 500 && attempt < maxAttempts)
                {
                    lastErr = $"HTTP {status}";
                    await Task.Delay(TimeSpan.FromSeconds(attempt));
                    continue;
                }
                return (status, text);
            }
            catch (Exception ex)
            {
                lastErr = ex.Message;
                if (attempt < maxAttempts) await Task.Delay(TimeSpan.FromSeconds(attempt));
            }
        }
        return (0, lastErr);
    }

    private static bool VerifySignature(string hwid, byte[] nonce, long exp, string sigB64)
    {
        byte[] hwidRaw;
        byte[] sig;
        try
        {
            hwidRaw = Convert.FromHexString(hwid);
            sig = Convert.FromBase64String(sigB64);
        }
        catch
        {
            return false;
        }

        if (hwidRaw.Length != 32 || nonce.Length != 24) return false;

        Span<byte> msg = stackalloc byte[8 + 32 + 24 + 8];
        var o = 0;
        Magic.CopyTo(msg);
        o += Magic.Length;
        hwidRaw.CopyTo(msg[o..]);
        o += 32;
        nonce.CopyTo(msg[o..]);
        o += 24;
        BinaryPrimitives.WriteInt64LittleEndian(msg[o..], exp);

        using var ecdsa = ECDsa.Create();
        ecdsa.ImportSubjectPublicKeyInfo(Convert.FromBase64String(SignPublicKeyB64), out _);
        return ecdsa.VerifyData(msg, sig, HashAlgorithmName.SHA256,
            DSASignatureFormat.IeeeP1363FixedFieldConcatenation);
    }

    private static string Truncate(string? s) =>
        string.IsNullOrEmpty(s) ? "" : s.Length <= 200 ? s : s[..200];
}

public class ActivationRequest
{
    public string Hwid { get; set; } = "";
    public string Nonce { get; set; } = "";
    public string Version { get; set; } = "";
}

public class ActivationResponse
{
    public string? Hwid { get; set; }
    public string? Nonce { get; set; }
    public long Exp { get; set; }
    public string? Sig { get; set; }
}

public class DeviceCodeRequest
{
    [JsonPropertyName("device_id")] public string DeviceId { get; set; } = "";
    [JsonPropertyName("version")] public string Version { get; set; } = "";
    [JsonPropertyName("os")] public string Os { get; set; } = "";
    [JsonPropertyName("hostname")] public string Hostname { get; set; } = "";
}

public class DeviceCodeResponse
{
    [JsonPropertyName("device_code")] public string? DeviceCode { get; set; }
    [JsonPropertyName("user_code")] public string? UserCode { get; set; }
    [JsonPropertyName("verification_uri_complete")] public string? VerificationUri { get; set; }
    [JsonPropertyName("expires_in")] public int ExpiresIn { get; set; }
    [JsonPropertyName("interval")] public int Interval { get; set; }
}

public class DeviceTokenRequest
{
    [JsonPropertyName("device_code")] public string DeviceCode { get; set; } = "";
}

public class DeviceTokenResponse
{
    [JsonPropertyName("token")] public string? Token { get; set; }
    [JsonPropertyName("error")] public string? Error { get; set; }
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(ActivationRequest))]
[JsonSerializable(typeof(ActivationResponse))]
[JsonSerializable(typeof(DeviceCodeRequest))]
[JsonSerializable(typeof(DeviceCodeResponse))]
[JsonSerializable(typeof(DeviceTokenRequest))]
[JsonSerializable(typeof(DeviceTokenResponse))]
internal partial class ActivationJsonContext : JsonSerializerContext;
