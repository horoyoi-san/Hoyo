using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.AvatarRankUp)]
public class MissionHandlerAvatarRankUp : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        // this type wont be used in mission
        await ValueTask.CompletedTask;
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        foreach (var avatarId in excel.ParamIntList)
        {
            var avatar = player.AvatarManager?.GetFormalAvatar(avatarId);
            if (avatar != null && avatar.GetPathInfo(avatarId)?.Rank > 0)
                await player.QuestManager!.AddQuestProgress(quest.QuestID, 1);
        }
    }
}
