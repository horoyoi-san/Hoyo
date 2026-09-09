using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType;

public abstract class MissionFinishTypeHandler
{
    public abstract ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg);

    public abstract ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest, FinishWayExcel excel,
        object? arg);
}
