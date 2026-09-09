using March7thHoney.Data;
using March7thHoney.Database.Inventory;
using March7thHoney.GameServer.Server.Packet.Send.RollShop;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.RollShop;

[Opcode(CmdIds.DoGachaInRollShopCsReq)]
public class HandlerDoGachaInRollShopCsReq : Handler<DoGachaInRollShopCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, DoGachaInRollShopCsReq req)
    {
        ItemList itemList = new();
        var count = req.GachaCount;
        uint maxtype = 3;
        for (uint i = 0; i < count; i++)
        {
            Dictionary<uint, uint> GroupIds = new();
            Dictionary<uint, uint> RewardIds = new();

            GameData.RollShopConfigData.Values.ToList().ForEach(x =>
            {
                if (x.RollShopID == req.RollShopId)
                {
                    GroupIds.Add(x.T1GroupID, 1);
                    GroupIds.Add(x.T2GroupID, 2);
                    GroupIds.Add(x.T3GroupID, 3);
                    GroupIds.Add(x.T4GroupID, 4);
                }
            });
            GameData.RollShopRewardData.Values.ToList().ForEach(x =>
            {
                GroupIds.Keys.ToList().ForEach(y =>
                {
                    if (x.GroupID == y) RewardIds.Add(x.RewardID, GroupIds[y]);
                });
            });
            var RewardId = RewardIds.Keys.ToList().RandomElement();
            var type = RewardIds[RewardId];
            if (type < maxtype) maxtype = type;
            var rewardExcel = GameData.RewardDataData[(int)RewardId];
            var rewardItems = rewardExcel.GetItems();
            var itemData = new ItemData
            {
                ItemId = rewardItems[0].Item1,
                Count = rewardItems[0].Item2
            };
            var rsp = await player.InventoryManager!.AddItem(itemData.ItemId, itemData.Count);
            if (rsp != null) itemList.ItemList_.Add(rsp.ToProto());
            await player.InventoryManager!.RemoveItem(122000, 1);
        }

        await connection.SendPacket(new PacketDoGachaInRollShopScRsp(req.RollShopId, itemList, maxtype));
    }
}
