using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishAction.Handler;

[MissionFinishAction(FinishActionTypeEnum.delMission)]
public class MissionHandlerDelMission : MissionFinishActionHandler
{
    public override async ValueTask OnHandle(List<int> @params, List<string> paramString, PlayerInstance player)
    {
        if (@params.Count < 1) return;
        var missionId = @params[0];
        await player.MissionManager!.FinishSubMission(missionId);
    }
}
