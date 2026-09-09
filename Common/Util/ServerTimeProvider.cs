using System.Globalization;
using March7thHoney.Database.Player;

namespace March7thHoney.Util;

public static class ServerTimeProvider
{
    private static readonly string[] DateInputFormats = ["yyyyMMdd", "yyyy-MM-dd"];

    public static long GetServerUnixSec(PlayerData? data = null)
    {
        var fixedDate = GetFixedLocalDate(data);
        return fixedDate.HasValue
            ? new DateTimeOffset(fixedDate.Value).ToUnixTimeSeconds()
            : DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    }

    public static long GetServerUnixMs(PlayerData? data = null)
    {
        var fixedDate = GetFixedLocalDate(data);
        return fixedDate.HasValue
            ? new DateTimeOffset(fixedDate.Value).ToUnixTimeMilliseconds()
            : DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }

    public static bool TryParseDateInput(string? input, out int dateStamp)
    {
        dateStamp = 0;
        if (string.IsNullOrWhiteSpace(input)) return false;

        if (!DateTime.TryParseExact(input.Trim(), DateInputFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed))
            return false;

        dateStamp = parsed.Year * 10000 + parsed.Month * 100 + parsed.Day;
        return true;
    }

    public static bool TryGetDate(int dateStamp, out DateTime date)
    {
        date = default;
        if (dateStamp <= 0) return false;

        return DateTime.TryParseExact(dateStamp.ToString("00000000", CultureInfo.InvariantCulture), "yyyyMMdd",
            CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
    }

    // Per-account fake time wins over the global config; null means "use the real clock".
    private static DateTime? GetFixedLocalDate(PlayerData? data)
    {
        if (data is { FakeTimeDate: > 0 } && TryGetDate(data.FakeTimeDate, out var accountDate)) return accountDate;

        if (!ConfigManager.Config.ServerOption.ServerTime.EnableFakeServerTime) return null;

        return GetGlobalFixedLocalDate();
    }

    private static DateTime GetGlobalFixedLocalDate()
    {
        var fixedDate = ConfigManager.Config.ServerOption.ServerTime.FixedDate?.Trim();
        if (string.IsNullOrWhiteSpace(fixedDate) ||
            fixedDate.Equals("today", StringComparison.OrdinalIgnoreCase))
            return DateTime.Today;

        if (DateTime.TryParseExact(
                fixedDate,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var parsed))
            return parsed.Date;

        if (DateTime.TryParse(fixedDate, out parsed)) return parsed.Date;

        return DateTime.Today;
    }
}
