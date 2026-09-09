using MemoryPack;
using March7thHoney.Data.Config;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("SubMission.json")]
[MemoryPackable]
public partial class SubMissionExcel : ExcelResource
{
    public int SubMissionID { get; set; }

    public HashName TargetText { get; set; } = new();

    [JsonIgnore] public int MainMissionID { get; set; }

    [JsonIgnore] public MissionInfo? MainMissionInfo { get; set; }

    [JsonIgnore] public SubMissionInfo? SubMissionInfo { get; set; }

    [JsonIgnore] public LevelGraphConfigInfo? SubMissionTaskInfo { get; set; }

    public override int GetId()
    {
        return SubMissionID;
    }

    public override void Loaded()
    {
        GameData.SubMissionData[GetId()] = this;
    }
}

[MemoryPackable]
public partial class SubMissionData(int missionId)
{
    public int MissionId { get; set; } = missionId;
    public int MainMissionId { get; set; }

    public MissionInfo? MainMissionInfo { get; set; }

    public SubMissionInfo? SubMissionInfo { get; set; }

    public LevelGraphConfigInfo? SubMissionTaskInfo { get; set; }
}
