using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.RaidFinishCnt)]
public class MissionHandlerRaidFinishCnt : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        var finishCount =
            (info.ParamIntList ?? []).Count(raidId => player.RaidManager!.GetRaidStatus(raidId) == RaidStatus.Finish);

        if (finishCount >= info.Progress) await player.MissionManager!.FinishSubMission(info.ID);
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        // this type wont be used in quest
        var finishCount = excel.ParamIntList.Count(raidLevel =>
            player.RaidManager!.GetRaidStatus(excel.ParamInt1, raidLevel) == RaidStatus.Finish);

        await player.QuestManager!.UpdateQuestProgress(quest.QuestID, finishCount);
    }
}
