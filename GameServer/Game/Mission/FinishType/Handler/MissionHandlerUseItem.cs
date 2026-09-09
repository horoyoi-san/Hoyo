using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Inventory;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.UseItem)]
public class MissionHandlerUseItem : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        if (arg is ItemData item)
            if (info.ParamInt1 == item.ItemId)
                await player.MissionManager!.AddMissionProgress(info.ID, 1);

        if (player.MissionManager!.GetMissionProgress(info.ID) >= info.Progress)
            await player.MissionManager!.FinishSubMission(info.ID);
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        // this type wont be used in quest
        if (arg is ItemData item)
            if (excel.ParamInt1 == item.ItemId)
                await player.QuestManager!.AddQuestProgress(quest.QuestID, 1);
    }
}
