using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.ItemNum)]
public class MissionHandlerItemNum : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        var count = 0;
        var item = player.InventoryManager?.GetItem(info.ParamInt1);
        if (item != null) count += item.Count;

        // Progress is a floor, not an exact match: this handler only re-evaluates on item events, so a
        // single grant that overshoots (bundle reward, /give, multi-item drop) would otherwise miss the
        // gate permanently — the count never comes back down to exactly Progress unless the player
        // spends the items. Matches the sibling UseItem / SubMissionFinishCnt handlers.
        if (count >= info.Progress)
        {
            await player.MissionManager!.FinishSubMission(info.ID);
        }
        else
        {
            if (player.MissionManager?.GetMissionProgress(info.ID) != count)
                await player.MissionManager!.SetMissionProgress(info.ID, count);
        }
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        var count = 0;
        var item = player.InventoryManager?.GetItem(excel.ParamInt1);
        if (item != null) count += item.Count;

        await player.QuestManager!.UpdateQuestProgress(quest.QuestID, count);
    }
}
