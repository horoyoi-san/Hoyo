using March7thHoney.Data;
using March7thHoney.Data.Config.Scene;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Avatar;
using March7thHoney.Enums.Avatar;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Activity.Loaders;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene.Component;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Scene;

public partial class SceneInstance
{
    #region Scene Actions

    public async ValueTask<GroupPropertyRefreshData> UpdateGroupProperty(int groupId, string name, int value,
        bool callEvent = true)
    {
        // save
        if (!Player.SceneData!.GroupPropertyData.TryGetValue(FloorId, out var groupData))
        {
            groupData = [];
            Player.SceneData.GroupPropertyData[FloorId] = groupData;
        }

        var group = FloorInfo?.Groups.GetValueOrDefault(groupId);
        if (group == null) return new GroupPropertyRefreshData(groupId, name, 0, value);
        var property = group.GroupPropertyMap.Values
            .FirstOrDefault(x => x.Name == name);
        if (property == null) return new GroupPropertyRefreshData(groupId, name, 0, value);

        if (!groupData.TryGetValue(groupId, out var propertyData))
        {
            propertyData = [];
            groupData[groupId] = propertyData;
        }

        var oldValue = propertyData.GetValueOrDefault(name, property.DefaultValue);
        propertyData[name] = value;
        // notify
        var res = new GroupPropertyRefreshData(groupId, name, oldValue, value);
        await Player.SendPacket(
            new PacketSceneGroupRefreshScNotify(this, [res]));

        if (callEvent && GroupPropertyUpdated != null) await GroupPropertyUpdated(res);

        if (name == "SGP_PuzzleState" && group.ControlFloorSavedValue.Count > 0)
            // set fsv
            foreach (var key in group.ControlFloorSavedValue)
                await UpdateFloorSavedValue(key, value);

        return res;
    }

    public async ValueTask UpdateFloorSavedValue(string name, int value)
    {
        if (!Player.SceneData!.FloorSavedData.TryGetValue(FloorId, out var floorSavedData))
        {
            floorSavedData = [];
            Player.SceneData.FloorSavedData[FloorId] = floorSavedData;
        }

        if (FloorInfo?.FloorSavedValue.All(x => x.Name != name) == true) return; // not exist

        floorSavedData[name] = value;

        await Player.SendPacket(new PacketUpdateFloorSavedValueNotify(name, value, Player));
        await Player.MissionManager!.HandleFinishType(MissionFinishTypeEnum.FloorSavedValue);
    }

    public int GetFloorSavedValue(string name)
    {
        return Player.SceneData!.GetFloorSavedValue(FloorId, name);
    }

    public int GetGroupProperty(int groupId, string name)
    {
        if (!Player.SceneData!.GroupPropertyData.TryGetValue(FloorId, out var groupData))
        {
            groupData = [];
            Player.SceneData.GroupPropertyData[FloorId] = groupData;
        }

        if (!groupData.TryGetValue(groupId, out var propertyData))
        {
            propertyData = [];
            groupData[groupId] = propertyData;
        }

        var property = FloorInfo?.Groups.GetValueOrDefault(groupId)?.GroupPropertyMap.Values
            .FirstOrDefault(x => x.Name == name);

        if (property == null) return 0; // default value

        var oldValue = propertyData.GetValueOrDefault(name, property.DefaultValue);
        return oldValue;
    }

