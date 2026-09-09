using MemoryPack;
using March7thHoney.Enums.Mission;
using March7thHoney.Util;

namespace March7thHoney.Database.Quests;

[DbTable("Mission")]
public class MissionData : BaseDatabaseDataHelper
{
    public Dictionary<int, Dictionary<int, MissionInfo>> MissionInfo { get; set; } =
        []; // Dictionary<MissionId, Dictionary<SubMissionId, MissionInfo>> // seems like main missionId is not used

    public Dictionary<int, MissionPhaseEnum> MainMissionInfo { get; set; } =
        []; // Dictionary<MissionId, MissionPhaseEnum>

    public List<int> FinishedSubMissionIds { get; set; } = [];

    public List<int> RunningSubMissionIds { get; set; } = [];

    public List<int> FinishedMainMissionIds { get; set; } = [];

    public List<int> RunningMainMissionIds { get; set; } = [];

    public Dictionary<int, int> SubMissionProgressDict { get; set; } = [];

    public Dictionary<int, List<MissionCustomValueRecord>> MainMissionCustomValues { get; set; } = [];

    public int TrackingMainMissionId { get; set; }

    /// <summary>
    ///     Per-player override of ServerOption.EnableMission; null means "follow the server config".
    ///     /mission start sets it so a single player can play the story on a server that otherwise runs
    ///     with the mission system off.
    /// </summary>
    public bool? EnableMissionOverride { get; set; }

    /// <summary>Whether the mission system is live for this player. Get-only, so it is not a DB column.</summary>
    public bool MissionEnabled => EnableMissionOverride ?? ConfigManager.Config.ServerOption.EnableMission;

    public MissionPhaseEnum GetMainMissionStatus(int missionId)
    {
        if (FinishedMainMissionIds.Contains(missionId)) return MissionPhaseEnum.Finish;
        if (RunningMainMissionIds.Contains(missionId)) return MissionPhaseEnum.Accept;
        return MissionPhaseEnum.None;
    }

    public MissionPhaseEnum GetSubMissionStatus(int missionId)
    {
        if (FinishedSubMissionIds.Contains(missionId)) return MissionPhaseEnum.Finish;
        if (RunningSubMissionIds.Contains(missionId)) return MissionPhaseEnum.Accept;
        return MissionPhaseEnum.None;
    }

    public void SetMainMissionStatus(int missionId, MissionPhaseEnum phase)
    {
        if (phase == MissionPhaseEnum.Finish)
        {
            FinishedMainMissionIds.SafeAdd(missionId);
            RunningMainMissionIds.Remove(missionId);
        }
        else if (phase == MissionPhaseEnum.Accept)
        {
            FinishedMainMissionIds.Remove(missionId);
            RunningMainMissionIds.SafeAdd(missionId);
        }
        else
        {
            FinishedMainMissionIds.Remove(missionId);
            RunningMainMissionIds.Remove(missionId);
        }
    }

    public void SetSubMissionStatus(int missionId, MissionPhaseEnum phase)
    {
        if (phase == MissionPhaseEnum.Finish)
        {
            FinishedSubMissionIds.SafeAdd(missionId);
            RunningSubMissionIds.Remove(missionId);
        }
        else if (phase == MissionPhaseEnum.Accept)
        {
            FinishedSubMissionIds.Remove(missionId);
            RunningSubMissionIds.SafeAdd(missionId);
        }
        else
        {
            FinishedSubMissionIds.Remove(missionId);
            RunningSubMissionIds.Remove(missionId);
        }
    }

    public void MoveFromOld()
    {
        foreach (var main in MissionInfo)
        foreach (var sub in main.Value)
            if (sub.Value.Status == MissionPhaseEnum.Finish)
                FinishedSubMissionIds.SafeAdd(sub.Key);
            else if (sub.Value.Status == MissionPhaseEnum.Accept) RunningSubMissionIds.SafeAdd(sub.Key);

        MissionInfo.Clear();

        foreach (var main in MainMissionInfo)
            if (main.Value == MissionPhaseEnum.Finish)
                FinishedMainMissionIds.SafeAdd(main.Key);
            else if (main.Value == MissionPhaseEnum.Accept) RunningMainMissionIds.SafeAdd(main.Key);

        MainMissionInfo.Clear();
    }
}

[MemoryPackable]
public partial class MissionInfo
{
    public int MissionId { get; set; }
    public MissionPhaseEnum Status { get; set; }
}

[MemoryPackable]
public partial class MissionCustomValueRecord
{
    public uint Index { get; set; }
    public uint CustomValue { get; set; }
    public string Key { get; set; } = "";
}
