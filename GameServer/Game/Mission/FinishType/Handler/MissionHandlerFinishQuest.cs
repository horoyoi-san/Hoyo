using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.FinishQuest)]
public class MissionHandlerFinishQuest : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        // this type wont be used in mission
        await ValueTask.CompletedTask;
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        var questCount = 0;
        foreach (var qid in excel.ParamIntList)
        {
            var status = player.QuestManager?.GetQuestStatus(qid);
            if (status == QuestStatus.QuestFinish || status == QuestStatus.QuestClose)
                questCount++;
        }

        await player.QuestManager!.UpdateQuestProgress(quest.QuestID, questCount);
    }
}
