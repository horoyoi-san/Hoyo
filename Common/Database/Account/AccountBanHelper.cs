using MemoryPack;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.Database.Account;

public readonly record struct AccountBanStatus(
    bool IsActive,
    int BannedUid,
    string Reason,
    long ExpireAt,
    long CreatedAt,
    bool IdentityMatched)
{
    public static AccountBanStatus Inactive => new(false, 0, string.Empty, 0, 0, false);

    public bool IsPermanent => IsActive && ExpireAt <= 0;

    public long RemainingSeconds => IsPermanent ? 0 : Math.Max(0, ExpireAt - Extensions.GetUnixSec());

    public string FormatLoginMessage()
    {
        if (!IsActive) return string.Empty;

        var target = IdentityMatched
            ? "A ban is active for this device or network"
            : "This account is banned";
        var reason = string.IsNullOrWhiteSpace(Reason) ? "No reason provided" : Reason.Trim();

        if (IsPermanent)
            return $"{target}. Reason: {reason}. Ban duration: permanent.";

        var expiresAt = DateTimeOffset.FromUnixTimeSeconds(ExpireAt).UtcDateTime;
        return $"{target}. Reason: {reason}. Time remaining: {AccountBanHelper.FormatDuration(RemainingSeconds)}. Expires: {expiresAt:yyyy-MM-dd HH:mm:ss} UTC.";
    }
}

public static class AccountBanHelper
{
    private const int MaxStoredIdentityKeys = 32;
    private static readonly char[] IdentitySeparators = [','];

    public static IReadOnlyCollection<string> BuildIdentityKeys(IEnumerable<string?> deviceValues, string? ipAddress)
    {
        var keys = new HashSet<string>(StringComparer.Ordinal);

        foreach (var value in deviceValues)
        {
            var key = CreateDeviceIdentityKey(value);
            if (!string.IsNullOrWhiteSpace(key)) keys.Add(key);
        }

        var ipKey = CreateIpIdentityKey(ipAddress);
        if (!string.IsNullOrWhiteSpace(ipKey)) keys.Add(ipKey);

        return keys;
    }

    public static string? CreateDeviceIdentityKey(string? value)
    {
        var normalized = NormalizeDeviceValue(value);
        return string.IsNullOrWhiteSpace(normalized) ? null : "device:" + HashIdentity(normalized);
    }

    public static string? CreateIpIdentityKey(string? ipAddress)
    {
        var normalized = NormalizeIpAddress(ipAddress);
        return string.IsNullOrWhiteSpace(normalized) ? null : "ip:" + HashIdentity(normalized);
    }

    public static string MergeIdentityKeys(string? existingIdentityKeys, IEnumerable<string>? newIdentityKeys)
    {
        var merged = ParseIdentityKeys(existingIdentityKeys)
            .Concat(NormalizeIdentityKeys(newIdentityKeys))
            .Distinct(StringComparer.Ordinal)
            .TakeLast(MaxStoredIdentityKeys)
            .ToList();

        return string.Join(",", merged);
    }

