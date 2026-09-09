using March7thHoney.Data;

namespace March7thHoney.GameServer.Game.Inventory;

public partial class InventoryManager
{
    public async ValueTask HandlePlaneEvent(int eventId)
    {
        GameData.PlaneEventData.TryGetValue(eventId * 10 + Player.Data.WorldLevel, out var planeEvent);
        if (planeEvent == null) return;
        GameData.RewardDataData.TryGetValue(planeEvent.Reward, out var rewardData);
        foreach (var x in rewardData?.GetItems() ?? [])
            await AddItem(x.Item1, x.Item2);

        foreach (var id in planeEvent.DropList)
        {
            GameData.RewardDataData.TryGetValue(id, out var reward);
            foreach (var x in reward?.GetItems() ?? [])
                await AddItem(x.Item1, x.Item2);
        }
    }
}
