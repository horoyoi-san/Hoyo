using MemoryPack;
using March7thHoney.Data.Excel;
using March7thHoney.Enums.Mission;
using Newtonsoft.Json;
using March7thHoney.Util;

namespace March7thHoney.Data.Config;

[MemoryPackable]
public partial class MissionInfo
{
    public int MainMissionID { get; set; }
    public List<int> StartSubMissionList { get; set; } = [];
    public List<int> FinishSubMissionList { get; set; } = [];
    public List<SubMissionInfo> SubMissionList { get; set; } = [];
    public List<CustomValueInfo> MissionCustomValueList { get; set; } = [];
}

[MemoryPackable]
public partial class SubMissionInfo
{
    public int ID { get; set; }
    public int LevelPlaneID { get; set; }
    public int LevelFloorID { get; set; }
    public int MainMissionID { get; set; }
    public string MissionJsonPath { get; set; } = "";

    [JsonConverter(typeof(SafeStringEnumConverter<SubMissionTakeTypeEnum>))]
    public SubMissionTakeTypeEnum TakeType { get; set; }

    public List<int>? TakeParamIntList { get; set; } = []; // the mission's prerequisites

    [JsonConverter(typeof(SafeStringEnumConverter<MissionFinishTypeEnum>))]
    public MissionFinishTypeEnum FinishType { get; set; }

    public int ParamInt1 { get; set; }
    public int ParamInt2 { get; set; }
    public int ParamInt3 { get; set; }
    public string ParamStr1 { get; set; } = "";
    public List<int>? ParamIntList { get; set; } = [];
    public List<MaterialItem>? ParamItemList { get; set; } = [];
    public List<FinishActionInfo>? FinishActionList { get; set; } = [];
    public int Progress { get; set; }
    public List<int>? GroupIDList { get; set; } = [];
    public int SubRewardID { get; set; }
}

[MemoryPackable]
public partial class CustomValueInfo
{
    public int Index { get; set; }
    public List<int> ValidValueParamList { get; set; } = [];
}

[MemoryPackable]
public partial class FinishActionInfo
{
    [JsonConverter(typeof(SafeStringEnumConverter<FinishActionTypeEnum>))]
    public FinishActionTypeEnum FinishActionType { get; set; }

    public List<int> FinishActionPara { get; set; } = [];
    public List<string> FinishActionParaString { get; set; } = [];
}
