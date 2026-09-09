using System.Globalization;

namespace March7thHoney.Util;

public static class DurationParser
{
    public const long MaxDurationSeconds = 86400L * 3650;

    public static bool TryParseSeconds(string? value, out long seconds)
    {
        seconds = 0;
        if (string.IsNullOrWhiteSpace(value)) return false;

        var normalized = value.Trim().ToLowerInvariant();
        var parts = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        string numberPart;
        string unitPart;

        if (parts.Length == 1)
        {
            SplitNumberAndUnit(parts[0], out numberPart, out unitPart);
        }
        else if (parts.Length == 2)
        {
            numberPart = parts[0];
            unitPart = parts[1];
        }
        else
        {
            return false;
        }

        if (!double.TryParse(numberPart, NumberStyles.Float, CultureInfo.InvariantCulture, out var amount) ||
            amount <= 0)
            return false;

        var multiplier = GetUnitMultiplier(unitPart);
        if (multiplier <= 0) return false;

        var totalSeconds = amount * multiplier;
        if (double.IsInfinity(totalSeconds) || double.IsNaN(totalSeconds) || totalSeconds < 1 ||
            totalSeconds > MaxDurationSeconds)
            return false;

        seconds = (long)Math.Ceiling(totalSeconds);
        return true;
    }

    public static bool IsDurationUnit(string value)
    {
        return GetUnitMultiplier(value.Trim().ToLowerInvariant()) > 0;
    }

    public static string FormatSeconds(long seconds)
    {
        if (seconds <= 0) return "0s";
        if (seconds % 604800 == 0) return $"{seconds / 604800}w";
        if (seconds % 86400 == 0) return $"{seconds / 86400}d";
        if (seconds % 3600 == 0) return $"{seconds / 3600}h";
        if (seconds % 60 == 0) return $"{seconds / 60}m";

        return $"{seconds}s";
    }

    private static void SplitNumberAndUnit(string value, out string numberPart, out string unitPart)
    {
        var index = 0;
        while (index < value.Length && (char.IsDigit(value[index]) || value[index] == '.')) index++;

        numberPart = value[..index];
        unitPart = value[index..];
    }

    private static long GetUnitMultiplier(string unit)
    {
        return unit switch
        {
            "" or "s" or "sec" or "secs" or "second" or "seconds" => 1,
            "m" or "min" or "mins" or "minute" or "minutes" => 60,
            "h" or "hr" or "hrs" or "hour" or "hours" => 3600,
            "d" or "day" or "days" => 86400,
            "w" or "week" or "weeks" => 604800,
            _ => 0
        };
    }
}
