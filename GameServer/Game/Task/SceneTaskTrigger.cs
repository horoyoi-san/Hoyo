using March7thHoney.Data;
using March7thHoney.Data.Excel;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene;

namespace March7thHoney.GameServer.Game.Task;

public class SceneTaskTrigger(PlayerInstance player)
{
    public PlayerInstance Player { get; } = player;

    public void TriggerFloor(int planeId, int floorId, SceneInstance? scene)
    {
        if (scene == null) return;
        GameData.GetFloorInfo(planeId, floorId, out var floor);
        if (floor == null) return;

        foreach (var group in floor.Groups.Values)
        {
            if (!scene.Groups.Contains(group.Id)) continue; // only run level graphs for groups actually loaded in this scene
            if (group.LevelGraphConfig == null) continue;
            foreach (var task in group.LevelGraphConfig.OnInitSequece)
                Player.TaskManager?.LevelTask.TriggerInitAct(task, new SubMissionData(0), group);

            foreach (var task in group.LevelGraphConfig.OnStartSequece)
                Player.TaskManager?.LevelTask.TriggerStartAct(task, new SubMissionData(0), group);
        }
    }

    public void TriggerGroup(int planeId, int floorId, int groupId)
    {
        GameData.GetFloorInfo(planeId, floorId, out var floor);
        if (floor == null) return;
        if (floor.Groups.TryGetValue(groupId, out var group))
        {
            if (group.LevelGraphConfig == null) return;
            foreach (var task in group.LevelGraphConfig.OnInitSequece)
                Player.TaskManager?.LevelTask.TriggerInitAct(task, new SubMissionData(0), group);

            foreach (var task in group.LevelGraphConfig.OnStartSequece)
                Player.TaskManager?.LevelTask.TriggerStartAct(task, new SubMissionData(0), group);
        }
    }
}
