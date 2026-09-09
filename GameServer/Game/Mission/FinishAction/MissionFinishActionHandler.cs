using March7thHoney.GameServer.Game.Player;

namespace March7thHoney.GameServer.Game.Mission.FinishAction;

public abstract class MissionFinishActionHandler
{
    public abstract ValueTask OnHandle(List<int> @params, List<string> paramString, PlayerInstance player);
}
