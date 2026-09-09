using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.AllAvatarPromoteCnt)]
public class MissionHandlerAllAvatarPromoteCnt : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        // this type wont be used in mission
        await ValueTask.CompletedTask;
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        var promoteCount = 0;
        foreach (var avatar in player.AvatarManager?.Data.FormalAvatars ?? []) promoteCount += avatar.Promotion;
        await player.QuestManager!.UpdateQuestProgress(quest.QuestID, promoteCount);
    }
}
