using March7thHoney.Database.Inventory;
using March7thHoney.Database.Quests;
using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.GameServer.Server.Packet.Send.Quest;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Quest;

[Opcode(CmdIds.TakeQuestRewardCsReq)]
public class HandlerTakeQuestRewardCsReq : Handler<EMHALMBFHKG>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, EMHALMBFHKG req)
    {
        List<ItemData> rewardItems = [];
        var firstError = Retcode.RetSucc;
        List<int> succQuestIds = [];
        List<QuestInfo> refreshQuestList = [];

        foreach (var quest in req.ODJIJFJCHHB)
        {
            var (retCode, items) = await player.QuestManager!.TakeQuestReward((int)quest);
            if (retCode != Retcode.RetSucc)
            {
                if (firstError == Retcode.RetSucc) firstError = retCode;
                if (player.QuestManager!.Data.Quests.TryGetValue((int)quest, out var questInfo))
                    refreshQuestList.Add(questInfo);
            }
            else
                succQuestIds.Add((int)quest);

            if (items != null) rewardItems.AddRange(items);
        }

        if (refreshQuestList.Count > 0)
            await connection.SendPacket(new PacketPlayerSyncScNotify(refreshQuestList));

        var ret = succQuestIds.Count > 0 ? Retcode.RetSucc : firstError;
        await connection.SendPacket(new PacketTakeQuestRewardScRsp(ret, rewardItems, succQuestIds));
    }
}
