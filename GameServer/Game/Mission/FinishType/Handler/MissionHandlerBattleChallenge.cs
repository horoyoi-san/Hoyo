using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.BattleChallenge)]
public class MissionHandlerBattleChallenge : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        // this type wont be used in mission
        await ValueTask.CompletedTask;
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        if (arg is BattleInstance instance)
        {
            var progress = 0;
            if (instance.BattleResult == null) return;
            foreach (var battleTargetList in instance.BattleResult.Stt.BattleTargetInfo.Values)
            foreach (var battleTarget in battleTargetList.BattleTargetList_)
                if (excel.ParamIntList.Contains((int)battleTarget.Id))
                    progress += (int)battleTarget.Progress;

            await player.QuestManager!.UpdateQuestProgress(quest.QuestID, progress);
        }
    }
}
