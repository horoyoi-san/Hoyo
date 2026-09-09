using March7thHoney.GameServer.Game.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Scene;

public class PacketSceneGroupRefreshScNotify : BasePacket
{
    public PacketSceneGroupRefreshScNotify(PlayerInstance player, List<BaseGameEntity>? addEntity = null,
        List<BaseGameEntity>? removeEntity = null,
        SceneGroupRefreshType refreshType = SceneGroupRefreshType.Loaded)
        : base(CmdIds.SceneGroupRefreshScNotify)
    {
        // Live traces use AFIBFMAFNCC for packets that include entity deletion.
        if (refreshType == SceneGroupRefreshType.Loaded && removeEntity is { Count: > 0 })
            refreshType = SceneGroupRefreshType.Afibfmafncc;

        var proto = new SceneGroupRefreshScNotify
        {
            FloorId = (uint)player.Data.FloorId,
            DimensionId = (uint)player.SceneInstance!.ResolveDimensionId()
        };
        Dictionary<int, GroupRefreshInfo> refreshInfo = [];

        foreach (var e in removeEntity ?? [])
        {
            var group = new GroupRefreshInfo
            {
                GroupId = (uint)e.GroupId,
                RefreshType = refreshType
            };
            group.RefreshEntity.Add(new SceneEntityRefreshInfo
            {
                DeleteEntity = (uint)e.EntityId
            });

            if (refreshInfo.TryGetValue(e.GroupId, out var value))
                value.RefreshEntity.AddRange(group.RefreshEntity);
            else
                refreshInfo[e.GroupId] = group;
        }

        foreach (var e in addEntity ?? [])
        {
            var group = new GroupRefreshInfo
            {
                GroupId = (uint)e.GroupId,
                RefreshType = refreshType
            };
            group.RefreshEntity.Add(new SceneEntityRefreshInfo
            {
                AddEntity = e.ToProto()
            });

            if (refreshInfo.TryGetValue(e.GroupId, out var value))
                value.RefreshEntity.AddRange(group.RefreshEntity);
            else
                refreshInfo[e.GroupId] = group;
        }

        proto.GroupRefreshList.AddRange(refreshInfo.Values);

        SetData(proto);
    }

    public PacketSceneGroupRefreshScNotify(PlayerInstance player, BaseGameEntity? addEntity = null,
        BaseGameEntity? removeEntity = null,
        SceneGroupRefreshType refreshType = SceneGroupRefreshType.Loaded) :
        this(player, addEntity == null ? [] : [addEntity], removeEntity == null ? [] : [removeEntity], refreshType)
    {
    }

    public PacketSceneGroupRefreshScNotify(SceneInstance scene, List<GroupPropertyRefreshData> refreshDataList) : base(
        CmdIds.SceneGroupRefreshScNotify)
    {
        var proto = new SceneGroupRefreshScNotify
        {
            FloorId = (uint)scene.FloorId,
            DimensionId = (uint)scene.ResolveDimensionId()
        };

        Dictionary<int, List<GroupPropertyRefreshData>> refreshDataDict = [];
        foreach (var data in refreshDataList)
        {
            if (!refreshDataDict.TryGetValue(data.GroupId, out var list))
            {
                list = [];
                refreshDataDict[data.GroupId] = list;
            }

            list.Add(data);
        }

        foreach (var (groupId, dataList) in refreshDataDict)
        {
            var group = new GroupRefreshInfo
            {
                GroupId = (uint)groupId,
                RefreshType = SceneGroupRefreshType.Loaded
            };

            foreach (var data in dataList)
                group.CDMKBCHLPAB.Add(new AKEKCKDIHLA
                {
                    NewValue = data.NewValue,
                    OldValue = data.OldValue,
                    PropertyName = data.PropertyName
                });

            proto.GroupRefreshList.Add(group);
        }

        SetData(proto);
    }
}

public record GroupPropertyRefreshData(int GroupId, string PropertyName, int OldValue, int NewValue);

