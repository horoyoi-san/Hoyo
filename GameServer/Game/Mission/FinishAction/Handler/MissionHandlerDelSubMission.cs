using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishAction.Handler;

[MissionFinishAction(FinishActionTypeEnum.delSubMission)]
public class MissionHandlerDelSubMission : MissionFinishActionHandler
{
    public override async ValueTask OnHandle(List<int> @params, List<string> paramString, PlayerInstance player)
    {
        if (@params.Count < 1) return;

        foreach (var subMissionId in @params)
        {
            await player.MissionManager!.AcceptSubMission(subMissionId);
            await player.MissionManager!.FinishSubMission(subMissionId);
        }
    }
}
