using MemoryPack;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.Database.Activity;

[DbTable("Activity")]
public class ActivityData : BaseDatabaseDataHelper
{
    public TrialActivityData TrialActivityData { get; set; } = new();
}

[MemoryPackable]
public partial class TrialActivityData
{
    public List<TrialActivityResultData> Activities { get; set; } = new();
    public int CurTrialStageId { get; set; } = 0;

    // Scene to return to when the trial ends (captured on trial start)
    public int ReturnEntryId { get; set; } = 0;
    public Position ReturnPos { get; set; } = new();
    public Position ReturnRot { get; set; } = new();

    public List<TrialActivityInfo> ToProto()
    {
        var proto = new List<TrialActivityInfo>();

        foreach (var activity in Activities)
            proto.Add(new TrialActivityInfo
            {
                StageId = (uint)activity.StageId,
                TakenReward = activity.TakenReward
            });

        return proto;
    }
}

[MemoryPackable]
public partial class TrialActivityResultData
{
    public int StageId { get; set; } = 0;
    public bool TakenReward { get; set; } = false;
}
