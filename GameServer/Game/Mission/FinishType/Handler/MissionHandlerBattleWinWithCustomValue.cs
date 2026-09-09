using March7thHoney.Data.Config;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Mission.FinishType.Handler;

[MissionFinishType(MissionFinishTypeEnum.BattleWinWithCustomValue)]
public class MissionHandlerBattleWinWithCustomValue : MissionFinishTypeHandler
{
    public override async ValueTask HandleMissionFinishType(PlayerInstance player, SubMissionInfo info, object? arg)
    {
        if (arg is not BattleInstance instance) return;
        if (!instance.StageId.ToString().StartsWith(info.ParamInt2.ToString())) return; // check stage id
        if (instance.BattleEndStatus != BattleEndStatus.BattleEndWin) return; // check battle status
        if (instance.BattleResult == null) return; // check battle result
        if (!instance.BattleResult.Stt.CustomValues.TryGetValue(info.ParamStr1, out var dValue))
            return; // check custom value is exist
        if ((int)dValue == info.ParamInt1) await player.MissionManager!.FinishSubMission(info.ID);
    }

    public override async ValueTask HandleQuestFinishType(PlayerInstance player, QuestDataExcel quest,
        FinishWayExcel excel, object? arg)
    {
        // this type wont be used in quest
        await ValueTask.CompletedTask;
    }
}
