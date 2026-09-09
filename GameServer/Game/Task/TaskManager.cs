using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Task.AvatarTask;

namespace March7thHoney.GameServer.Game.Task;

public class TaskManager(PlayerInstance player) : BasePlayerManager(player)
{
    public PerformanceTrigger PerformanceTrigger { get; } = new(player);
    public LevelTask LevelTask { get; } = new(player);
    public SummonUnitLevelTask SummonUnitLevelTask { get; } = new();
    public AbilityLevelTask AbilityLevelTask { get; } = new(player);
    public MissionTaskTrigger MissionTaskTrigger { get; } = new(player);
    public SceneTaskTrigger SceneTaskTrigger { get; } = new(player);
}
