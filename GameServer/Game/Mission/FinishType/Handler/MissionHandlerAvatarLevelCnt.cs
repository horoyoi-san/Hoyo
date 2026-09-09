using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.AvatarLevelCnt)]
public class MissionHandlerAvatarLevelCnt : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        // this type wont be used in mission
        await ValueTask.CompletedTask;
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        var avatarCount = 0;
        foreach (var avatar in player.AvatarManager?.Data.FormalAvatars ?? [])
            if (avatar.Level >= excel.ParamInt1)
                avatarCount++;

        await player.QuestManager!.UpdateQuestProgress(quest.QuestID, avatarCount);
    }
}
