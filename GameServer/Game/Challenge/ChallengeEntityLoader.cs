using March7thHoney.Data;
using March7thHoney.Data.Config.Scene;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Game.Challenge;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Challenge;

public class ChallengeEntityLoader(SceneInstance scene, PlayerInstance player) : SceneEntityLoader(scene)
{
    public PlayerInstance Player = player;

    public override async ValueTask LoadEntity()
    {
        if (Scene.IsLoaded) return;

        // Get challenge instance
        if (Player.ChallengeManager!.ChallengeInstance == null) return;
        var instance = Player.ChallengeManager.ChallengeInstance;
        // Tierce needs the current Scene to fall back when its declared MazeGroupID is missing
        // from the floor. SceneInstance's ctor runs LoadEntity before Player.SceneInstance is
        // assigned, so we hand the scene through here.
        if (instance is Instances.ChallengeTierceInstance tierce) tierce.ActiveScene = Scene;
        LoadGroups.SafeAddRange(Scene.FloorInfo!.Groups.Keys.ToList());

        // Setup first stage
        var stages = instance.GetStageMonsters();

        foreach (var stage in stages)
        {
            Scene.FloorInfo.Groups.TryGetValue(stage.Key, out var groupData);
            if (groupData != null) await LoadGroup(groupData);
        }

        Scene.LeaveEntryId = instance.Data.Case switch
        {
            // Set leave entry
            ChallengeStateCase.Boss => GameConstants.CHALLENGE_BOSS_ENTRANCE,
            ChallengeStateCase.Memory => GameConstants.CHALLENGE_ENTRANCE,
            ChallengeStateCase.Peak => GameConstants.CHALLENGE_PEAK_ENTRANCE,
            ChallengeStateCase.Story => GameConstants.CHALLENGE_STORY_ENTRANCE,
            _ => Scene.LeaveEntryId
        };

        foreach (var group in Scene.FloorInfo.Groups.Values)
        {
            // Skip non-server groups
            if (group.LoadSide != GroupLoadSideEnum.Server) continue;

            // Dont load the groups that have monsters in them
            if (group.PropList.Count > 0 && group.MonsterList.Count == 0) await LoadGroup(group);
        }

        Scene.IsLoaded = true;
    }

    public override async ValueTask<EntityMonster?> LoadMonster(MonsterInfo info, GroupInfo group,
        bool sendPacket = false)
    {
        if (info.IsClientOnly || info.IsDelete) return null;

        // Get challenge instance
        if (Player.ChallengeManager!.ChallengeInstance == null) return null;
        var instance = Player.ChallengeManager.ChallengeInstance;

        // Get current stage monster infos
        var stages = instance.GetStageMonsters();

        if (!stages.TryGetValue(group.Id, out var challengeMonsters)) return null;

        // Get challenge monster info
        if (challengeMonsters.All(x => x.ConfigId != info.ID)) return null;
        var challengeMonsterInfo = challengeMonsters.First(x => x.ConfigId == info.ID);

        // Get excels from game data
        if (!GameData.NpcMonsterDataData.TryGetValue(challengeMonsterInfo.NpcMonsterId, out var npcMonsterExcel))
            return null;

        // Create monster from group monster info
        var entity = new EntityMonster(Scene, info.ToPositionProto(), info.ToRotationProto(), group.Id, info.ID,
            npcMonsterExcel, info)
        {
            EventId = challengeMonsterInfo.EventId,
            CustomStageId = challengeMonsterInfo.EventId
        };

        await Scene.AddEntity(entity, sendPacket);

        return entity;
    }

    public override async ValueTask<EntityNpc?> LoadNpc(NpcInfo info, GroupInfo group, bool sendPacket = false)
    {
        await System.Threading.Tasks.Task.CompletedTask;
        return null;
    }
}
