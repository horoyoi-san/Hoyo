using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

// 客户端解锁「漫游签证 → 异相仲裁」依赖一组前置 Quest，
// 它们的 FinishWay 是 SpecificChallengeFloorGetStars（如混沌回忆12层3星等）。
// 这里仅用于解锁入口，不写入/修改任何挑战历史星级数据。
[MissionFinishType(MissionFinishTypeEnum.SpecificChallengeFloorGetStars)]
public class MissionHandlerSpecificChallengeFloorGetStars : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        await ValueTask.CompletedTask;
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        await player.QuestManager!.UpdateQuestProgress(quest.QuestID, excel.Progress);
    }
}
