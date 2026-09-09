using March7thHoney.Data;
using March7thHoney.Database.Activity;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Game.Sync;
using March7thHoney.GameServer.Server.Packet.Send.Activity;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Activity;

[Opcode(CmdIds.TakeTrialActivityRewardCsReq)]
public class HandlerTakeTrialActivityRewardCsReq : Handler<TakeTrialActivityRewardCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, TakeTrialActivityRewardCsReq req)
    {
        GameData.AvatarDemoConfigData.TryGetValue((int)req.StageId, out var stage);
        if (stage != null)
        {
            GameData.RewardDataData.TryGetValue(stage.RewardID, out var reward);
            var itemList = new List<ItemData>();
            foreach (var i in reward?.GetItems() ?? [])
            {
                var res = await player.InventoryManager!.AddItem(i.Item1, i.Item2, false);
                if (res != null) itemList.Add(res);
            }
            var activities = player.ActivityManager!.Data.TrialActivityData.Activities;
            var activity = activities.Find(x => x.StageId == req.StageId);
            if (activity != null)
                activities[activities.FindIndex(x => x.StageId == req.StageId)] = new TrialActivityResultData
                {
                    StageId = (int)req.StageId,
                    TakenReward = true
                };
            player.Data.Hcoin += reward!.Hcoin;

            var syncData = new List<BaseSyncData> { new BasicInfoSyncData(player.ToProto()) };
            syncData.AddRange(itemList.Select(i => new ItemSyncData(i)));
            await player.SendPacket(new PacketPlayerSyncScNotify(syncData));
            await player.SendPacket(new PacketScenePlaneEventScNotify(itemList));
            await connection.SendPacket(new PacketTakeTrialActivityRewardScRsp(req.StageId, itemList));
        }
    }
}
