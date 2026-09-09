using MemoryPack;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Quest;
using March7thHoney.Util;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("FinishWay.json,FinishWayRogue.json,RogueDLCFinishWay.json", true)]
[MemoryPackable]
public partial class FinishWayExcel : ExcelResource
{
    public List<int> ParamIntList { get; set; } = [];
    public string ParamStr1 { get; set; } = "";
    public List<MappingInfoItem> ParamItemList { get; set; } = [];
    public int MazeFloorID { get; set; }
    public int Progress { get; set; }
    public int ID { get; set; }

    [JsonConverter(typeof(SafeStringEnumConverter<QuestParaTypeEnum>))]
    public QuestParaTypeEnum ParamType { get; set; }

    public int ParamInt1 { get; set; }
    public int ParamInt2 { get; set; }
    public int MazeDimensionID { get; set; }
    public int MazePlaneID { get; set; }

    [JsonConverter(typeof(SafeStringEnumConverter<MissionFinishTypeEnum>))]
    public MissionFinishTypeEnum FinishType { get; set; }

    public int ParamInt3 { get; set; }
    public bool IsBackTrack { get; set; }

    public override int GetId()
    {
        return ID;
    }

    public override void Loaded()
    {
        GameData.FinishWayData.TryAdd(ID, this);
    }
}
