using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.EnterMapByEntrance)]
public class MissionHandlerEnterMapByEntrance : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        if (arg is MapEntranceExcel v)
            if (v.ID == info.ParamInt1)
                await player.MissionManager!.FinishSubMission(info.ID);
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        // this type wont be used in quest
        if (arg is MapEntranceExcel v)
            if (v.ID == excel.ParamInt1)
                await player.QuestManager!.AddQuestProgress(quest.QuestID, 1);
    }
}
