using March7thHoney.Data;
using March7thHoney.Database.Activity;
using March7thHoney.GameServer.Server.Packet.Send.Activity;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Activity.Activities;

public class TrialActivityInstance : BaseActivityInstance
{
    public TrialActivityInstance(ActivityManager manager) : base(manager)
    {
        Data = ActivityManager.Data.TrialActivityData;
    }

    public TrialActivityData Data { get; set; }

    public async ValueTask StartActivity(int stageId)
    {
        var player = ActivityManager.Player;

        GameData.AvatarDemoConfigData.TryGetValue(stageId, out var excel);
        if (excel == null)
        {
            ActivityManager.TrialActivityInstance = null;
            await player.SendPacket(new PacketStartTrialActivityScRsp((uint)stageId, Retcode.RetReqParaInvalid));
            return;
        }

        await player.LineupManager!.DestroyExtraLineup(ExtraLineupType.LineupStageTrial);

        // Capture the current scene so EndActivity can return the player to it
        Data.ReturnEntryId = player.Data.EntryId;
        Data.ReturnPos = player.Data.Pos!;
        Data.ReturnRot = player.Data.Rot!;

        Data.CurTrialStageId = stageId;
        player.LineupManager.SetExtraLineup(ExtraLineupType.LineupStageTrial, excel.TrialAvatarList.ToList(), true);
        await player.EnterScene(excel.MapEntranceID, 0, true);

        await player.SendPacket(new PacketStartTrialActivityScRsp((uint)stageId));
    }

    public async ValueTask EndActivity(TrialActivityStatus status = TrialActivityStatus.None)
    {
        var player = ActivityManager.Player!;
        var stageId = Data.CurTrialStageId;
        Data.CurTrialStageId = 0;
        ActivityManager.TrialActivityInstance = null;

        // Remove trial lineup
        await player.LineupManager!.DestroyExtraLineup(ExtraLineupType.LineupStageTrial);
        player.LineupManager!.SetExtraLineup(ExtraLineupType.LineupNone, []);

        // Return to the scene the trial was started from
        if (Data.ReturnEntryId != 0)
        {
            await player.EnterScene(Data.ReturnEntryId, 0, true);
            await player.MoveTo(Data.ReturnPos, Data.ReturnRot);
        }
        else
        {
            await player.EnterScene(2000101, 0, true);
        }

        Data.ReturnEntryId = 0;
        if (status == TrialActivityStatus.Finish)
        {
            Data.Activities.Add(new TrialActivityResultData
            {
                StageId = stageId
            });
            await player.SendPacket(new PacketCurTrialActivityScNotify((uint)stageId, status));
        }
    }
}
