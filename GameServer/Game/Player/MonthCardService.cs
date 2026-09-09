using March7thHoney.Database;
using March7thHoney.Database.Inventory;
using March7thHoney.Database.Player;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Player;

public static class MonthCardService
{
    private const int RewardItemId = 1;
    private const int DailyRewardAmount = 90;
    private const int DefaultActiveDays = 30;

    public static long GetMonthCardOutDateTime(PlayerData data)
    {
        if (!ConfigManager.Config.ServerOption.EnableMonthCard) return 0;

        var now = ServerTimeProvider.GetServerUnixSec(data);
        if (data.MonthCardExpireTime > now) return data.MonthCardExpireTime;

        data.MonthCardExpireTime = now + (long)TimeSpan.FromDays(DefaultActiveDays).TotalSeconds;
        DatabaseHelper.MarkDirty(data.Uid);
        return data.MonthCardExpireTime;
    }

    public static bool TryClaimDailyReward(PlayerData data, out ItemData reward)
    {
        reward = null!;
        var monthCardOutDateTime = GetMonthCardOutDateTime(data);
        if (monthCardOutDateTime <= 0) return false;

        var now = ServerTimeProvider.GetServerUnixSec(data);
        if (monthCardOutDateTime <= now) return false;

        var today = GetLocalDayStamp(now);
        if (data.LastMonthCardRewardDate == today) return false;

        data.LastMonthCardRewardDate = today;
        DatabaseHelper.MarkDirty(data.Uid);
        reward = new ItemData
        {
            ItemId = RewardItemId,
            Count = DailyRewardAmount
        };
        return true;
    }

    private static int GetLocalDayStamp(long unixSeconds)
    {
        var localDate = DateTimeOffset.FromUnixTimeSeconds(unixSeconds).ToLocalTime().Date;
        return localDate.Year * 10000 + localDate.Month * 100 + localDate.Day;
    }
}
