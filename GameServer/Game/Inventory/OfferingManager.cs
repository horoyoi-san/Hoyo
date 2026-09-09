using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Offering;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Inventory;

public class OfferingManager(PlayerInstance player) : BasePlayerManager<OfferingData>(player)
{
    public OfferingTypeData? GetOfferingData(int offeringId)
    {
        if (Data.Offerings.TryGetValue(offeringId, out var offeringData)) return offeringData;

        var gameData = GameData.OfferingTypeConfigData.GetValueOrDefault(offeringId); // create a new one
        if (gameData == null) return null;

        var unlockId = gameData.UnlockID;
        var data = new OfferingTypeData
        {
            OfferingId = offeringId,
            State = OfferingState.Lock
        };

        if (Player.QuestManager!.UnlockHandler.GetUnlockStatus(unlockId)) data.State = OfferingState.Open;

        Data.Offerings[offeringId] = data;

        return data;
    }

    public async ValueTask UpdateOfferingData()
    {
        List<OfferingTypeData> syncData = [];
        foreach (var offering in Data.Offerings.Values)
        {
            var gameData = GameData.OfferingTypeConfigData.GetValueOrDefault(offering.OfferingId); // create a new one
            if (gameData == null) continue;

            if (Player.QuestManager!.UnlockHandler.GetUnlockStatus(gameData.UnlockID) &&
                offering.State != OfferingState.Open)
            {
                offering.State = OfferingState.Open;
                syncData.Add(offering);
                continue;
            }

            if (Player.QuestManager!.UnlockHandler.GetUnlockStatus(gameData.UnlockID) ||
                offering.State == OfferingState.Lock) continue;

            offering.State = OfferingState.Lock;
            syncData.Add(offering);
        }

        foreach (var data in syncData) await Player.SendPacket(new PacketOfferingInfoScNotify(data));
    }

    public async ValueTask<(Retcode, OfferingTypeData? data)> SubmitOfferingItem(int offeringId)
    {
        var offering = GetOfferingData(offeringId);
        if (offering is not { State: OfferingState.Open }) return (Retcode.RetOfferingNotUnlock, null);

        var gameData = GameData.OfferingTypeConfigData.GetValueOrDefault(offeringId);
        if (gameData == null) return (Retcode.RetOfferingNotUnlock, null);

        if (offering.Level >= gameData.MaxLevel) return (Retcode.RetOfferingReachMaxLevel, offering);

        var item = Player.InventoryManager!.GetItem(gameData.ItemID);
        if (item is not { Count: >= 1 }) return (Retcode.RetOfferingItemNotEnough, offering);

        var exp = item.Count;
        while (true)
        {
            if (offering.Level >= gameData.MaxLevel) break;
            var config = GameData.OfferingLevelConfigData.GetValueOrDefault(offeringId)
                ?.GetValueOrDefault(offering.Level + 1);
            if (config == null) break;

            if (exp + offering.CurExp < config.ItemCost)
            {
                offering.CurExp += exp;
                exp = 0;
                break;
            }

            exp -= config.ItemCost - offering.CurExp;
            offering.Level++;
            offering.CurExp = 0;
        }

        await Player.InventoryManager!.RemoveItem(item.ItemId, item.Count - exp);

        return (Retcode.RetSucc, offering);
    }

    public async ValueTask<(Retcode, OfferingTypeData? data, List<ItemData> reward)> TakeOfferingReward(int offeringId,
        List<int> takeList)
    {
        var offering = GetOfferingData(offeringId);
        if (offering is not { State: OfferingState.Open }) return (Retcode.RetOfferingNotUnlock, null, []);

        var gameData = GameData.OfferingTypeConfigData.GetValueOrDefault(offeringId);
        if (gameData == null) return (Retcode.RetOfferingNotUnlock, offering, []);

        List<int> rewardIdList = [];
        foreach (var excel in takeList.Select(take =>
                     GameData.OfferingLevelConfigData.GetValueOrDefault(offeringId)?.GetValueOrDefault(take)))
            if (excel != null && excel.Level <= offering.Level && !offering.TakenReward.Contains(excel.Level))
                rewardIdList.Add(excel.RewardID);
            else
                return (Retcode.RetOfferingLevelNotUnlock, offering, []);

        offering.TakenReward.AddRange(takeList);
        List<ItemData> reward = [];
        foreach (var id in rewardIdList) reward.AddRange(await Player.InventoryManager!.HandleReward(id, sync: false));

        await Player.SendPacket(new PacketPlayerSyncScNotify(reward));

        return (Retcode.RetSucc, offering, reward);
    }
}
