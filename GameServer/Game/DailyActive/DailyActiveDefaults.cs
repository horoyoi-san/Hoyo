using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.DailyActive;

public static class DailyActiveDefaults
{
    // Fallback cap when the config table is empty.
    public const uint FallbackMaxPoint = 500;

    public static List<DailyActivityInfo> CreateLevels(int worldLevel, bool isHasTaken)
    {
        return GetRows(worldLevel)
            .OrderBy(row => row.Level)
            .Select(row => new DailyActivityInfo
            {
                Level = (uint)row.Level,
                WorldLevel = (uint)row.WorldLevel,
                DailyActivePoint = (uint)row.DailyActivePoint,
                IsHasTaken = isHasTaken
            })
            .ToList();
    }

    public static uint GetMaxPoint(int worldLevel)
    {
        var rows = GetRows(worldLevel);
        return rows.Count > 0 ? (uint)rows.Max(row => row.DailyActivePoint) : FallbackMaxPoint;
    }

    public static IEnumerable<uint> GetQuestIds()
    {
        return GameData.DailyActiveQuestPoolData.Keys.Select(id => (uint)id);
    }

    private static List<DailyActiveConfigExcel> GetRows(int worldLevel)
    {
        var clamped = Math.Clamp(worldLevel, 0, 6);
        if (GameData.DailyActiveConfigData.TryGetValue(clamped, out var rows) && rows.Count > 0) return rows;
        if (GameData.DailyActiveConfigData.TryGetValue(0, out var fallback)) return fallback;
        return [];
    }
}