    public static IReadOnlyCollection<string> ParseIdentityKeys(string? identityKeys)
    {
        if (string.IsNullOrWhiteSpace(identityKeys))
            return [];

        return identityKeys
            .Split(IdentitySeparators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(IsIdentityKey)
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }

    public static bool TryGetActiveBan(AccountData account, IEnumerable<string>? identityKeys,
        out AccountBanStatus status)
    {
        status = account.GetBanStatus();
        if (status.IsActive)
            return true;

        return TryFindActiveBanByIdentityKeys(identityKeys, account.Uid, out status);
    }

    public static bool TryFindActiveBanByIdentityKeys(IEnumerable<string>? identityKeys, int? excludeUid,
        out AccountBanStatus status)
    {
        status = AccountBanStatus.Inactive;
        var currentKeys = NormalizeIdentityKeys(identityKeys).ToHashSet(StringComparer.Ordinal);
        if (currentKeys.Count == 0)
            return false;

        var accounts = DatabaseHelper.GetAllInstanceFromMap<AccountData>() ??
                       DatabaseHelper.GetAllInstance<AccountData>() ?? [];
        foreach (var account in accounts.GroupBy(account => account.Uid).Select(group => group.First()))
        {
            if (excludeUid.HasValue && account.Uid == excludeUid.Value)
                continue;

            var accountBan = account.GetBanStatus(identityMatched: true);
            if (!accountBan.IsActive)
                continue;

            var knownKeys = ParseIdentityKeys(account.KnownIdentityKeys);
            if (!knownKeys.Any(currentKeys.Contains))
                continue;

            status = accountBan;
            return true;
        }

        return false;
    }

    public static bool TryFindAccountByIdentityKeys(IEnumerable<string>? identityKeys, string? mode,
        out AccountData account)
    {
        account = default!;
        var currentKeys = NormalizeIdentityKeys(identityKeys).ToHashSet(StringComparer.Ordinal);
        if (currentKeys.Count == 0)
            return false;

        var currentDeviceKeys = currentKeys.Where(IsDeviceIdentityKey).ToHashSet(StringComparer.Ordinal);
        var currentIpKeys = currentKeys.Where(IsIpIdentityKey).ToHashSet(StringComparer.Ordinal);
        var normalizedMode = string.IsNullOrWhiteSpace(mode) ? "DeviceOrIp" : mode.Trim();

        var accounts = DatabaseHelper.GetAllInstanceFromMap<AccountData>() ??
                       DatabaseHelper.GetAllInstance<AccountData>() ?? [];
        foreach (var candidate in accounts.GroupBy(candidate => candidate.Uid).Select(group => group.First()))
        {
            var knownKeys = ParseIdentityKeys(candidate.KnownIdentityKeys);
            if (knownKeys.Count == 0)
                continue;

            var knownDeviceKeys = knownKeys.Where(IsDeviceIdentityKey).ToHashSet(StringComparer.Ordinal);
            var knownIpKeys = knownKeys.Where(IsIpIdentityKey).ToHashSet(StringComparer.Ordinal);
            var matched = normalizedMode switch
            {
                "DeviceOnly" => currentDeviceKeys.Count > 0 && knownDeviceKeys.Any(currentDeviceKeys.Contains),
                "DeviceAndIp" => currentDeviceKeys.Count > 0 &&
                                 currentIpKeys.Count > 0 &&
                                 knownDeviceKeys.Any(currentDeviceKeys.Contains) &&
                                 knownIpKeys.Any(currentIpKeys.Contains),
                _ => knownKeys.Any(currentKeys.Contains)
            };

            if (!matched)
                continue;

            account = candidate;
            return true;
        }

        return false;
    }

    public static string FormatDuration(long totalSeconds)
    {
        totalSeconds = Math.Max(0, totalSeconds);
        if (totalSeconds == 0) return "0 seconds";

        var remaining = TimeSpan.FromSeconds(totalSeconds);
        var parts = new List<string>();

        if (remaining.Days > 0) parts.Add($"{remaining.Days} day{Plural(remaining.Days)}");
        if (remaining.Hours > 0) parts.Add($"{remaining.Hours} hour{Plural(remaining.Hours)}");
        if (remaining.Minutes > 0) parts.Add($"{remaining.Minutes} minute{Plural(remaining.Minutes)}");
        if (parts.Count == 0 || remaining.Seconds > 0) parts.Add($"{remaining.Seconds} second{Plural(remaining.Seconds)}");

        return string.Join(", ", parts.Take(3));
    }

    public static BlackInfo ToBlackInfo(AccountBanStatus banStatus)
    {
        var now = Extensions.GetUnixSec();
        return new BlackInfo
        {
            BeginTime = banStatus.CreatedAt > 0 ? banStatus.CreatedAt : now,
            EndTime = banStatus.IsPermanent ? 0 : Math.Max(0, banStatus.ExpireAt),
            LimitLevel = 0,
            BanType = 1
        };
    }

    private static IEnumerable<string> NormalizeIdentityKeys(IEnumerable<string>? identityKeys)
    {
        return (identityKeys ?? [])
            .Where(IsIdentityKey)
            .Distinct(StringComparer.Ordinal);
    }

    private static bool IsIdentityKey(string? key)
    {
        return IsDeviceIdentityKey(key) || IsIpIdentityKey(key);
    }

    private static bool IsDeviceIdentityKey(string? key)
    {
        return !string.IsNullOrWhiteSpace(key) &&
               key.StartsWith("device:", StringComparison.Ordinal);
    }

    private static bool IsIpIdentityKey(string? key)
    {
        return !string.IsNullOrWhiteSpace(key) &&
               key.StartsWith("ip:", StringComparison.Ordinal);
    }

    private static string? NormalizeDeviceValue(string? value)
    {
        value = value?.Trim();
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (value.Length > 512)
            value = value[..512];

        var lowered = value.ToLowerInvariant();
        return lowered is "null" or "undefined" or "unknown" or "{}" or "[]" ? null : lowered;
    }

    private static string? NormalizeIpAddress(string? ipAddress)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
            return null;

        ipAddress = ipAddress.Trim();
        if (!IPAddress.TryParse(ipAddress, out var parsed))
            return null;

        if (parsed.IsIPv4MappedToIPv6)
            parsed = parsed.MapToIPv4();

        return parsed.ToString().ToLowerInvariant();
    }

    private static string HashIdentity(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToBase64String(hash);
    }

    private static string Plural(int value)
    {
        return value == 1 ? string.Empty : "s";
    }
}
