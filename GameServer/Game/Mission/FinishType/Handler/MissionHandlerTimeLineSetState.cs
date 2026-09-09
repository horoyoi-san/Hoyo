using System.Text;
using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.TimeLineSetState)]
public class MissionHandlerTimeLineSetState : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        var floorId = info.LevelFloorID;
        var groupId = info.ParamInt1;
        var propId = info.ParamInt2;
        var value = info.ParamStr1;

        var data = player.GetScenePropTimelineData(floorId, groupId, propId); // get data

        if (data == null) return;
        // compare
        if (Encoding.UTF8.GetString(Convert.FromBase64String(data.ByteValue)) != value) return;

        await player.MissionManager!.FinishSubMission(info.ID);
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        var floorId = excel.MazeFloorID;
        var groupId = excel.ParamInt1;
        var propId = excel.ParamInt2;
        var value = excel.ParamStr1;

        var data = player.GetScenePropTimelineData(floorId, groupId, propId); // get data

        if (data == null) return;
        // compare
        if (Encoding.UTF8.GetString(Convert.FromBase64String(data.ByteValue)) != value) return;

        await player.QuestManager!.AddQuestProgress(excel.ID, 1);
    }
}