    public async ValueTask SyncLineup(bool notSendPacket = false)
    {
        var oldAvatarInfo = AvatarInfo.Values.ToList();
        AvatarInfo.Clear();
        var sendPacket = false;
        var addAvatar = new List<BaseGameEntity>();
        var removeAvatar = new List<BaseGameEntity>();
        var avatars = Player.LineupManager?.GetAvatarsFromCurTeam() ?? [];
        foreach (var sceneInfo in oldAvatarInfo)
            if (avatars.FindIndex(x => x.AvatarInfo.BaseAvatarId == sceneInfo.AvatarInfo.BaseAvatarId) !=
                -1) // avatar still in team
            {
                AvatarInfo.Add(sceneInfo.EntityId, sceneInfo);
            }
            else // avatar leave
            {
                removeAvatar.Add(sceneInfo);
                sendPacket = true;
            }

        foreach (var avatar in avatars) // check team avatar
        {
            if (AvatarInfo.Any(x => x.Value.AvatarInfo.BaseAvatarId == avatar.AvatarInfo.BaseAvatarId))
                continue; // avatar already in team
            var avatarInfo = new AvatarSceneInfo(avatar.AvatarInfo, avatar.AvatarType, Player)
            {
                // assign entity id
                EntityId = ++LastEntityId
            };

            AvatarInfo.Add(avatarInfo.EntityId, avatarInfo);
            addAvatar.Add(avatarInfo);
            sendPacket = true;
        }

        foreach (var avatar in removeAvatar)
        {
            Entities.Remove(avatar.EntityId);

            if (avatar is AvatarSceneInfo info) await info.OnDestroyInstance();
        }

        foreach (var avatar in addAvatar) Entities.Add(avatar.EntityId, avatar);

        if (AvatarInfo.Count == 0) return;
        var leaderAvatarId = Player.LineupManager?.GetCurLineup()?.LeaderAvatarId;
        var leaderAvatar = AvatarInfo.Values.FirstOrDefault(x => x.AvatarInfo.BaseAvatarId == leaderAvatarId);
        if (leaderAvatar == null)
        {
            leaderAvatar = AvatarInfo.Values.First();

            Player.LineupManager!.GetCurLineup()!.LeaderAvatarId = leaderAvatar.AvatarInfo.BaseAvatarId;
        }

        LeaderEntityId = leaderAvatar.EntityId;
        if (sendPacket && !notSendPacket)
            await Player.SendPacket(new PacketSceneGroupRefreshScNotify(Player, addAvatar, removeAvatar));
    }

    public async ValueTask SyncGroupInfo()
    {
        if (EntityLoader != null) await EntityLoader.SyncEntity();
    }

    public async ValueTask OnUseSkill(SceneCastSkillCsReq req)
    {
        foreach (var entity in Entities.Values.OfType<AvatarSceneInfo>())
        {
            if (!GameData.AvatarConfigData.TryGetValue(entity.AvatarInfo.AvatarId, out var excel)) continue;
            GameData.AdventureAbilityConfigListData.TryGetValue(excel.AdventurePlayerID, out var avatarAbility);
            if (avatarAbility == null) continue;
            foreach (var modifier in entity.Modifiers.ToArray())
            {
                // get modifier info
                if (!GameData.AdventureModifierData.TryGetValue(modifier, out var config)) continue;
                if (config.OnAfterLocalPlayerUseSkill.Count > 0)
                    await Player.TaskManager!.AbilityLevelTask.TriggerTasks(avatarAbility,
                        config.OnAfterLocalPlayerUseSkill, entity, [], req, modifier);
            }
        }
    }

    public async ValueTask OnChangeLeader(int curBaseAvatarId)
    {
        foreach (var entity in Entities.Values.OfType<AvatarSceneInfo>())
        {
            if (!GameData.AvatarConfigData.TryGetValue(entity.AvatarInfo.AvatarId, out var excel)) continue;
            GameData.AdventureAbilityConfigListData.TryGetValue(excel.AdventurePlayerID, out var avatarAbility);
            if (avatarAbility == null) continue;

            // change team leader
            foreach (var modifier in entity.Modifiers.ToArray())
            {
                // get modifier info
                if (!GameData.AdventureModifierData.TryGetValue(modifier, out var config)) continue;
                if (config.OnTeamLeaderChange.Count > 0)
                    await Player.TaskManager!.AbilityLevelTask.TriggerTasks(avatarAbility,
                        config.OnTeamLeaderChange, entity, [], new SceneCastSkillCsReq
                        {
                            CastEntityId = (uint)entity.EntityId
                        }, modifier);
            }

            if (curBaseAvatarId == entity.AvatarInfo.BaseAvatarId) continue;

            // unstage modifier
            foreach (var modifier in entity.Modifiers.ToArray())
            {
                // get modifier info
                if (!GameData.AdventureModifierData.TryGetValue(modifier, out var config)) continue;
                if (config.OnUnstage.Count > 0)
                    await Player.TaskManager!.AbilityLevelTask.TriggerTasks(avatarAbility,
                        config.OnUnstage, entity, [], new SceneCastSkillCsReq
                        {
                            CastEntityId = (uint)entity.EntityId
                        }, modifier);
            }
        }
    }

    public async ValueTask OnDestroy()
    {
        foreach (var value in AvatarInfo.Values) await value.OnDestroyInstance();
    }

    #endregion
}
