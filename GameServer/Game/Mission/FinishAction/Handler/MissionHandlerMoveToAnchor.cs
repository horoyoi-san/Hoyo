using March7thHoney.Enums.Mission;
using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishAction.Handler;

[MissionFinishAction(FinishActionTypeEnum.MoveToAnchor)]
public class MissionHandlerMoveToAnchor : MissionFinishActionHandler
{
    public override async ValueTask OnHandle(List<int> @params, List<string> paramString, PlayerInstance player)
    {
        var entryId = @params[0];
        var anchorGroup = @params[1];
        var anchorId = @params[2];
        await player.EnterSceneByEntranceId(entryId, anchorGroup, anchorId, true);
    }
}
