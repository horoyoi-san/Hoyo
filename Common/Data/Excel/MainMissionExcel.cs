using MemoryPack;
using March7thHoney.Database.Player;
using March7thHoney.Database.Quests;
using March7thHoney.Enums;
using March7thHoney.Enums.Mission;
using March7thHoney.Util;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using MissionInfo = March7thHoney.Data.Config.MissionInfo;

namespace March7thHoney.Data.Excel;

[ResourceEntity("MainMission.json")]
[MemoryPackable]
public partial class MainMissionExcel : ExcelResource
{
    public int MainMissionID { get; set; }
    public HashName Name { get; set; } = new();

    [JsonConverter(typeof(StringEnumConverter))]
    public OperationEnum TakeOperation { get; set; }

    [JsonConverter(typeof(StringEnumConverter))]
    public OperationEnum BeginOperation { get; set; }

    public List<MissionParam> TakeParam { get; set; } = [];
    public List<MissionParam> BeginParam { get; set; } = [];
    public int RewardID { get; set; }
    public List<int> SubRewardList { get; set; } = [];

    [JsonIgnore] public MissionInfo MissionInfo { get; protected set; } = new();
    [JsonIgnore] public List<int> SubMissionIds { get; set; } = [];

    // Appended after every pre-existing member on purpose: MemoryPack object payloads are
    // forward-tolerant only for members added at the END, so a Resource.bin generated before these
    // columns existed still deserializes (the new members simply restore as Unknown/0).
    [JsonConverter(typeof(SafeStringEnumConverter<MainMissionTypeEnum>))]
    public MainMissionTypeEnum Type { get; set; }

    /// <summary>Main mission the official client auto-tracks once this one finishes (0 = none).</summary>
    public int NextTrackMainMission { get; set; }

    /// <summary>
    ///     A "Gap" row with no MissionInfo_&lt;id&gt;.json is a display-only transition entry: it ships no
    ///     start sub-missions and no finish gate, so gameplay can never close it and every successor
    ///     gated on its completion stalls forever.
    /// </summary>
    [JsonIgnore]
    public bool IsDisplayOnlyGap => Type == MainMissionTypeEnum.Gap && MissionInfo.SubMissionList.Count == 0;

    public override int GetId()
    {
        return MainMissionID;
    }

    public override void Loaded()
    {
        GameData.MainMissionData[GetId()] = this;
    }

    public void SetMissionInfo(MissionInfo missionInfo)
    {
        MissionInfo = missionInfo;
        if (missionInfo != null)
            foreach (var sub in missionInfo.SubMissionList)
            {
                SubMissionIds.Add(sub.ID);
                GameData.SubMissionInfoData[sub.ID] = new SubMissionData(sub.ID)
                {
                    MainMissionId = MainMissionID,
                    MainMissionInfo = MissionInfo,
                    SubMissionInfo = sub
                };
            }
    }

    public bool IsEqual(MissionData data)
    {
        var result = TakeOperation == OperationEnum.And;
        foreach (var param in TakeParam)
            if (param.IsEqual(data))
            {
                if (TakeOperation != OperationEnum.And) return true;
            }
            else
            {
                if (TakeOperation == OperationEnum.And) return false;
            }

        return result;
    }
}

[MemoryPackable]
public partial class MissionParam
{
    [JsonConverter(typeof(StringEnumConverter))]
    public MissionTakeTypeEnum Type { get; set; }

    public int Value { get; set; }

    public bool IsEqual(MissionData data)
    {
        switch (Type)
        {
            case MissionTakeTypeEnum.Auto:
                return true;
            case MissionTakeTypeEnum.PlayerLevel:
                return PlayerData.GetPlayerByUid(data.Uid)!.Level >= Value;
            case MissionTakeTypeEnum.WorldLevel:
                return PlayerData.GetPlayerByUid(data.Uid)!.WorldLevel >= Value;
            case MissionTakeTypeEnum.MultiSequence:
                var value = data.GetMainMissionStatus(Value);
                return value == MissionPhaseEnum.Finish;
            default:
                return false;
        }
    }
}
