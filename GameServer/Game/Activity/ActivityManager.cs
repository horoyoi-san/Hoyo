using March7thHoney.Data;
using March7thHoney.Database;
using March7thHoney.Database.Activity;
using March7thHoney.GameServer.Game.Activity.Activities;
using March7thHoney.GameServer.Game.MultiPlayer.DiceCombat;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Activity;

public class ActivityManager : BasePlayerManager
{
    public ActivityManager(PlayerInstance player) : base(player)
    {
        Data = DatabaseHelper.Instance!.GetInstanceOrCreateNew<ActivityData>(player.Uid);

        if (Data.TrialActivityData.CurTrialStageId != 0) TrialActivityInstance = new TrialActivityInstance(this);

        DiceCombat = new DiceCombatActivityInstance(this);
    }

    #region Data

    public ActivityData Data { get; set; }

    #endregion

    #region Instance

    public TrialActivityInstance? TrialActivityInstance { get; set; }
    public DiceCombatActivityInstance DiceCombat { get; set; }
    #endregion

    public List<ActivityScheduleData> ToProto()
    {
        var proto = new List<ActivityScheduleData>();

        foreach (var activity in GameData.ActivityConfig.ScheduleData)
            proto.Add(new ActivityScheduleData
            {
                ActivityId = (uint)activity.ActivityId,
                BeginTime = activity.BeginTime,
                EndTime = activity.EndTime,
                PanelId = (uint)activity.PanelId
            });

        return proto;
    }
}
