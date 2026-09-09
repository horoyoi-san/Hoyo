using March7thHoney.Data;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketGetSceneMapInfoScRsp : BasePacket
{
    public PacketGetSceneMapInfoScRsp(GetSceneMapInfoCsReq req, PlayerInstance player) : base(
        CmdIds.GetSceneMapInfoScRsp)
    {
        var rsp = new GetSceneMapInfoScRsp();

        foreach (var sceneIdentifier in req.SceneIdentifiers)
        {
            var floorId = sceneIdentifier.FloorId;
            var mazeMap = new SceneMapInfo
            {
                FloorId = floorId,
                DimensionId = player.SceneInstance?.FloorId == floorId
                    ? (uint)player.SceneInstance.ResolveDimensionId()
                    : 0,
                // Keep SceneIdentifier in sync with floor to satisfy newer client map-info parsing.
                SceneIdentifier = new SceneIdentifier
                {
                    FloorId = floorId
                }
            };
            var roomOwnerUid = player.TrainCakeCatchManager?.GetSceneTeleportRoomOwnerUid();
            if (sceneIdentifier.TeleportInfo != null || roomOwnerUid != null)
            {
                mazeMap.SceneIdentifier.TeleportInfo = new TeleportInfo
                {
                    TeleportId = roomOwnerUid ?? sceneIdentifier.TeleportInfo?.TeleportId ?? 0
                };
            }
            var mapDatas = GameData.MapEntranceData.Values.Where(x => x.FloorID == floorId).ToList();

            if (mapDatas.Count == 0)
            {
                rsp.SceneMapInfo.Add(mazeMap);
                continue;
            }

            var mapData = mapDatas.FirstOrDefault(x => x.ID == player.Data.EntryId)
                          ?? mapDatas.MinBy(x => x.ID)!;
            mazeMap.EntryId = (uint)mapData.ID;
            GameData.GetFloorInfo(mapData.PlaneID, mapData.FloorID, out var floorInfo);
            if (floorInfo == null)
            {
                rsp.SceneMapInfo.Add(mazeMap);
                continue;
            }

            if (mazeMap.DimensionId == 0)
                mazeMap.DimensionId = (uint)SceneInstance.ResolveDimensionId(floorInfo, mapData.ID);

            mazeMap.ChestList.Add(new ChestInfo
            {
                ExistNum = 1,
                ChestType = ChestType.MapInfoChestTypeNormal
            });

            mazeMap.ChestList.Add(new ChestInfo
            {
                ExistNum = 1,
                ChestType = ChestType.MapInfoChestTypePuzzle
            });

            mazeMap.ChestList.Add(new ChestInfo
            {
                ExistNum = 1,
                ChestType = ChestType.MapInfoChestTypeChallenge
            });

            // Prefer runtime loaded groups for current scene to match official behavior.
            if (player.SceneInstance?.FloorId == floorId)
            {
                foreach (var groupId in player.SceneInstance.Groups.Distinct())
                {
                    mazeMap.MazeGroupList.Add(new MazeGroup
                    {
                        GroupId = (uint)groupId
                    });
                }
            }
            else
            {
                foreach (var groupInfo in floorInfo.Groups.Values)
                    mazeMap.MazeGroupList.Add(new MazeGroup
                    {
                        GroupId = (uint)groupInfo.Id
                    });
            }

            foreach (var teleport in floorInfo.CachedTeleports.Values)
                mazeMap.UnlockTeleportList.Add((uint)teleport.MappingInfoID);

            foreach (var prop in floorInfo.UnlockedCheckpoints)
            {
                var mazeProp = new MazePropState
                {
                    GroupId = (uint)prop.AnchorGroupID,
                    ConfigId = (uint)prop.ID,
                    State = (uint)PropStateEnum.CheckPointEnable
                };
                mazeMap.MazePropList.Add(mazeProp);
            }

            // Include persisted prop states so client-side scene map/prop status stays in sync after re-enter.
            if (player.SceneData!.ScenePropData.TryGetValue((int)floorId, out var floorPropData))
            {
                foreach (var (groupId, propDataList) in floorPropData)
                {
                    foreach (var propData in propDataList)
                    {
                        if (mazeMap.MazePropList.Any(x => x.GroupId == (uint)groupId && x.ConfigId == (uint)propData.PropId))
                            continue;

                        mazeMap.MazePropList.Add(new MazePropState
                        {
                            GroupId = (uint)groupId,
                            ConfigId = (uint)propData.PropId,
                            State = (uint)propData.State
                        });
                    }
                }
            }

            // Include currently loaded scene props for active scene floor (fallback when DB has no row yet).
            if (player.SceneInstance?.FloorId == floorId)
            {
                foreach (var prop in player.SceneInstance.Entities.Values.OfType<EntityProp>())
                {
                    if (mazeMap.MazePropList.Any(x => x.GroupId == (uint)prop.GroupId && x.ConfigId == (uint)prop.InstId))
                        continue;

                    mazeMap.MazePropList.Add(new MazePropState
                    {
                        GroupId = (uint)prop.GroupId,
                        ConfigId = (uint)prop.InstId,
                        State = (uint)prop.State
                    });
                }
            }

            var floorSavedData = player.SceneInstance?.FloorId == floorId
                ? player.SceneInstance.BuildClientFloorSavedData()
                : player.SceneData!.FloorSavedData.GetValueOrDefault((int)floorId, []);
            foreach (var (key, value) in floorSavedData)
                mazeMap.FloorSavedValueMap[key] = value;

            if (!ConfigManager.Config.ServerOption.AutoLightSection)
            {
                player.SceneData!.UnlockSectionIdList.TryGetValue(mapData.FloorID, out var sections);
                foreach (var section in sections ?? []) mazeMap.LightenSectionList.Add((uint)section);
            }
            else
            {
                mazeMap.LightenSectionList.AddRange(floorInfo.MapSections.Select(x => (uint)x));
            }

            rsp.SceneMapInfo.Add(mazeMap);
        }

        SetData(rsp);
    }
}
