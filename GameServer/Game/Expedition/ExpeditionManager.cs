using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;
using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.Database;
using March7thHoney.Database.Expedition;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Expedition;

public class ExpeditionManager : BasePlayerManager<ExpeditionData>
{
    private const int ExpeditionRefreshDelaySec = 300;
    private const int MaxExpeditionTeamCount = 4;
    private readonly List<uint> _activeExpeditionIds = [];

    public ExpeditionManager(PlayerInstance player) : base(player)
    {
        if (Data.ActiveExpeditionIds.Count > 0) _activeExpeditionIds.AddRange(Data.ActiveExpeditionIds);
    }

    public long GetRefreshTime()
    {
        return Data.RefreshTime;
    }

    public uint GetTotalExpeditionCount()
    {
        return MaxExpeditionTeamCount;
    }

    public IReadOnlyList<uint> GetAllExpeditionIds()
    {
        return GameData.ExpeditionDataData.Keys
            .OrderBy(id => id)
            .Select(id => (uint)id)
            .ToList();
    }

    public IEnumerable<ExpeditionInfo> GetActiveExpeditionInfo()
    {
        return _activeExpeditionIds.Select(id => new ExpeditionInfo
        {
            Id = id
        });
    }

    public List<ExpeditionInfo> AcceptMultipleExpedition(IEnumerable<ExpeditionInfo> requested)
    {
        var validIds = GetAllExpeditionIds().ToHashSet();
        var next = requested
            .Select(x => x.Id)
            .Where(id => validIds.Contains(id))
            .Distinct()
            .Take(MaxExpeditionTeamCount)
            .ToList();

        if (next.Count == 0) return GetActiveExpeditionInfo().ToList();

        _activeExpeditionIds.Clear();
        _activeExpeditionIds.AddRange(next);
        Data.ActiveExpeditionIds = _activeExpeditionIds.ToList();
        Data.RefreshTime = Extensions.GetUnixSec() + ExpeditionRefreshDelaySec;
        MarkDirty();

        return _activeExpeditionIds.Select(id => new ExpeditionInfo { Id = id }).ToList();
    }

    public bool CanTakeRewardNow()
    {
        return Data.RefreshTime > 0 && Extensions.GetUnixSec() >= Data.RefreshTime;
    }

    public List<ItemData> BuildTakeRewardItems()
    {
        List<ItemData> rewards = [];
        foreach (var expeditionId in _activeExpeditionIds)
        {
            if (!GameData.ExpeditionRewardData.TryGetValue((int)expeditionId, out var rewardRows)) continue;
            var rewardRow = rewardRows.OrderBy(x => x.Duration).FirstOrDefault();
            if (rewardRow == null) continue;

            if (!GameData.RewardDataData.TryGetValue(rewardRow.RewardID, out var reward)) continue;

            if (reward.Hcoin > 0)
                rewards.Add(new ItemData
                {
                    ItemId = 1,
                    Count = reward.Hcoin
                });

            foreach (var (itemId, count) in reward.GetItems())
                rewards.Add(new ItemData
                {
                    ItemId = itemId,
                    Count = count
                });
        }

        return rewards;
    }

    public void MarkRewardTaken()
    {
        Data.RefreshTime = Extensions.GetUnixSec() + ExpeditionRefreshDelaySec;
        MarkDirty();
    }
}
