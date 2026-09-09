using MemoryPack;
using March7thHoney.Data;
using March7thHoney.Proto;

namespace March7thHoney.Database.TrainParty;

[DbTable("TrainParty")]
public class TrainData : BaseDatabaseDataHelper
{
    public int Fund { get; set; }
    public int RecordId { get; set; }
    public uint WorldId { get; set; }
    public long RefreshTime { get; set; }
    public bool BadgeAutoFill { get; set; }
    public List<uint> UnlockedPassengerIds { get; set; } = [];
    public List<uint> PassengerRecordMarks { get; set; } = [];
    public List<TrainCardInfo> Cards { get; set; } = [];
    public List<TrainPendingPassengerInfo> GameplayPassengers { get; set; } = [];
    public List<TrainSkillInfo> GameplaySkills { get; set; } = [];
    public List<TrainMoveInfo> MoveHistory { get; set; } = [];
    public int GameplayRound { get; set; }
    public int GameplayType { get; set; }
    public int GameplayQueuePosition { get; set; }
    public int LastUsedCardId { get; set; }
    public Dictionary<int, TrainAreaInfo> Areas { get; set; } = [];
    public List<TrainSelfDisplayEntry> SelfDisplay { get; set; } = [];
    public Dictionary<int, long> PropTimes { get; set; } = [];
    public Dictionary<int, long> TimedDynamicPropTimes { get; set; } = [];
}

[MemoryPackable]
public partial class TrainAreaInfo
{
    public int AreaId { get; set; }
    public List<int> StepList { get; set; } = [];
    public Dictionary<int, int> DynamicInfo { get; set; } = [];

    public TrainPartyArea ToProto()
    {
        var info = new TrainPartyArea
        {
            AreaId = (uint)AreaId,
            AreaStepInfo = new AreaStepInfo(),
            StepIdList = { StepList.Select(x => (uint)x) },
            VerifyStepIdList = { StepList.Select(x => (uint)x) },
            Progress = 100,
            DynamicInfo =
            {
                DynamicInfo.Select(x => new AreaDynamicInfo
                {
                    DiceSlotId = (uint)x.Key,
                    DiyDynamicId = (uint)x.Value
                })
            }
        };

        foreach (var step in StepList)
        {
            GameData.TrainPartyStepConfigData.TryGetValue(step, out var stepExcel);
            if (stepExcel == null) continue;

            info.StaticPropIdList.AddRange(stepExcel.StaticPropIDList.Select(x => (uint)x));
        }

        return info;
    }
}

[MemoryPackable]
public partial class TrainSelfDisplayEntry
{
    public uint Slot { get; set; }
    public uint Id { get; set; }
    public uint Type { get; set; }
}

[MemoryPackable]
public partial class TrainCardInfo
{
    public uint CardId { get; set; }
    public uint UniqueId { get; set; }
    public uint CurIndex { get; set; }
}

[MemoryPackable]
public partial class TrainPendingPassengerInfo
{
    public uint PassengerId { get; set; }
    public uint Hp { get; set; }
    public uint Atk { get; set; }
}

[MemoryPackable]
public partial class TrainSkillInfo
{
    public uint SkillId { get; set; }
    public uint SkillLevel { get; set; }
    public uint Count { get; set; }
}

[MemoryPackable]
public partial class TrainMoveInfo
{
    public uint CardId { get; set; }
    public uint UniqueId { get; set; }
    public uint DisplayValue { get; set; }
    public uint BoardIndex { get; set; }
}
