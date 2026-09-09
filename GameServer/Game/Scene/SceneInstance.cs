using March7thHoney.Data;
using March7thHoney.Data.Config.Scene;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Avatar;
using March7thHoney.Enums.Avatar;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Activity.Loaders;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Challenge;
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
    #region Scene Details

    public bool HasClientSceneSnapshotGroup(int groupId)
    {
        return ClientSceneSnapshotGroupIds.Contains(groupId);
    }

    public void MarkClientSceneSnapshotSynced()
    {
        ClientSceneSnapshotGroupIds.Clear();
        foreach (var groupId in Groups.Where(groupId => groupId != 0))
            ClientSceneSnapshotGroupIds.Add(groupId);
        foreach (var groupId in Entities.Values.Select(entity => entity.GroupId).Where(groupId => groupId != 0))
            ClientSceneSnapshotGroupIds.Add(groupId);
    }

    public EntityProp? GetNearestSpring(long minDistSq)
    {
        EntityProp? spring = null;
        long springDist = 0;

        foreach (var prop in HealingSprings)
        {
            var dist = Player.Data?.Pos?.GetFast2dDist(prop.Position) ?? 1000000;
            if (dist > minDistSq) continue;

            if (spring == null || dist < springDist)
            {
                spring = prop;
                springDist = dist;
            }
        }

        return spring;
    }

    #endregion


    #region Data

    public PlayerInstance Player { get; set; }
    public MazePlaneExcel Excel { get; set; }
    public FloorInfo? FloorInfo { get; set; }
    public int FloorId { get; set; }
    public int PlaneId { get; set; }
    public int EntryId { get; set; }

    public int LeaveEntryId { get; set; }
    public int LastEntityId { get; set; }
    public bool IsLoaded { get; set; } = false;

    public Dictionary<int, AvatarSceneInfo> AvatarInfo { get; set; } = [];
    public int LeaderEntityId { get; set; }
    public Dictionary<int, BaseGameEntity> Entities { get; set; } = [];
    public List<int> Groups { get; set; } = [];
    public HashSet<int> ClientSceneSnapshotGroupIds { get; set; } = [];
    public List<EntityProp> HealingSprings { get; set; } = [];

    public SceneEntityLoader? EntityLoader { get; set; }

    public GameModeTypeEnum GameModeType { get; set; }
    public List<BaseSceneComponent> Components { get; set; } = [];

    public Dictionary<int, EntitySummonUnit> SummonUnit { get; set; } = [];

    public SceneInstance(PlayerInstance player, MazePlaneExcel excel, int floorId, int entryId)
    {
        Player = player;
        Excel = excel;
        PlaneId = excel.PlaneID;
        FloorId = floorId;
        EntryId = entryId;
        LeaveEntryId = 0;

        GameData.GetFloorInfo(PlaneId, FloorId, out var floor);
        FloorInfo = floor;
        if (FloorInfo == null) return;

        GameModeType = (GameModeTypeEnum)excel.PlaneType;
        switch (Excel.PlaneType)
        {
            case PlaneTypeEnum.Rogue:
                EntityLoader = new SceneEntityLoader(this);
                break;
            case PlaneTypeEnum.Challenge:
                EntityLoader = new ChallengeEntityLoader(this, Player);
                break;
            case PlaneTypeEnum.TrialActivity:
                EntityLoader = new TrialActivityEntityLoader(this, Player);
                break;
            default:
                EntityLoader = Player.StoryLineManager?.StoryLineData.CurStoryLineId != 0
                    ? new StoryLineEntityLoader(this)
                    : new SceneEntityLoader(this);
                break;
        }

        foreach (var module in floor.LevelFeatureModules.ToHashSet())
            switch (module)
            {
                case LevelFeatureTypeEnum.RotatableRegion:
                    Components.Add(new RotatableRegionSceneComponent(this));
                    break;
            }

        if (GameData.SceneRainbowGroupPropertyData.FloorProperty.ContainsKey(FloorId))
            Components.Add(new RainbowSceneComponent(this));
    }

    public async ValueTask LoadEntitiesAsync()
    {
        if (FloorInfo == null || EntityLoader == null) return;

        await EntityLoader.LoadEntity();

        Player.TaskManager?.SceneTaskTrigger.TriggerFloor(PlaneId, FloorId, this);

        _ = InitializeComponents();
    }

    #endregion

    #region Event

    public delegate ValueTask GroupPropertyUpdateArg(GroupPropertyRefreshData data);

    public event GroupPropertyUpdateArg? GroupPropertyUpdated;

    #endregion


    #region Components

    public async ValueTask InitializeComponents()
    {
        foreach (var component in Components) await component.Initialize();
    }

    public T? GetComponent<T>() where T : BaseSceneComponent
    {
        return Components.FirstOrDefault(x => x is T) as T;
    }

    #endregion


}
